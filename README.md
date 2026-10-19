# dsh-workspace

DeepSeek Harness（DSH）插件仓库，用于多设备同步。

| 插件 | 说明 |
|---|---|
| [`dsh-tavily-web-search`](dsh-tavily-web-search/README.md) | 把 `web_search` 的后端换成 Tavily：多 Key 轮询、Key 存凭据服务、设置页可查每个 Key 的实时积分用量。基于上游 0.8.0，修掉了一处会让 `web_fetch` 全盘失效的 patch 缺陷 |

## 仓库组成

```
dsh-tavily-web-search/     插件目录：package.json + cordis.patch.yml + lib/（已构建产物）
docs/DEVELOPMENT.md        开发与安装说明
README.md                  本文件
LICENSE                    MIT
```

DSH 没有插件市场清单：一个插件就是 profile 里的一条依赖 + 一个 bundle，所以仓库根目录
不需要索引文件，安装时直接指向子目录。

安装（含不依赖命令行的 DSH desktop 图形界面步骤）、验证、加新插件、以及**哪些本机数据不许
提交进仓库**，都在 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。

## License

MIT，见 [LICENSE](LICENSE)。`dsh-tavily-web-search/` 内的代码版权归上游作者 blooming-fang，
同样以 MIT 授权，见该目录下的 [LICENSE](dsh-tavily-web-search/LICENSE)。
