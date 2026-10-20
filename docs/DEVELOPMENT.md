# 开发与安装说明

面向要改这个仓库、或者要把它装到别的机器上的人。日常使用只需要看 [README](../README.md)。

## 仓库与 DSH 的关系

DSH 没有「插件市场清单」这种东西（ZCode 的 `.claude-plugin/marketplace.json` 在 DSH 里没有对应物）。
一个插件在 DSH 里就是 profile 里的**一条依赖 + 一个 bundle**，所以本仓库根目录不需要任何索引文件，
安装时直接指向子目录。

插件装在 **profile** 里，不装在插件目录里：

```
$DSH_HOME/profiles/<profile>/          # $DSH_HOME 默认 ~/.dsh
  package.json                         # dependencies + dsh.profile.bundles
  cordis.patch.yml                     # 本机的 patch 层（含密钥引用、网关地址）
  node_modules/<插件名>/                # 安装的插件本体
```

`dsh plugin add` 会自动做三件事：把包写进 profile 的 `dependencies`、`pnpm add` 它、
把插件名追加到 `dsh.profile.bundles`（不追加的话插件的 `cordis.patch.yml` 不会生效）。

### 本机当前装了什么

`desktop` profile 里一共四个第三方插件，两种来源：

| 插件 | 来源 | 备注 |
|---|---|---|
| `dsh-tavily-web-search` | 本仓库（GitHub 子目录） | 自有维护，`#path:/dsh-tavily-web-search` |
| `dsh-remote` | 本仓库（`file:` 本地目录） | 自有维护，改完 `lib/` 再装一次即生效 |
| `dsh-builtin-browser` | npm 官方源 | 别人的插件，**不复制进仓库**，按包名装 |
| `@michengai/dsh-skills-manager` | npm 官方源 | 同上 |

后两个有各自的 GitHub 仓库与 npm 包，复制一份源码进来只会让「本机这一份」和上游永久分叉；
本仓库的根 `README.md` 里登记了包名、上游地址与安装命令，换机器照着装即可。

> **判断标准**：代码是我改的、或者上游不会再原样发版 → 进仓库；上游还在发版、我只是个使用者 →
> 只记包名和来源。装第三方一律走官方链接（npm 包名或上游 GitHub 地址），不要指向本仓库的副本。


## 安装

### 图形界面（没装 dsh CLI 时用这个）

DSH desktop 自带插件管理页，安装第三方插件不需要任何命令行：

1. 点左侧栏的 **插件**（图标行，说明文字是「安装、启用和配置插件」）。
2. 点 **「添加插件」**，在「选择添加插件方式」里选 **「安装第三方插件」**。
3. 在 **「包名或地址」** 里填下面任意一种，点 **「安装」**：

   | 填什么 | 值 |
   |---|---|
   | GitHub 仓库 + 子目录（推荐，新设备首选） | `https://github.com/Yoahoug/dsh-workspace#path:/dsh-tavily-web-search` |
   | 本机已克隆的仓库目录 | `/Users/<你>/Desktop/dsh-workspace/dsh-tavily-web-search` |
   | 打包好的 tgz | `/path/to/dsh-tavily-web-search-0.8.2.tgz` |
   | npm 包名（上游原版，**不含**本仓库的 patch 修正与端点推导） | `dsh-tavily-web-search` |

4. 装完会出现「已安装，请重启 DSH 加载它。」——**完全退出并重开 DSH**（关窗口不算）。
5. 重启后打开 **设置 → Tavily 搜索**，添加至少一个 Tavily API Key。

注意事项：

- 本地目录必须是**绝对路径**，界面上没法用 `~` 或相对路径（Host 的工作目录对浏览器没有意义）。
- 从 GitHub 装时 `.git` 后的 `#path:/<子目录>` 不能省，否则会把仓库根当成包；装本仓库里**另一个**
  插件同理，改的是 `#path:/dsh-remote`。
- 第三方插件（`dsh-builtin-browser`、`@michengai/dsh-skills-manager`）直接填 **npm 包名**，
  GitHub 地址和 `.git` 后缀都不需要；它们按自己的节奏发版，别把源码拷进本仓库。
