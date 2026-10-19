# dsh-tavily-web-search

Tavily 支持的 `WebSearchProvider`，用于 DeepSeek Harness 的 web 能力缝（`ctx.web`）。

它把模型侧 `web_search` 工具的后端从 **DeepSeek 官方搜索** 换成 **Tavily** —— 每次搜索直接调用 `POST https://api.tavily.com/search`，不再走 DeepSeek API（不再消耗 DeepSeek 的模型 token/配额）。**其他一切不变**：`web_search` / `web_fetch` 工具照旧，LLM、会话等不受影响。

> 当前版本适配 **DSH 0.2.0-rc.1**（`@deepseek-ai/dsh-*` 0.2.0-rc.1 / `@deepseek-ai/cordis` 4.0.4）。
>
> 从 0.7.0 升级到 0.8.0 只改了「兼容声明」：DSH 0.2.0 启动前会校验每个 profile 插件的
> `peerDependencies` 是否满足当前运行时（见下方「与 DSH 0.2.0 的兼容」）。插件用到的所有
> API 在 0.1.7 → 0.2.0 之间没有变化，因此 host/client 两半的实现保持原样。

> **本仓库版本与 npm 上的 0.8.0 有一处不同**：`cordis.patch.yml` 在把 `searchProvider` 指向
> `tavily` 的同时，把 `fetchProvider` 重新写回 `http`。npm 上的 0.8.0 只写了 `searchProvider`，
> 而 DSH 的 patch 语义是**整段替换**目标行的 `config`（不是深合并），于是基础层的
> `fetchProvider: http` 被一并抹掉；此时若 profile 里还挂着 `@deepseek-ai/dsh-web-app`
> （它会注册 `deepseek-fetch-api`），fetch 缝上就有两个可用 provider，任何一次 `web_fetch`
> 都会抛 `WEB_PROVIDER_AMBIGUOUS`。详见 [cordis.patch.yml](cordis.patch.yml) 顶部注释。
> 只装 Tavily 搜索、不装 `dsh-web-app` 的 profile 不会触发这个问题，但两个键一起写没有任何副作用。

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

因此 0.8.0 的改动集中在 manifest（本仓库发布为 0.8.1，只多出下面那处 patch 修正）：

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

### 1. 打包

仓库里已经带着构建产物（`lib/`），只有改了客户端源码才需要重新构建：

```bash
npm install
npm run build      # 生成 lib/client.js
npm pack           # 生成 dsh-tavily-web-search-<version>.tgz
```

### 2. 装进 profile

把插件装成 profile 的依赖，并**加入 bundle 列表**（否则插件的 `cordis.patch.yml` 不会生效）：

```bash
# 本机仓库（把插件拷进 profile 的 node_modules，不走软链）
dsh plugin --profile desktop add file:/path/to/dsh-workspace/dsh-tavily-web-search

# 或者从 GitHub 直接装（git 子目录）
dsh plugin --profile desktop add "git+https://github.com/Yoahoug/dsh-workspace.git#path:/dsh-tavily-web-search"

# 或者装打包好的 tgz
dsh plugin --profile desktop add file:/path/to/dsh-tavily-web-search-0.8.1.tgz
```

`dsh plugin add` 会自动把插件加进 `dsh.profile.bundles` 并写进 `dependencies`；
手工装的话记得自己补，`package.json` 形如：

```jsonc
"dependencies": {
  "dsh-tavily-web-search": "file:/path/to/dsh-workspace/dsh-tavily-web-search"
},
"dsh": {
  "profile": {
    "bundles": [
      "@deepseek-ai/dsh-base",
      "@deepseek-ai/dsh-web-app",
      "dsh-tavily-web-search"   // ← 新增，放在 dsh-web-app 之后
    ]
  }
}
```

> **别用 `pnpm link` / 目录绝对路径（`pnpm add /path/to/dir`）**：那会在 profile 里留下软链，
> Node 会按真实路径（仓库目录）解析 `@deepseek-ai/*` peer，仓库里没有这些包，于是启动时报
> `ERR_MODULE_NOT_FOUND: Cannot find package '@deepseek-ai/schemastery'`。
> `file:` 协议是**拷贝**（pnpm 会 hard-link 到 store），peer 从 profile 的 `node_modules` 解析，
> 这是本地装插件唯一稳的写法。

### 3. 迁移旧 Key 池（从 0.6.x 升级时）

0.6.x 的 Key 池存在旧的 `$DSH_HOME/settings.yaml` 里，0.1.7 已不再读取该文件。把该 section 原样搬进 profile 的 `cordis.patch.yml`（凭据引用不变，因此已存的密钥继续可用）：

```yaml
- id: web-search-tavily
  name: dsh-tavily-web-search
  config:
    keys:
      - id: mth3iduzu7kb77
        name: 我的
        ref: TAVILY_API_KEY_MTH3IDUZU7KB77
        enabled: false
```

### 4. 重启生效

重启 `dsh web`。此后模型侧每次 `web_search` 都会走 Tavily。

## 配置项

| 键 | 默认值 | 含义 |
|---|---|---|
| `keys` | `[]` | API Key 池的非敏感元数据；Key 值存储在凭据服务中 |
| `endpoint` | `https://api.tavily.com/search` | Tavily 搜索端点 |
| `searchDepth` | `advanced` | 搜索深度：`basic` / `advanced` |
| `maxResults` | `8` | 每次搜索返回的最大结果数 |
| `timeoutMs` | `30000` | 单次请求超时（毫秒），与调用方取消信号合并 |

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
