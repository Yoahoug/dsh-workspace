# 开发实例：单开一个 DSH 调试插件

改插件代码时用的隔离环境。**只是安装/启用/配置插件，不要走这里** —— 那正常装、重启就行。

## 什么时候用，什么时候不用

| 场景 | 要不要单开实例 |
|---|---|
| 正在写自己的插件，要看面板/接口效果 | **要** |
| 二改别人的插件（想改代码而不是等上游） | **要** |
| 插件装上了但行为不对，要断点/改代码查 | **要** |
| 只是安装、启用、停用一个现成插件 | 不用，GUI 装完重启 |
| 只是改插件参数（Key、endpoint 等） | 不用，设置页里改 |

## 为什么不能拿桌面主实例当调试对象

1. **`desktop` profile 被 Electron 独占**，命令行根本起不来：

   ```
   $ dsh --profile desktop --no-open --port 5199
   error: profile "desktop" is managed exclusively by the Electron application
   ```

2. 主实例正在跑你的日常会话，改代码触发热重载、或者重启，都会打断它。
3. 插件是「改文件即生效」的：在仓库里手滑改坏 `lib/client.js`，**正在用的界面会立刻跟着坏**。

所以调试一律另起一个 profile + 另一个端口，主实例照常用。

## 一次性准备

### 1. 确认 `dsh` 命令可用

```bash
dsh --version          # 期望：0.2.x
```

没有的话，在 DSH 桌面端 **设置 → 关于/开发者** 里安装命令行工具（写入 PATH 的 `dsh`）。
Windows 也可以直接调桌面版自带的 CLI：

```powershell
# 打印 fingerprint，再用它安装 shim 到 PATH
& "D:\Users\<你>\AppData\Local\Programs\DeepSeek Harness\DeepSeek Harness.exe" --expose-internals `
  "D:\Users\<你>\AppData\Local\Programs\DeepSeek Harness\resources\runtime\cli\command-manager.js" inspect
```

macOS 上装好之后就是 `/usr/local/bin/dsh`，命令完全一致。

### 2. 建 `dev` profile（只做一次）

```bash
dsh --profile dev --from-default-profile web --dump-config > /dev/null
```

- 用 `web` 模板（`@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-web-app`），**不含** `dsh-remote`：
  那个插件会占 `17800`，和主实例抢端口。
- profile 落在 `$DSH_HOME/profiles/dev/`（`$DSH_HOME` 默认 `~/.dsh`）。

### 3. 把仓库里的插件**链接**进来

```bash
# 用 link:（软链），不要用 file:（拷贝）
dsh plugin --profile dev add "link:<仓库绝对路径>/dsh-tavily-web-search"

