# AGENTS.md

本仓库是 DeepSeek Harness（DSH）的插件集合。这里给出**每次会话都适用的硬约束**；
细节看 `docs/` 与各插件目录下的 README。

## 先分清楚：装插件 vs 改插件

| 任务 | 怎么做 |
|---|---|
| 安装 / 启用 / 停用一个插件 | 正常安装 + 重启。**不要**为此起调试实例 |
| 改自己的插件代码、看面板效果 | 走 `docs/DEV-INSTANCE.md` 的单开实例流程 |
| 二改别人的插件 | 同上；先把包拷成自己的再改，别直接改 `node_modules` |
| 只改插件的配置（Key、endpoint） | 设置页面里改，或改 `desktop` profile 的 `cordis.patch.yml` |

## 调试插件的硬约束

1. **永远不要用 `desktop` profile 起调试实例。** 它被 Electron 独占：

   ```
   error: profile "desktop" is managed exclusively by the Electron application
   ```

   调试一律用单独建的 `dev` profile（`dsh --profile dev …`）。步骤见
   [docs/DEV-INSTANCE.md](docs/DEV-INSTANCE.md)。
2. **不改用户正在用的桌面实例。** 不重启它、不编辑它的 `cordis.patch.yml`、
   不往它的 `node_modules` 里写东西；插件是改文件即生效的，改坏会当场影响他的界面。
3. 调试实例固定 `--port 5199 --no-open`，起完把完整 URL（含 `?token=`）告诉用户。
4. 用 `link:` 把仓库目录挂进 dev profile，不要维护插件副本。
   若启动报 `ERR_MODULE_NOT_FOUND: @deepseek-ai/*`，用
   `NODE_OPTIONS=--preserve-symlinks --preserve-symlinks-main` 启动，或在插件目录
   `npm install --no-save --no-package-lock`（`node_modules/` 已被 gitignore）。
5. 一次只改一处、改完立即验证：面板看文案/控件（`dsh_browser_*` 读文本或截图），
   接口用 curl 打。不要堆一批改动再一次性猜。
6. 收尾：先停掉调试实例，再 `git status --short` 确认仓库干净。临时探针
   （`console.log`、改路由的试验）一律还原，不留在提交里。

## 仓库约定

- 自有插件一个目录一个插件（`<插件名>/`：`package.json` + `cordis.patch.yml` + `lib/`）。
- 别人的插件**不进仓库**，只在根 `README.md` 的「本机在用的上游插件」表里登记包名与来源。
- `lib/` 是构建产物，要提交；`node_modules/`、`*.tgz`、`*.log` 不提交。
- 密钥只写凭据引用名（如 `TAVILY_API_KEY_XXX`），绝不写值；
  不提交 `$DSH_HOME/.credentials.yaml`、profile 的 `cordis.patch.yml`、`.env`。
- DSH 的 patch 语义是**整段替换**行 `config`，改已有行时必须把该行原有的键全部重写一遍。
- 提交信息用英文，遵循 `type(scope): summary` 约定。
