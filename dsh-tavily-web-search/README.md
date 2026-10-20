# dsh-tavily-web-search

Tavily 支持的 `WebSearchProvider`，用于 DeepSeek Harness 的 web 能力缝（`ctx.web`）。

它把模型侧 `web_search` 工具的后端从 **DeepSeek 官方搜索** 换成 **Tavily** —— 每次搜索直接调用 `POST https://api.tavily.com/search`，不再走 DeepSeek API（不再消耗 DeepSeek 的模型 token/配额）。**其他一切不变**：`web_search` / `web_fetch` 工具照旧，LLM、会话等不受影响。

> 当前版本适配 **DSH 0.2.0-rc.1**（`@deepseek-ai/dsh-*` 0.2.0-rc.1 / `@deepseek-ai/cordis` 4.0.4）。
>
> 从 0.7.0 升级到 0.8.0 只改了「兼容声明」：DSH 0.2.0 启动前会校验每个 profile 插件的
> `peerDependencies` 是否满足当前运行时（见下方「与 DSH 0.2.0 的兼容」）。插件用到的所有
> API 在 0.1.7 → 0.2.0 之间没有变化，因此 host/client 两半的实现保持原样。

> **本仓库的 0.8.2 比 npm 上的 0.8.0 多改了两处**（第一处是运行行为修正，上游发新版时
> 用它的 `lib/` 覆盖前请重读本节，别把修好的补丁又换回有问题的那种）：
>
> 1. **`cordis.patch.yml` 在同一行里同时写 `searchProvider` 和 `fetchProvider`。** npm 上的 0.8.0
>    只写了 `searchProvider`，而 DSH 的 patch 语义是**整段替换**目标行的 `config`（不是深合并），
>    于是基础层的 `fetchProvider: http` 被一并抹掉；此时若 profile 里还挂着
>    `@deepseek-ai/dsh-web-app`（它会注册 `deepseek-fetch-api`），fetch 缝上就有两个可用 provider，
>    任何一次 `web_fetch` 都会抛 `WEB_PROVIDER_AMBIGUOUS`。详见 [cordis.patch.yml](cordis.patch.yml)
>    顶部注释。只装 Tavily 搜索、不装 `dsh-web-app` 的 profile 不会触发这个问题，但两个键一起写
>    没有任何副作用。
> 2. **`endpoint` 现在可以填服务根地址。** `searchEndpoint()` / `usageEndpoint()` 从同一个端点推导
>    `/search` 与 `/usage`：自建 Tavily 兼容代理通常只在 `/search` 上提供搜索，根路径是管理面板
>    （FastAPI 会回 405，看着非常像 Key 无效）。详见下方「`endpoint` 与自建代理」。

## 特性

- **多 Key 池**：在 Web 设置页添加、重命名、替换、启停和删除多个 Tavily API Key。
- **轮询搜索**：搜索在「启用且已配置」的 Key 之间轮询（round-robin）；被停用的 Key 不参与搜索。
- **用量查询**：每个 Key 均可点击「查询用量」，调用 Tavily 官方 `GET /usage` 读取**实时积分用量**，界面显示 **已用 / 总量** 和进度条（如 `79 / 1000 积分`）。
  - 停用的 Key 仍可查询用量，只是不参与搜索。
- **凭据安全**：Key 值通过凭据服务（`ctx.credentials`）存储，**永不写入配置文件，也不会返回浏览器**；配置里只保存 Key 的显示名称、生成的凭据引用和启用状态。
- **超时保护**：`timeoutMs` 会与调用方的取消信号合并，超时报中文错误。
- **中文报错/提示**：插件产生的错误与提示均为中文，便于排查。

## 工作原理

- 插件导出一个 `Config` schema 和一个 `apply`，注册 id 为 `tavily` 的 `WebSearchProvider`（通过 `ctx.web.registerSearchProvider`）。
- bundle patch 把 `web` 服务的 `searchProvider` 从 `deepseek-official` 改为 `tavily`、把 `fetchProvider` 显式写回 `http`，并插入本插件的行 `web-search-tavily`。
- 每次 `web_search` 调用 → 直接向 Tavily REST API 发请求 → 结果映射为 DSH 标准 `WebSearchResult`（url / title / snippet / publishedAt）。
- 模型侧的 `web_search` 工具本身（`@deepseek-ai/dsh-tool-web`）**完全不动**，所以模型看到的能力没有任何变化。

### DSH 0.1.7 起沿用至今的配置模型

自 0.1.7 起（0.2.0 未变）取消了「插件注册设置命名空间」的旧模型（`ctx.settings.installSection` / `ctx.settingsScope`）：

