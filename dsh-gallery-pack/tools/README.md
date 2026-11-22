# `dsh-gallery-pack/tools/` 工具清单

这个目录里有 35 个脚本，但**只有一部分是你需要的**。这里把用途和状态分清楚，
免得你对着一个 500 行的脚本猜它还能不能跑。

## 当前在用（文档里会提到这些）

| 脚本 | 干什么 |
|---|---|
| `install.mjs` | 装素材包到 `~/.dsh/boot-naruto/arts/` |
| `import-theme.py` | 导入第三方主题包（默认 dry-run，`--apply` 才写） |
| `pack-themes.py` | 把 `arts2/` 打成可分发的 `dsh-gallery-handson-*.zip` |
| `pack-scenery.py` | 生成自带的三套风景（需要本机有 ComfyUI 输出） |
| `build-index.py` | 为素材包生成 `INDEX.json/md/txt`；`--verify` 逐套体检 |
| `migrate-eye.py` | 把球心图设定从调色文件迁进 `preset.json`（一次性迁移工具） |
| `strip-exif.py` | 剥掉图片里的生成元数据（公开前脱敏） |
| `selftest-pack.py` | 素材包交付物的自测 |
| `check-glass.py` | 磨砂玻璃的 20 条结构断言 |

## 历史遗留（能把仓库建起来，但**现在用不到了**）

下面这些是"五遁位图底框"那一版功能留下的。那个功能在 2026-11-21 已被
磨砂玻璃取代，相关脚本保留只为了**记录当时怎么做的**，日常开发不需要碰：

- `build-frames.py` / `render-frames.py` / `mock-frames.py` —— 从 PSD 渲染底框图
- `prep-images.py` / `psd-audit.py` / `folder-sheet.py` / `idx-sheet.py` —— PSD 与图片批处理
- `trim-hard-bands.py` / `ui-corner-check.py` / `check-framing.py` / `clamp-pan.py` —— 底框的几何检查
- `pack-arts.py` / `pack-arts-data.py` / `pack-arts-index.py` / `build-arts*.mjs` —— 旧版素材包（v5–v7）打包
- `measure-arts.py` / `dump-act-table.py` / `neg-control-share.py` —— 量图与对拍
- `fix-favicon-leak.mjs` / `fix-static-inject.mjs` —— 历史 bug 的定点修复脚本
- `preview-frames.py` / `check-arts.mjs` / `check-arts2.mjs` —— 预览与检查

⚠ 这些脚本里有一部分引用了**已不在仓库**的 PSD/zip，跑起来会报找不到文件 ——
那是预期的，不是你的环境有问题。

## 想删掉它们？

可以。没有任何当前在用的脚本 import 它们。但删之前建议先 `git log --oneline -- <脚本>`
看一眼它当时解决的是什么问题——那些注释记的成本比脚本本身高。

## 如果你只想装主题

不需要这个目录里的任何东西。见根 README 的「装（两步，各一条命令）」，
或者直接把主题文件夹拖进 `~/.dsh/boot-naruto/arts/`。