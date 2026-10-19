# dsh-workspace

DeepSeek Harness（DSH）的**插件仓库**：放我改过、想留下的插件，顺便在多台机器之间同步。

它是一整套插件集，不是某一个插件的主页 —— 根下一个插件一个目录，互不相干，
`dsh-tavily-web-search` 只是目前唯一的一个。新的插件会直接加在下面这张表里，
装法不变，都是 `#path:/<目录名>`。

## 插件

| 插件 | 做什么 |
|---|---|
| [`dsh-tavily-web-search`](dsh-tavily-web-search/README.md) | 让 `web_search` 走 Tavily 而不是 DeepSeek 官方搜索：多 Key 轮询、Key 存凭据服务、设置页可查每个 Key 的实时积分用量。基于上游 0.8.0，补掉了会让 `web_fetch` 全盘失效的 patch 缺陷 |

## 仓库结构

```
<插件名>/                   一个插件一个目录：package.json + cordis.patch.yml + lib/（已构建产物）
docs/DEVELOPMENT.md         开发与安装说明
README.md                   本文件
LICENSE                     MIT
```

DSH 没有插件市场清单：一个插件就是 profile 里的一条依赖 + 一个 bundle，所以仓库根目录
不需要索引文件，安装时直接指向子目录（`#path:/<插件名>`）。

每个插件装什么、怎么配，看它目录里的 README；**装法、验证、加新插件，以及哪些本机数据
不许提交进仓库**，都在 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。

## License

MIT，见 [LICENSE](LICENSE)。`dsh-tavily-web-search/` 内的代码版权归上游作者 blooming-fang，
同样以 MIT 授权，见该目录下的 [LICENSE](dsh-tavily-web-search/LICENSE)。
