# dsh-remote

在同一套 WireGuard 组网里，从另一台设备操作这台机器上的 DSH：一条长令牌链接 + 一个反向代理，跑的是**原版界面**，不是另写的精简前端。

## 为什么这么做

远端拿到的就是 DSH 自己的 Web 客户端，所以：

- DSH 升级后远端界面自动跟着升级，插件不用追 `ApiProxy` / `Typert` 的版本；
- 装的所有插件（上下文洞察、侧边栏、终端……）在远端一样能用；
- 本机 DSH 监听地址**永远不动**，仍然是 `dsh web` 的 loopback 语义，插件只是在自己那个端口上多开一道门。

## 只有 WireGuard，没有公网穿透

这个插件**不做** HTTPS 隧道、不给公网地址、也不自己终结 TLS。可访问性完全由 WireGuard 决定：对端连上同一个网段，就能直连本插件监听的端口。

这样做换来的是：

- 链路上的加密交给 WireGuard，插件这一跳是普通 HTTP，不维护证书、不自签、不续期；
- 端口只在组网内可达，拒绝 `?token=` 之外的一切，不存在“暴露到公网”这一步；
- 监听地址、端口、对外地址**全部来自配置**，代码里没有任何写死的 IP。`host` 留空即监听所有网卡；只给组网用就填那台机器的 WireGuard 地址。

## 工作方式

```
WireGuard 对端 ──▶ <host>:<port>（本插件）──▶ 127.0.0.1:<DSH 端口>（DSH）
                                          Host/Origin/Cookie 改写成本机
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
http://<组网内的地址>:<port>/?token=<43 字符>
        │
        └─ 首次访问：换成一个签名的 HttpOnly Cookie，303 到干净的 /
           （令牌不会留在地址栏、历史和 Referer 里）
```

- Cookie 名和载荷都绑定**访问时用的 authority**，同一台机器开两个 profile 不会串；
- 轮换令牌会同时换掉签名密钥，**所有旧链接和已登录的远端会话立刻失效**；
- 令牌、签名密钥、访问记录都放在凭据库（`dsh-remote/access` 记录），不进设置文档、不会出现在配置里；
- 监听端口上**除了 `?token=` 换发口之外什么都不放行**：没 Cookie 一律 401，`POST` 之类连页面都不给；
- 面板自己的接口只挂在**本机 DSH** 上，不在监听端口上，所以就算令牌泄露，控制面也进不去。

## 面板

侧栏「远程操控」，和「上下文洞察」同一套面板形态：

- **远程入口** —— 运行状态、监听地址、上游地址、请求/长连接/拒绝计数、启动时间、上次错误；
- **远程链接** —— 一键复制、本机直开；识别不到该用哪个地址时，列出本机网卡，点一下就换成那个地址；
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
    host: 10.66.66.10      # 监听地址，留空 '' 表示所有网卡；只给组网用就填 WG 地址
    port: 17800
    advertiseHost: ''      # 面板里链接用哪个地址；留空则用 host，host 为通配时自动挑网卡
    cookieMaxAgeDays: 14
```

补丁语义是**整段替换** `config`，改这个 row 时要把上面的键都写全。

- `host` 留空 = 监听 `0.0.0.0`，组网内任何对端都能连；想让端口只存在于 WireGuard 网卡上，就填它的地址。
- `advertiseHost` 只接受主机名或 IP，不带协议、端口和路径——端口永远由 `port` 决定。对端用别的名字访问（例如 WG 里给这台机器配的 DNS 名）时填它。

## 接 WireGuard

插件这一侧不用改任何东西，组网能通就能访问。对端只要满足：

1. 对端与这台机器在同一 WireGuard 网段（`AllowedIPs` 覆盖到这台机器的地址）；
2. 对端的防火墙/客户端允许访问 `host:port`；
3. 浏览器打开面板里那条 `http://<地址>:<port>/?token=…`。

> 插件不做 TLS，所以链接是 `http://`，Cookie 也不标 `Secure`——加了这个标记浏览器会直接丢掉它。链路加密由 WireGuard 提供，这正是去掉 HTTPS 那层的原因。

## 已知边界

- **一个端口对应一份令牌**：同一台机器开两个 profile 时各配各的端口。
- **访问记录的来源地址是组网内地址**（对端的 WireGuard 地址），不是对端公网出口 IP。
- **没有“单个设备下线”**：只有整体轮换令牌。DSH 本身也没有 logout。
- 面板不跨 profile 汇总。

## 安全提醒

这条链接等于**这台机器的远程控制权**：能跑命令、读写文件。请只在可信的 WireGuard 网内分发，不要贴到任何公开地方。怀疑泄露就在面板里点一次「轮换令牌」。

## 开发笔记

```
dsh-remote/
  package.json          dsh.bundle.patch + dsh.client 双面声明
  cordis.patch.yml      插入一行 plugin row（row id 同时是设置命名空间）
  lib/index.js          host 半侧：独立监听 + token/cookie + 反向代理 + 4 条 HTTP 路由
  lib/client.js         浏览器半侧：sidebar.panellist 入口 + main 面板
```

要点：

- **host 半侧**用 `ctx.webServer.getOrigin()` 拿上游地址，不写死端口——`dsh web` 每次启动可能是新端口；
- **handler 里不做本地放行**：监听端口进来的就是远端流量，一律先验 Cookie；
- WebSocket 是**逐字节重放握手**再双向 pipe，不依赖 `ws` 包，插件零运行时依赖；
- 响应侧丢掉上游的 `Set-Cookie`（那是上游 authority 的，浏览器拿着也没用），并把指向上游 authority 的 `Location` 改写成相对路径；
- 自动识别网卡只在面板展示和拼链接时用（`os.networkInterfaces()`，优先名字像 WireGuard 的网卡，其次 RFC 1918 私有地址），**不影响监听**；监听始终只听配置。

## License

MIT。
