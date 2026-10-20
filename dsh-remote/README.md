# dsh-remote

从远端浏览器操作这台机器上的 DSH：一条长令牌链接 + 一个反向代理，跑的是**原版界面**，不是另写的精简前端。

## 为什么这么做

远端拿到的就是 DSH 自己的 Web 客户端，所以：

- DSH 升级后远端界面自动跟着升级，插件不用追 `ApiProxy` / `Typert` 的版本；
- 装的所有插件（上下文洞察、侧边栏、终端……）在远端一样能用；
- 本机 DSH 监听地址**永远不动**，仍然是 `dsh web` 的 loopback 语义，插件只是在自己那个端口上多开一道门。

## 工作方式

```
远端浏览器 ──https──▶ 内网穿透 ──▶ 10.66.66.10:17800（本插件）──▶ 127.0.0.1:59712（DSH）
                    Host: 隧道域名                        Host/Origin/Cookie 改写成本机
```

代理必须同时改三样东西，少任何一样都会被 DSH 的门禁挡住：

| 请求头 | 改成 | 不改会怎样 |
|---|---|---|
| `Host` | 本机 DSH 的 `host:port` | `/api` 前缀校验直接 403 |
| `Origin` | 同上（DSH 要求与 Host 同源） | WebSocket 升级 403 |
| `Cookie` | 换成本机 DSH 自己的会话 | 拿不到数据，404/401 |

本机 DSH 的会话不是自己伪造的：插件调用 DSH 自己的 `connection.authenticatedUrl()` 拿到本进程的启动令牌，再用 `GET /?token=` 这个 DSH 自己的换发口换一个会话回来。所以**没有硬编码 DSH 的 cookie 格式或签名密钥**，DSH 换实现也不会挂。

## 鉴权

一条 32 字节随机令牌，和 ZCode 的 `hash=` 一个思路：链接就是凭据。

```
https://<你的隧道域名>/?token=<43 字符>
        │
        └─ 首次访问：换成一个签名的 HttpOnly Cookie，302 到干净的 /
           （令牌不会留在地址栏、历史和 Referer 里）
```

- Cookie 名和载荷都绑定**公网 authority**，两个隧道不会串；
- 轮换令牌会同时换掉签名密钥，**所有旧链接和已登录的远端会话立刻失效**；
- 令牌、签名密钥、访问记录都放在凭据库（`dsh-remote/access` 记录），不进设置文档、不会出现在配置里；
- 公开端口上**除了 `?token=` 换发口之外什么都不放行**：没 Cookie 一律 401，`POST` 之类连页面都不给；
- 面板自己的接口只挂在**本机 DSH** 上，不在公开端口上，所以就算令牌泄露，控制面也进不去。

## 面板

侧栏「远程操控」，和「上下文洞察」同一套面板形态：

- **远程入口** —— 运行状态、监听地址、上游地址、请求/长连接/拒绝计数、启动时间、上次错误；
- **远程链接** —— 一键复制、本机直开；还没配公网地址时给出本机地址并提示；
- **轮换令牌** —— 二次确认，轮换即吊销；
- **访问记录** —— 谁在什么时候连进来过（来源地址 + UA），最多保留 200 条。

开关会写回设置（`settings/document-updated`），所以重启后状态还在。

## 安装

```bash
dsh plugin --profile desktop add "git+https://github.com/Yoahoug/dsh-workspace.git#path:/dsh-remote"
# 或本机目录（file: 是拷贝，不是软链）
dsh plugin --profile desktop add file:D:/Users/<你>/Desktop/dsh-workspace/dsh-remote
```

装完**完全退出并重开 DSH**。

## 配置

设置 → 插件 → dsh-remote，或直接写 profile 的 `cordis.patch.yml`：

```yaml
- id: dsh-remote
  name: dsh-remote
  config:
    enabled: true
    host: 10.66.66.10      # 本机 wg 网段地址；先用 loopback 测试就用 127.0.0.1
    port: 17800
    publicUrl: ''          # 内网穿透给你的 https 根地址，例如 https://dsh.example.com
    tlsCertFile: ''        # 可选：本插件自己终结 TLS 时填
    tlsKeyFile: ''
    cookieMaxAgeDays: 14
```

补丁语义是**整段替换** `config`，改这个 row 时要把上面的键都写全。

`publicUrl` 只接受站点根地址：带路径前缀的隧道不支持，因为 DSH 客户端所有资源都按根路径解析。

## 接内网穿透

穿透那侧回源到 `http://10.66.66.10:17800`，然后把公网 https 地址填进 `publicUrl`。面板会立刻把链接换成公网地址。

只要穿透**转发 WebSocket**（DSH 的 `/api/remote.mux` 和插件自己的 `/sidebar/ws/*` 都走 WS）并**保留原始 `Host`**，其余什么都不用配——`Host`/`Origin`/`Cookie` 三件套由插件自己改写成上游可接受的样子。

> 本插件自己不做 TLS：穿透在它那侧终结 TLS 时，插件这一跳是明文 HTTP，所以 Cookie 不标 `Secure`（标了浏览器会直接丢掉）。真要本插件也上 TLS，再填 `tlsCertFile` / `tlsKeyFile`。

## 已知边界

- **`publicUrl` 没填时链接是本机地址**，只能本机用。
- **一个公开端口对应一份令牌**：同一台机器开两个 profile 时各配各的端口。
- **访问记录只是线索**，来源地址在穿透后面通常是隧道的出口 IP，不是真实客户端 IP。
- **没有"单个设备下线"**：只有整体轮换令牌。DSH 本身也没有 logout。
- 面板不跨 profile 汇总。

## 安全提醒

这条链接等于**这台机器的远程控制权**：能跑命令、读写文件。请只通过你信任的 HTTPS 隧道暴露，不要贴到任何公开地方。怀疑泄露就在面板里点一次「轮换令牌」。

## 开发笔记

```
dsh-remote/
  package.json          dsh.bundle.patch + dsh.client 双面声明
  cordis.patch.yml      插入一行 plugin row（row id 同时是设置命名空间）
  lib/index.js          host 半侧：独立监听 + token/cookie + 反向代理 + 4 条 HTTP 路由
  lib/client.js         浏览器半侧：sidebar.panellist 入口 + main 面板
```

要点：

- **host 半侧**用 `ctx.webServer.getOrigin()` 拿上游地址，不写死端口——`dsh web` 每次启动可能是新端口，这正是测试中验证过的行为；
- **handler 里不做本地放行**：公开端口进来的就是远端流量，一律先验 Cookie；
- WebSocket 是**逐字节重放握手**再双向 pipe，不依赖 `ws` 包，插件零运行时依赖；
- 响应侧丢掉上游的 `Set-Cookie`（那是上游 authority 的，浏览器拿着也没用），并把指向上游 authority 的 `Location` 改写成公网地址。

## License

MIT。
