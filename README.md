# dsh-workspace

DeepSeek Harness（DSH）插件仓库，用于多设备同步。目前包含一个插件：

| 插件 | 说明 |
|---|---|
| [`dsh-tavily-web-search`](dsh-tavily-web-search/README.md) | 通过 Tavily API 给 DSH 提供联网搜索。把 web 缝的 `searchProvider` 从 `deepseek-official` 换成 `tavily`，多 Key 轮询、Key 存凭据服务、可在设置页查询每个 Key 的实时积分用量。基于上游 `blooming-fang/dsh-tavily-web-search` 0.8.0，**修掉了一处会让 `web_fetch` 全盘失效的 patch 缺陷** |

## 与上游的差异（为什么不用 npm 上的版本）

npm 上最新是 `dsh-tavily-web-search@0.8.0`，它的 `cordis.patch.yml` 是这样：

```yaml
- id: web
  config:
    searchProvider: tavily      # ← 只写了这一个键
```

而 DSH 的 patch 语义（`@deepseek-ai/cordis-plugin-include` 的 `applyEntryPatches`）是
**整段替换**目标行的 `config`，不是深合并。于是基础层里原本的 `fetchProvider: http`
被这一条 patch 一起抹掉了。这时 profile 里只要还挂着 `@deepseek-ai/dsh-web-app`
（它注册了 `deepseek-fetch-api`），fetch 缝上就有两个可用 provider，任何一次
`web_fetch` 直接抛：

```
WEB_PROVIDER_AMBIGUOUS: multiple usable web providers are registered
(deepseek-fetch-api, http); configure one explicitly
```

本仓库的 0.8.1 把两个键写在**同一条** patch 里：

```yaml
- id: web
  config:
    searchProvider: tavily
    fetchProvider: http
```

> 注意不能拆成两条 `- id: web`：第二条同样是整段替换，第一条的键会被再抹一次。
> 必须一次写全。

除了这一个文件，`lib/` 下所有产物与上游 0.8.0 逐字节相同 —— 没有改任何运行逻辑，
所以上游发新版时直接覆盖 `lib/`、保留本仓库的 `cordis.patch.yml` 即可。

## 目录结构

```
dsh-tavily-web-search/
  package.json                         插件清单：dsh.bundle.patch / dsh.client / peerDependencies
  cordis.patch.yml                     bundle patch 层：改 web 缝的 provider 选择 + 插入插件行
  lib/index.js                         Tavily WebSearchProvider（host 半）
  lib/index.d.ts                       类型声明
  lib/client.js                        浏览器半 bundle：设置页「Tavily 搜索」卡片
  lib/client.js.map                    源码映射（内嵌 4 个客户端 TS 源文件）
  lib/types/client/                    客户端类型声明
  README.md                            安装、配置项、故障排查、与上游的差异
  LICENSE                              MIT，© 2026 blooming-fang（上游作者）
README.md                              本文件
LICENSE                                MIT，© 2026 yoahoug
.gitignore
```

DSH 没有「插件市场清单」这种东西（ZCode 的 `.claude-plugin/marketplace.json` 在 DSH 里
没有对应物）：一个插件就是 profile 里的**一条依赖 + 一个 bundle**。所以仓库根目录不需要
任何索引文件，安装时直接指向子目录即可。

## 安装到 DSH

装在 **profile** 里，不是装在插件目录里。以默认的 `desktop` profile 为例：

```bash
# 1) 从 GitHub 装（git 子目录，推荐：任何设备一条命令）
dsh plugin --profile desktop add "git+https://github.com/Yoahoug/dsh-workspace.git#path:/dsh-tavily-web-search"

# 2) 或者本机已经克隆了仓库（file: 会把插件拷进 profile，不走软链）
dsh plugin --profile desktop add file:$HOME/Desktop/dsh-workspace/dsh-tavily-web-search

# 3) 或者装打包好的 tgz
cd dsh-tavily-web-search && npm pack
dsh plugin --profile desktop add file:$PWD/dsh-tavily-web-search-0.8.1.tgz
```