- 第三方插件**没有「更新」按钮**：要升级就先卸载再装一次（官方按需插件才会随 DSH 升级）。
- GitHub 连不上时界面会提示改用 npmmirror，但 Git 地址和 `.tgz` 直链不走安装源，仍需要本机能访问它。
- 插件以你的用户权限在本机运行，只装信任来源。

### 命令行（装了 dsh CLI 时）

```bash
# 从 GitHub 装（git 子目录，任何设备一条命令）
dsh plugin --profile desktop add "git+https://github.com/Yoahoug/dsh-workspace.git#path:/dsh-tavily-web-search"

# 或者本机已经克隆了仓库（file: 会把插件拷进 profile，不走软链）
dsh plugin --profile desktop add file:$HOME/Desktop/dsh-workspace/dsh-tavily-web-search

# 或者装打包好的 tgz
cd dsh-tavily-web-search && npm pack
dsh plugin --profile desktop add file:$PWD/dsh-tavily-web-search-0.8.2.tgz

# 第三方插件：用它们自己的 npm 包，不要指本仓库
dsh plugin --profile desktop add dsh-builtin-browser
dsh plugin --profile desktop add @michengai/dsh-skills-manager
```

> **别用 `pnpm link`，也别 `pnpm add /绝对目录`**。那会在 profile 里留下软链，Node 按真实路径
> （仓库目录）去找 `@deepseek-ai/*` peer，仓库里没有这些包，启动时报
> `ERR_MODULE_NOT_FOUND: Cannot find package '@deepseek-ai/schemastery'`。
> `file:` 协议是**拷贝**（pnpm hard-link 到 store），peer 从 profile 的 `node_modules` 解析，
> 本地装插件只有这一种稳的写法。
>
> 手工改 profile 的 `package.json` 时，`bundles` 里要放在 `@deepseek-ai/dsh-web-app` **之后**：
>
> ```jsonc
> "dependencies": { "dsh-tavily-web-search": "file:/path/to/dsh-tavily-web-search" },
> "dsh": { "profile": { "bundles": [
>   "@deepseek-ai/dsh-base",
>   "@deepseek-ai/dsh-web-app",
>   "dsh-tavily-web-search"
> ] } }
> ```

### 迁移旧 Key 池（从 0.6.x 升级时）

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

（上面的 `id` / `ref` 用你旧配置里的原值；`ref` 只是凭据的**引用名**，真正的 Key 在
`$DSH_HOME/.credentials.yaml` 里，不在这个仓库里。）

## 与上游的差异（为什么不用 npm 上的 0.8.0）

npm 上最新是 `dsh-tavily-web-search@0.8.0`，它的 `cordis.patch.yml` 是：

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

本仓库的 0.8.2 把两个键写在**同一条** patch 里：

```yaml
- id: web
  config:
    searchProvider: tavily
    fetchProvider: http
```

> 不能拆成两条 `- id: web`：第二条同样是整段替换，第一条的键会被再抹一次。必须一次写全。

第二处差异是 `endpoint` 的处理。上游把设置里的 `endpoint` 原样 POST 出去，而自建 Tavily
兼容代理通常只在 `/search` 上提供搜索，根路径 `/` 是管理面板（FastAPI 会直接回 405），
填根地址看起来和「Key 无效」一模一样。0.8.2 的 `lib/index.js` 因此加了两个纯函数：

| 函数 | 输入 | 输出 |
|---|---|---|
| `searchEndpoint(raw)` | 空 / 根地址 / `/usage` / 已带路径 | 默认官方地址 / 补成 `/search` / 改写成 `/search` / 原样保留 |
| `usageEndpoint(raw)` | 同一个 `endpoint` | 推导出同源的 `/usage`，不回落到 `api.tavily.com` |

`available()` 也换成同一个 `parseEndpoint()`，所以「留空用官方地址」和「填了非法值」的判定
和真正发请求时一致。代理签发的 Key 只在代理上有效，用量查询跟着同一个端点走是必要的。

所以除了 `cordis.patch.yml` 和上面这两个函数，`lib/` 下其余产物与上游 0.8.0 一致；
上游发新版时以它的 `lib/` 为基准，重新打回这两处（`git diff` 会清楚显示改了哪几行）。

## 验证