- **插件自己的 `Config` 就是配置界面**。配置服务的 `describe()` 按 profile 行 id 暴露每个插件条目的 schema 与实时取值，浏览器端用 `ctx.configForms.get('<行 id>')` 拿到共享表单。
- 因此**行 id = 设置命名空间**：本插件的行 id 是 `web-search-tavily`，客户端 `TAVILY_NS` 与之一致。
- 只有声明为 `.volatile()` 的字段才会被渲染为可编辑项，并且**每次操作都读取实时值**（无需重启、无需重挂插件）。
- 保存走 `mutate(ops, revision)` 的**路径写入 + 版本栅栏**，一次保存是一次原子写入。
- 本插件自己提供设置页面，所以 `apply` 里调用 `ctx.settings.configure({ auto: false }, ctx.fiber)`，避免配置服务再自动生成一个重复的页面。

## 与 DSH 0.2.0 的兼容

DSH 0.2.0 新增了一道**启动前置校验**：在挂载任何插件之前，launcher 会读取每个 profile 行（以及每个 bundle）的
`package.json`，把它声明的 `@deepseek-ai/dsh` / `@deepseek-ai/dsh-*` peer 依赖与当前运行时版本做
semver 比对；只要有一个区间不满足，该行就被**静默禁用**（`dsh --dump-config` 会打印
`disabling profile plugin ...`）。这正是 0.7.0 在 0.2.0-rc.1 上失效的原因：它的 peer 区间是
`^0.1.7-alpha.1`，而 `0.2.0-rc.1` 不在其中。

因此 0.8.0 的改动集中在 manifest（本仓库发布为 0.8.2，在它之上只多出上面那两处）：

| 项 | 0.7.0 | 0.8.0 |
|---|---|---|
| `peerDependencies` 的 dsh 区间 | `^0.1.7-alpha.1` | `^0.2.0-rc.1` |
| `@deepseek-ai/cordis` | `^4.0.3` | `^4.0.4` |
| `@deepseek-ai/schemastery` | `^3.18.3` | `^3.18.4` |
| `engines.dsh` | 无 | `>=0.2.0-rc.1 <0.3.0` |

> `engines.dsh` 目前只是声明性元数据（0.2.0 的 launcher 不读取 `engines`），真正决定行是否挂载的是
> `peerDependencies`。两者写同一个区间，是为了让「只读 manifest」和「实际校验」得出同一结论。

插件用到的 host/client API 在 0.1.7 → 0.2.0 之间没有破坏性变化，所以 `lib/index.js`（host 半，手写维护）与
`src/client/` 的实现无需改动。唯一的构建侧调整是 `tsdown.config.ts` 把已弃用的
`external` / `noExternal` 换成现在的 `deps.neverBundle` / `deps.alwaysBundle`（产物逐字节等价）。

浏览器半的模块表（platform seed）在 0.2.0 与 0.1.7 相同，仍是
`react` / `react/jsx-runtime` / `react-dom` / `react-dom/client` / `@deepseek-ai/cordis` /
`@deepseek-ai/dsh-client-store` / `@deepseek-ai/dsh-client-ui-slots` /
`@deepseek-ai/dsh-client-ui-primitives` / `@deepseek-ai/dsh-client-ui-dockkit`。
`lib/client.js` 只 `require` 其中的 `@deepseek-ai/dsh-client-ui-primitives`；其余 dsh 包（renderer、
settings、locale、api-remotes、credentials）都是**仅类型**导入，编译后被擦除。

### 验证兼容性

```bash
npm run verify   # 5 道闸门，见下
```

1. **`verify-compat.mjs`** —— 直接调用 DSH 自己的 `evaluatePluginCompatibility`（`dsh-app-boot` 导出，
   也就是启动校验用的同一个函数），断言本包的 manifest 能通过 0.2.0-rc.1 的前置校验；同时守住
   peer 区间不再回退到 0.1.x。
2. **`verify-client-manifest.mjs`** —— 用 `dsh-client-modules` 真正的 `parseDshClient` 校验
   `dsh.client` 声明，并检查 `lib/client.js` 的每个 `require` 都落在平台种子或声明的 `external` 里。
3. **`verify-bundle.mjs`** —— 产物的 loader 交接、平台种子、旧 API 残留。
4. **`verify-client.mjs`** —— 浏览器半运行时检查：注意它**不再手抄** `SettingsFormModel`，而是从
   `@deepseek-ai/dsh-client-ui-primitives` 的真实产物里就地提取该实现来跑，避免转录副本与线上实现漂移。
5. **`smoke.mjs`** —— host 半集成测试：真实 `ctx.web` + `ctx.webServer` + 真实 `Config` schema，
   覆盖 provider 选择、轮询、结果映射、超时与 `/api/tavily/usage` 路由。

## API Key 配置（推荐：Web 设置页）

配置路径：**设置 → Tavily 搜索**（`settings.section` 槽位，与「飞书通知」同级）。API Key 池为空或全部停用时，搜索不可用。

