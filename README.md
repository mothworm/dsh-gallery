# dsh-gallery —— DeepSeek Harness 开屏动画 + 主题壁纸（代码）

一个仓库、**两个互相独立的插件**。都是自研，都不依赖第三方插件。

| 目录 | 包名 | 半边 | 干什么 |
|---|---|---|---|
| [`dsh-boot-gallery/`](dsh-boot-gallery/) | `dsh-boot-gallery` | **宿主侧** | 开屏动画 + `/dsh-boot-gallery/*` 六条路由（预设清单、素材发图、mp4 分段、诊断落盘） |
| [`dsh-boot-suites/gallery/`](dsh-boot-suites/gallery/) | `dsh-boot-suite-gallery` | **页面侧** | 悬浮球 + 壁纸面板 + 卡片排版配色 + **磨砂玻璃**文本框 |

两份 README 各管各的，**互不重复**；素材契约、mp4 规则、宿主路由清单在
[dsh-boot-gallery/README.md](dsh-boot-gallery/README.md)，文本框那层的 CSS 约束在
[dsh-boot-suites/gallery/README.md](dsh-boot-suites/gallery/README.md)。

## 它做什么

- **开屏动画**：进 DSH 桌面版时播一段由若干张图组成的动效（推镜 + 视差 + 球心圆徽）。
- **主题壁纸**：进去之后，聊天背后是同一套的主题图。一套主题 = 开屏画面 + 桌面壁纸 + 配色，
  **在悬浮球面板里选一次，两处一起换**（这不是两件事）。
- **轮播**：主题可按时间自动换（到点切下一套）；壁纸可在**当前这套**的几张图之间自动换，
  也可以点「下一张」手动换。
- **磨砂玻璃文本框**：聊天卡片底色是真正的 `backdrop-filter` 磨砂玻璃，颜色与雾感两个旋钮可调。
- **资源包可导入**：主题素材不在本仓库。用 `dsh-gallery-pack/tools/import-theme.py`
  把一套（或一个 zip 里的多套）导进 `%USERPROFILE%\.dsh\boot-naruto\arts\`，刷新面板即可见。

## 为什么两个包放一个仓库

它们绑在同一个契约上（套件的画面 URL 只能从开屏插件的清单里取，不许自己拼路径），
一次改动经常两边都动。合仓之后跨树引用是仓库内相对路径，`git log` 也能一次看到两边。

但**它们仍然是两次安装**：各自的 `package.json`、各自的 `cordis.patch.yml`、各自装进
`%USERPROFILE%\.dsh\profiles\desktop\node_modules\`。合仓不等于合体。

## 这个仓库里一个字节素材都没有

- 截至 2026-11-21：**媒体类 0**。复查：`git ls-files | grep -Ei '\.(png|jpe?g|webp|gif|mp4|psd|zip)$'` 应为空。
- 开屏分镜图**不内嵌**在 `client.js` 里，是运行时从 `%USERPROFILE%\.dsh\boot-naruto\arts\` 取；
  那些图连同各预设分镜、开机视频都在**私有素材包**里，另行投放，不进版本库。
  （11-14 时 `lib\client.js` 真的内嵌过 1.33 MB base64 JPEG，所以那时整目录禁止提交；
  这条前提已经失效，复核口径写在 [dsh-boot-gallery/.gitignore](dsh-boot-gallery/.gitignore) 顶部。）
- 2026-11-21 把原先内置的**角色专属调色（17 套）也移出了仓库**：主题现在从资源包导入，
  导入时未必带调色，缺了就走 `normalizePalette(null)` 的默认配色（并记一条 `palette-missing`）。
  要还原"每套一张脸"的配色，把 `palettes/auto/*.auto.json` 与 `palettes/tuned/*.json` 放回来即可。

## 发货闸门（顺序是死的）

在 `dsh-boot-suites/gallery/` 下：

```
node tools/build-client.mjs                  # 拼产物 + 断言产物里不许出现 exports.inject
node tools/selftest.mjs                      # 假 DOM 冒烟，必须 FAIL 0
node tools/install.mjs --profile desktop     # 只有上一步 exit=0 才允许跑
```

在 `dsh-boot-gallery/` 下：`node tools/selftest.mjs`（服务端）与 `node tools/selftest-client.mjs`（客户端）。

素材包侧还有两条：

```
python dsh-gallery-pack/tools/selftest-pack.py      # 交付物级自测
python dsh-gallery-pack/tools/check-glass.py        # 磨砂玻璃结构断言(backdrop-filter 只许在卡片上等)
```

⚠ 别把 `install` 用 `&&` 跟在会失败的 `selftest` 后面——本仓库出过一次事故，profile 里的包被写成了半套。

⚠ 改完**页面侧**套件可以热挂载 + `Ctrl+Shift+R` 生效；改**开屏侧** `lib/client.js` 必须**重启宿主**
才能生效（桌面版没有热重载 web 端口）。细节见 `dsh-boot-gallery/README.md`「已知边界」末段。

## 授权与版权边界

代码按 **BSD-3-Clause** 授权，全文见 [LICENSE](LICENSE)；两份 `package.json` 的 `license`
字段与之一致。三条边界要说在前头：

1. **本仓库不含任何第三方作品素材**，只含取素材的代码。
2. **导入的主题素材版权归各自作者所有**。导进本机私有目录自己用没问题，
   但**不要提交进本仓库**——那会把别人的图变成你需要负责的再分发。
3. **私有素材包是另一件事**：那份包只对熟人分发，且**禁止商用**——那条限制跟着素材包走，
   不约束本仓库里的代码。