# Windows 示例
dsh plugin --profile dev add "link:D:/Users/25657/Desktop/dsh-workspace/dsh-tavily-web-search"
# macOS 示例
dsh plugin --profile dev add "link:/Users/you/Desktop/dsh-workspace/dsh-tavily-web-search"
```

`link:` 是 junction/软链，仓库里改一个字，实例用的就是新代码；`file:` 是拷贝，
每改一次得重装一遍，所以开发别用。

确认链接生效：

```bash
dsh plugin --profile dev list
# 期望：dsh-tavily-web-search@link:D:/.../dsh-tavily-web-search
```

### 4. peer 依赖：链接目录必须先能解析到 `@deepseek-ai/*`

这是最容易卡住的一步。`link:` 之后 Node 按**真实路径**（仓库目录）去找 peer 依赖，
而仓库里没有 `node_modules`，启动就会报：

```
failed to import: Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@deepseek-ai/schemastery'
```

二选一：

**A. 启动时保留软链语义（推荐，零安装）**

```powershell
# Windows（PowerShell）
$env:NODE_OPTIONS = "--preserve-symlinks --preserve-symlinks-main"
dsh --profile dev --no-open --port 5199
```

```bash
# macOS / Linux
NODE_OPTIONS="--preserve-symlinks --preserve-symlinks-main" dsh --profile dev --no-open --port 5199
```

**B. 在仓库插件目录里装依赖**（仓库 `.gitignore` 已忽略 `node_modules/`）

```bash
cd dsh-workspace/dsh-tavily-web-search
npm install --no-save --no-package-lock
```

A 更干净（不动仓库、不占 80MB），B 更稳（不改变整个进程的模块解析规则）。
Windows 上 A 已实测可用；如果启动日志里出现别的解析错误，就退到 B。

### 5. 打开 host 侧热重载

`lib/client.js`（面板）由 `@deepseek-ai/dsh-client-hmr` 自动轮询，改完浏览器里直接换新，**不用配置**。
`lib/index.js`（host 侧）要 hmr 监听目录才会替换，在这份 profile 的 `cordis.patch.yml` 里加：

```yaml
- id: hmr
  disabled: false
  config:
    root:
      - D:/Users/25657/Desktop/dsh-workspace/dsh-tavily-web-search
```

Windows 写正斜杠；macOS 写 `/Users/...`。`root` 支持多个目录，一个插件一行。

## 日常开发循环

```bash
# 1) 起实例（后台）
dsh --profile dev --no-open --port 5199
# 输出一行：
#   dsh web: http://127.0.0.1:5199/?token=xxxxxxxx
```

`--no-open` 是不弹你自己的浏览器（agent 用自动化浏览器开），`--port 5199` 固定端口方便反复开。
token 每次启动都会变，**从这行输出里读**，不要记死。

```bash
# 2) 用自动化浏览器打开那个 URL，然后改代码：
#    lib/client.js  → 保存后浏览器里面板自动换成新版本（不必刷新、不必重启）
#    lib/index.js   → 保存后 hmr 替换模块，几秒内生效；启动日志里能看到替换记录
```

```bash
# 3) 验证
#    - 面板：设置 → 对应插件 tab
#    - 接口：curl http://127.0.0.1:5199/api/tavily/usage
```

```powershell
# 4) 收尾：停实例、确认仓库干净
Get-Process | Where-Object { $_.ProcessName -eq 'DeepSeek Harness' -and $_.MainWindowTitle -eq '' }
# 找到刚才那个后台进程 kill 掉；或者直接 Ctrl+C
cd dsh-workspace; git status --short   # 调试残留（临时探针、改路径的试验）都还原掉
```

> 调试用的临时改动（临时 `console.log`、改路由试错）**不要进提交**；
> `git status` 是最后一道闸门。

## 面板 UI 怎么看效果

面板不是单独页面，它挂在主界面的 **设置** 里：

1. 打开 dev 实例的 URL
2. 右上/左下 **账号菜单 → 设置**
3. 左侧选插件自己的 tab（如「Tavily 搜索」）
4. `lib/client.js` 保存后，这一步不用重做 —— 页面里会直接变成新文案/新控件

agent 调试时用 `dsh_browser_open` 打开该 URL，`dsh_browser_a11y` / `dsh_browser_execute`
读面板文本、断言改动是否生效，必要时截图留证。

## 常见坑

| 现象 | 原因 | 对策 |
|---|---|---|
| `ERR_MODULE_NOT_FOUND: @deepseek-ai/schemastery` | `link:` 指向仓库，peer 从真实路径解析 | 见上面「peer 依赖」A/B |
| `error: profile "desktop" is managed exclusively…` | 拿桌面 profile 起 CLI | 换 `--profile dev` |
| 启动打印一行 `dsh web: http://...` 后进程就没了 | 有 entry 没激活 | 看 stderr 的 `did not activate` 详情 |
| 改了 `lib/index.js` 没反应 | hmr 没配 `root`，或改的是 profile 里的拷贝 | 检查 `hmr` 段与 `dsh plugin list` 的 `link:` |
| 改了 `lib/client.js` 没反应 | 页面没连上（服务已停）/ 浏览器缓存 | 刷新一次；确认 SSE `/plugins/events` 通 |
| 端口占用 | 5199 被别的东西占了 | 换端口，或 `--port 0` 让系统挑（URL 从输出读） |
| dev 实例里看得到主实例的会话和 Key | 两个 profile **共享** `$DSH_HOME` 的 `sessions/`、`.credentials.yaml`、`storages/` | 介意就换独立 `DSH_HOME`（见下） |
| 17800 端口冲突 | dev profile 装了 `dsh-remote` | 别装；它只属于桌面主实例 |

### 需要完全隔离时

```bash
# 独立 home：会话、凭据、存储都和主实例分开
export DSH_HOME="$HOME/.dsh-dev"          # PowerShell: $env:DSH_HOME = "$env:TEMP\dsh-dev-home"
mkdir -p "$DSH_HOME/profiles"
dsh --profile dev --from-default-profile web --dump-config > /dev/null
dsh plugin --profile dev add "link:<插件路径>"
dsh plugin --profile dev install          # 在独立 home 里把依赖装齐
dsh --profile dev --no-open --port 5199
```

代价是新 home 里没有模型 Key，agent 用不了 —— 所以**只有调试凭据/会话相关行为时才值得**，
平时用共享 home 更省事。

## macOS 与 Windows 的差异

| | Windows | macOS |
|---|---|---|
| 插件路径 | `D:/Users/.../dsh-workspace/<插件>` | `/Users/<你>/Desktop/dsh-workspace/<插件>` |
| 命令行 | `dsh`（装 shim 后） | `/usr/local/bin/dsh` |
| 后台起实例 | 开一个 PowerShell 标签页跑 | `dsh --profile dev --no-open --port 5199 &` |
| 停实例 | `Ctrl+C` / 关标签页 | `kill %1` |
| 软链 | pnpm 建 junction | pnpm 建 symlink |

两台机器上命令只差路径；`cordis.patch.yml` 里的 `hmr.root` 和 `link:` 路径各自写本机绝对路径，
**不要跨机器复制这一段**。

## 约束（agent 必须遵守）

1. **调试代码只用 `dev` profile**，不碰 `desktop`；不改桌面主实例的 `cordis.patch.yml`。
2. 调试实例默认 `--port 5199 --no-open`，起完把完整 URL（含 token）报出来。
3. 用 `link:` 挂仓库目录，不在 profile 里维护插件副本。
4. 改完一处就验一处：面板看文案/控件，接口用 curl，不要一次改一堆再猜。
5. 结束先停实例，再 `git status` 确认仓库干净；临时探针不留在提交里。
6. 只是安装插件时**不要**启动这套流程 —— 正常安装、重启。