`desktop` 这个 profile 被标记为「只由 Electron 应用管理」，命令行直接 `--dump-config`
会报 `profile "desktop" is managed exclusively by the Electron application`。复制一份再 dump：

```bash
cp -R ~/.dsh/profiles/desktop ~/.dsh/profiles/probe
dsh --profile probe --dump-config | grep -A4 '^- id: web$'
# 期望看到两行：searchProvider: tavily / fetchProvider: http
rm -rf ~/.dsh/profiles/probe
```

插件有没有装上是另一回事，用 `dsh plugin list` 看即可（对 `desktop` 也能用）：

```bash
dsh plugin --profile desktop list      # 应列出 dsh-tavily-web-search@0.8.2（以及另外三个第三方插件）
```

再让模型跑一次 `web_search`（走 Tavily）和一次 `web_fetch`（走匿名 http provider），
两个都通就说明装对了。错误信息以 `Tavily ...` 开头的是插件报的，中文，容易认。

## 加一个新插件

1. 在仓库根下建目录，目录名与插件名一致（小写 + 连字符）。
2. 放上插件的 `package.json`，其中必须有 `dsh.bundle.patch` 指向它自己的
   `cordis.patch.yml`；客户端插件再加 `dsh.client` 声明。
3. 在 `cordis.patch.yml` 里写它要改的缝（`- id: <行 id>` + 完整的 `config`）和
   `- insert:` 的插件行。**改已有行的 `config` 时一定要把该行原有的键全部重写一遍**，
   否则会被整段替换掉 —— 这就是本仓库 0.8.2 修的那个坑。
4. 在根 `README.md` 的**「本仓库维护的插件」**表里登记一行，并补一份 `<插件名>/README.md`；
   如果只是用别人的插件，登记到**「本机在用的上游插件」**表，别建目录。
5. 有的插件需要构建产物才能跑（DSH 只加载 `lib/`），把产物一起提交；别提交 `node_modules/`。
6. 提交、推送；其他设备重新装一次（GUI 里卸载再装，或命令行 `dsh plugin add`）并重启。

## 隐私：什么东西不进仓库

`$DSH_HOME`（默认 `~/.dsh`）是本机状态，**不在**这个仓库里，也不该加进来：

| 别提交 | 为什么 |
|---|---|
| `$DSH_HOME/.credentials.yaml` | 存的是真密钥（Tavily、模型 API Key 等），按名字被插件引用 |
| profile 的 `~/.dsh/profiles/*/cordis.patch.yml` | 本机定制层，常含模型网关地址、Key 池的凭据引用 |
| `.env` / `$DSH_HOME/.env` | 代理地址、`DSH_*` 开关等本机环境 |
| 任何 `*.tgz`、`node_modules/` | 构建/安装产物，仓库只存源码与 `lib/` 产物 |
| 别人的插件源码（`dsh-builtin-browser`、`@michengai/dsh-skills-manager` 等） | 有自己的仓库和 npm 包，复制进来就会和上游分叉；本仓库只记包名与安装来源 |

规矩：

- 插件里的密钥一律走凭据服务（`ctx.credentials`）或环境变量，**代码里只写凭据引用名**
  （如 `TAVILY_API_KEY_XXX`），不写值。配置里只保存 Key 的显示名、引用、启用状态。
- 需要贴日志/截图求助时，先抹掉网关域名、Key、token。
- 提交前扫一遍：`git grep -nE 'tvly-|sk-|api[_-]?key\s*[:=]\s*"[^"]{12,}'`，命中就查。

本仓库同步的只有「插件本体」，换一台机器仍然要自己：装 DSH、在设置页重配 Key、
必要时配代理。

## 改插件代码：另起调试实例

上面这些都是「装插件」。**改插件代码**（自己的或二改别人的）是另一条路：桌面主实例被
Electron 独占、又在跑日常会话，不能拿来当调试对象，改坏 `lib/` 会当场影响正在用的界面。

隔离实例、`link:` 挂仓库、host/client 两侧热重载、面板验证与清理，整套流程见
[DEV-INSTANCE.md](DEV-INSTANCE.md)；agent 的硬约束写在根目录的
[AGENTS.md](../AGENTS.md)。