`dsh plugin add` 会自动做三件事：把包写进 profile 的 `dependencies`、`pnpm add` 它、
把插件名追加到 `dsh.profile.bundles`（否则 `cordis.patch.yml` 不会生效）。

然后重启 DSH，打开 **设置 → Tavily 搜索**，添加至少一个 Tavily API Key。

> **别用 `pnpm link`，也别 `pnpm add /绝对目录`**。那会在 profile 里留下软链，Node 按真实
> 路径（仓库目录）去找 `@deepseek-ai/*` peer，仓库里没有这些包，启动时报
> `ERR_MODULE_NOT_FOUND: Cannot find package '@deepseek-ai/schemastery'`。
> `file:` 协议是**拷贝**（pnpm hard-link 到 store），peer 从 profile 的 `node_modules`
> 解析，本地装插件只有这一种稳的写法。

### 验证

```bash
# 两个 provider 都在？（应有 searchProvider: tavily 和 fetchProvider: http 两行）
dsh --profile desktop --dump-config | grep -A4 '^- id: web$'

# 插件行真的挂上了？（应能看到 web-search-tavily）
dsh --profile desktop --dump-config | grep -n 'web-search-tavily'
```

再让模型跑一次 `web_search`（走 Tavily）和一次 `web_fetch`（走匿名 http provider），
两个都通就说明装对了。错误信息以 `Tavily ...` 开头的是插件报的，中文，容易认。

## 本仓库的特别之处

跟 [zcode-workspace](https://github.com/Yoahoug/zcode-workspace) 的做法一致：本仓库直接放在
**桌面**（`~/Desktop/dsh-workspace`），本地改、提交、多机同步用的是同一份文件，不需要
在「开发目录」和「安装目录」之间来回拷。

两点区别要注意：

- ZCode 那边仓库根目录会被当成「市场源」读取，DSH 没有这一步，**装的是子目录**，
  所以命令里都带着 `/dsh-tavily-web-search`。
- DSH 的插件装在 `$DSH_HOME/profiles/<profile>/node_modules/` 下，而 `$DSH_HOME`
  （默认 `~/.dsh`）**不在**这个仓库里。密钥、模型网关地址、profile 的 `cordis.patch.yml`
  都属于本机状态，不同步。这个仓库只同步「插件本体」。

其他设备上同步：克隆到任意位置，然后按上面「安装到 DSH」的第 2 条装一次即可
（每次装完记得配 Key —— 密钥不随仓库走）。

## 加一个新插件

1. 在仓库根下建目录，目录名与插件名一致（小写 + 连字符）。
2. 放上插件的 `package.json`，其中必须有 `dsh.bundle.patch` 指向它自己的
   `cordis.patch.yml`；客户端插件再加 `dsh.client` 声明。
3. 在 `cordis.patch.yml` 里写它要改的缝（`- id: <行 id>` + 完整的 `config`）和
   `- insert:` 的插件行。**改已有行的 `config` 时一定要把该行原有的键全部重写一遍**，
   否则会被整段替换掉 —— 这就是本仓库 0.8.1 修的那个坑。
4. 在本文件的插件表里登记一行，并补一份 `<插件名>/README.md`。
5. 密钥一律走凭据服务（`ctx.credentials`）或环境变量，不要写进仓库。
6. 有的插件需要构建产物才能跑（DSH 只加载 `lib/`），把产物一起提交；别提交 `node_modules/`。
7. 提交；其他设备重新执行一次 `dsh plugin add` 并重启即可。

## License

MIT，见 [LICENSE](LICENSE)。`dsh-tavily-web-search/` 目录内的代码版权归上游作者
blooming-fang，同样以 MIT 授权，见该目录下的 [LICENSE](dsh-tavily-web-search/LICENSE)。