- 支持添加、重命名、替换、启停和删除多个 API Key；搜索在启用且已配置的 Key 之间轮询。
- Key 是只写控件：通过凭据服务（`ctx.credentials`）存储，永不写入配置文件，也不会返回浏览器。
- 每个 Key 可以按需调用 Tavily 官方 `GET /usage` 查询实时积分用量、上限和搜索用量。
- 同时可以配置 **接口地址 / 搜索深度 / 最大结果数**，下一次搜索立即生效。

## 安装

**图形界面（没装 dsh CLI 也能用）**：点 DSH 左侧栏的 **插件 → 添加插件 → 安装第三方插件**，
在「包名或地址」填下面这一行，安装后重启 DSH：

```
https://github.com/Yoahoug/dsh-workspace#path:/dsh-tavily-web-search
```

**命令行**：

```bash
dsh plugin --profile desktop add "git+https://github.com/Yoahoug/dsh-workspace.git#path:/dsh-tavily-web-search"
# 或本机目录 / tgz
dsh plugin --profile desktop add file:$HOME/Desktop/dsh-workspace/dsh-tavily-web-search
dsh plugin --profile desktop add file:/path/to/dsh-tavily-web-search-0.8.2.tgz
```

装完重启 DSH，此后模型侧每次 `web_search` 都走 Tavily。本地目录、`pnpm link` 的坑、
手工改 profile manifest、旧 Key 池迁移，都写在仓库的
[开发与安装说明](../docs/DEVELOPMENT.md) 里。

## 配置项

| 键 | 默认值 | 含义 |
|---|---|---|
| `keys` | `[]` | API Key 池的非敏感元数据；Key 值存储在凭据服务中 |
| `endpoint` | `https://api.tavily.com/search` | Tavily 搜索端点（可填服务根地址，见下） |
| `searchDepth` | `advanced` | 搜索深度：`basic` / `advanced` |
| `maxResults` | `8` | 每次搜索返回的最大结果数 |
| `timeoutMs` | `30000` | 单次请求超时（毫秒），与调用方取消信号合并 |

### `endpoint` 与自建代理

官方地址是 `https://api.tavily.com/search`；用自建/第三方 Tavily 兼容代理时，把域名换掉即可。

代理通常只在 `/search` 上提供搜索，**根路径 `/` 是管理面板**（甚至可能是 FastAPI 的 405 响应），
所以「填根地址」是最常见的配置错误：

```text
http://10.66.66.66:8181/      # 根地址：插件会自动补成 /search（本仓库 0.8.2 起）
http://10.66.66.66:8181/search  # 推荐写法：显式写全
```

`searchEndpoint()` 会在端点路径为空、或误填了 `/usage` 时补成 `/search`；已经带路径的
（例如 `/v1/`）保持原样，不会被改写。同时 `usageEndpoint()` 由同一个端点推导出 `/usage`，
因此「查询用量」也跟着自建代理走，而不是回落到 `api.tavily.com`（代理签发的 Key 在官方
站点上无效）。

> `query` 与 `Authorization: Bearer <key>` 的请求形状与官方一致；
> 若代理只认 `{"api_key": ...}`，请在代理侧配置，或另行改造请求体。

## 验证

安装并重启后，让模型做一次 `web_search`（例如查一个时效性问题）。如果调用成功，说明已走 Tavily；失败时错误信息为中文且以 `Tavily ...` 开头。

再确认一下 `web_fetch` 没被带塌（这正是本仓库补丁要解决的问题）：

```bash
# desktop profile 只能由 Electron 应用管理，命令行 dump 会拒绝；复制一份再看
cp -R ~/.dsh/profiles/desktop ~/.dsh/profiles/probe
dsh --profile probe --dump-config | grep -A4 '^- id: web$'
rm -rf ~/.dsh/profiles/probe
```

期望输出里同时有 `searchProvider: tavily` 与 `fetchProvider: http` 两行。只有一行就说明用的是有问题的 patch。

## 文件

本仓库只存放**可运行产物**（`lib/` 已构建好），上游的 `src/`、`scripts/`、`tsdown.config.ts`
等源码不在仓库里 —— 需要改客户端实现时请回到上游仓库
[blooming-fang/dsh-tavily-web-search](https://github.com/blooming-fang/dsh-tavily-web-search)。

```
dsh-tavily-web-search/
├── package.json          # 插件清单 + bundle patch + dsh.client 声明
├── cordis.patch.yml      # 把 searchProvider 指向 tavily、fetchProvider 写回 http，并插入插件行
├── lib/
│   ├── index.js          # TavilySearchProvider 实现（host 端，手写维护）
│   ├── index.d.ts        # 类型声明
│   ├── client.js         # 浏览器端 bundle：设置页 Tavily tab
│   ├── client.js.map     # 源码映射（内嵌 4 个客户端 TS 源文件）
│   └── types/client/     # 客户端类型声明
├── LICENSE               # MIT，© 2026 blooming-fang
└── README.md
```

## License

[MIT](./LICENSE)
