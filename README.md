# dsh-workspace

DeepSeek Harness（DSH）的**插件仓库**：放我改过、想留下的插件，顺便在多台机器之间同步。

它是一整套插件集，不是某一个插件的主页 —— 根下一个插件一个目录，互不相干。
新的自有插件会直接加在下面第一张表里，装法不变，都是 `#path:/<目录名>`。

**第三方插件不进这个仓库**：它们有自己的仓库和 npm 包，这里只记「本机在用哪几个、从哪装」。
装的时候走官方链接（npm 包名或上游 GitHub），升级跟着上游发版走 —— 复制一份别人的代码进来，
只会让「本机这一份」和上游永久分叉。

## 本仓库维护的插件

| 插件 | 做什么 |
|---|---|
| [`dsh-tavily-web-search`](dsh-tavily-web-search/README.md) | 让 `web_search` 走 Tavily 而不是 DeepSeek 官方搜索：多 Key 轮询、Key 存凭据服务、设置页可查每个 Key 的实时积分用量、`endpoint` 支持自建 Tavily 兼容代理。基于上游 0.8.0，补掉了会让 `web_fetch` 全盘失效的 patch 缺陷（本仓库 0.8.2） |
| [`dsh-remote`](dsh-remote/README.md) | 远端操控：独立端口上的反向代理，给同一 WireGuard 组网里的设备用，一条长令牌链接换签名 HttpOnly Cookie 后把**原版界面**（HTTP + WebSocket）送到对端浏览器；侧边栏面板管开关、链接、轮换和访问记录 |

## 本机在用的上游插件

别人写的，代码不在本仓库，也没必要复制进来。换机器时按「安装来源」原样装一遍即可。

| 包名 | 上游 | 安装来源 | 做什么 |
|---|---|---|---|
| `dsh-builtin-browser` | [wqty123/dsh-browser](https://github.com/wqty123/dsh-browser)（MIT） | npm：`dsh plugin --profile desktop add dsh-builtin-browser` | 共享真实浏览器：安装即得 34 个 `dsh_browser_*` 工具，agent 和一个真人可随时接管**同一个页面**；载体自动选择（桌面侧边栏 / 本机 Chrome 或 Edge / 自托管窗口） |
| `@michengai/dsh-skills-manager` | [MichengAI/dsh-skills-manager](https://github.com/MichengAI/dsh-skills-manager)（Apache-2.0） | npm：`dsh plugin --profile desktop add @michengai/dsh-skills-manager` | 技能管理器：在一个界面里浏览、搜索、启停本机与项目的 Agent Skills，支持从 GitHub 装技能、预览更新、回收站与备份 |
| `dsh-rewind-plugin` | [SiriLee/dsh-rewind](https://github.com/SiriLee/dsh-rewind)（MIT） | npm：`dsh plugin --profile desktop add dsh-rewind-plugin` | 就地回退（Claude Code `/rewind` 语义）：每条用户消息旁一个 ↶ 按钮或 `/rewind`、`/undo` 命令，把该消息及之后的内容同时从模型上下文和渲染对话里撤回、原文本回填输入框，可选连工作区文件一起还原。会话日志只追加回退标记，文件备份不依赖 git |

> 这三个都从 **npm 官方源**装，仓库里只留这张表。`dsh-builtin-browser` 的桌面侧边栏载体还需要在
> DSH 自己的安装目录里跑一次 `desktop-bridge/install.mjs`（可选，不装则用自托管窗口），细节看它自己的文档。
>
> `dsh-rewind-plugin` 的 npm 上还有个同名不同作者的 `dsh-rewind`，**别装错**：包名是 `dsh-rewind-plugin`。

## 仓库结构

```
<插件名>/                   一个自有插件一个目录：package.json + cordis.patch.yml + lib/（已构建产物）
docs/DEVELOPMENT.md         安装、验证、加新插件、什么不许提交
docs/DEV-INSTANCE.md        单开调试实例：改插件代码时怎么看到效果
AGENTS.md                   agent 必须遵守的硬约束（装插件 vs 改插件、调试规矩）
README.md                   本文件
LICENSE                     MIT
```

DSH 没有插件市场清单：一个插件就是 profile 里的一条依赖 + 一个 bundle，所以仓库根目录
不需要索引文件，安装时直接指向子目录（`#path:/<插件名>`）。

每个插件装什么、怎么配，看它目录里的 README；**装法、验证、加新插件，以及哪些本机数据
不许提交进仓库**，都在 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。

**改插件代码时**另起一个实例看效果 —— 桌面主实例被 Electron 独占、又在跑日常会话，
不能拿来调试。隔离开发、热重载、面板验证的完整流程见
[docs/DEV-INSTANCE.md](docs/DEV-INSTANCE.md)；硬约束在根目录的 [AGENTS.md](AGENTS.md)，
agent 每次会话都会读到。

## License

MIT，见 [LICENSE](LICENSE)。`dsh-tavily-web-search/` 内的代码版权归上游作者 blooming-fang，
同样以 MIT 授权，见该目录下的 [LICENSE](dsh-tavily-web-search/LICENSE)。
`dsh-remote/` 为本仓库原创，MIT。
上表列出的第三方插件版权归各自作者，按各自的许可证分发（MIT / Apache-2.0），不在本仓库内。
