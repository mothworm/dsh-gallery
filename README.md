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
- **磨砂玻璃文本框**：聊天卡片底色是真正的 `backdrop-filter` 磨砂玻璃（底面另有 SVG 噪声颗粒层），
  颜色与雾感两个旋钮可调。默认取向是**磨砂亚克力**——能看见背后的画，只是不锐利。
- **自带三套主题**：清寒 / 暖秋 / 夜潮，随插件分发（`dsh-boot-suites/gallery/arts-builtin/`），
  **装完就能用**，不需要另外找素材。
- **可以加自己的主题**：把主题目录放进 `%USERPROFILE%\.dsh\boot-naruto\arts\`，
  刷新面板即可见，不用改代码。目录契约与可验证的步骤见
  [添加主题素材包](dsh-gallery-pack/tools/添加主题素材包.md)。

## 为什么两个包放一个仓库

它们绑在同一个契约上（套件的画面 URL 只能从开屏插件的清单里取，不许自己拼路径），
一次改动经常两边都动。合仓之后跨树引用是仓库内相对路径，`git log` 也能一次看到两边。

但**它们仍然是两次安装**：各自的 `package.json`、各自的 `cordis.patch.yml`、各自装进
`%USERPROFILE%\.dsh\profiles\desktop\node_modules\`。合仓不等于合体。

## 仓库里的素材：只有我们自己画的三套

- 截至 2026-11-22：**媒体类 15 个，全部在 `dsh-boot-suites/gallery/arts-builtin/`**。
  复查：`git ls-files | grep -Ei '\.(png|jpe?g|webp|gif|mp4|psd|zip)$'`，
  输出里只应出现 `arts-builtin/{scenery-cool,scenery-warm,scenery-dark}/` 下的文件。
- 为什么开这个口子：那三套是**我们自己用 ComfyUI 生成的风景**，不含任何他人角色或美术作品，
  随插件分发不涉及授权问题；而"装完插件就能用"是基本体验。
  `.gitignore` 里的例外是**目录限定**的（`!/arts-builtin/`），**不是** `!*.jpg` ——
  后者会把参考图、截图稿、测试素材一起放进仓库。
- **开屏分镜图不内嵌在 `client.js` 里**，是运行时从 `%USERPROFILE%\.dsh\boot-naruto\arts\`
  按目录读取的。所以：想加主题就放素材进去，代码一行都不用改。
  其它主题由使用者自行准备，本仓库不分发（详见
  [添加主题素材包](dsh-gallery-pack/tools/添加主题素材包.md)）。
- 主题**不依赖调色文件**：没有调色就走 `normalizePalette(null)` 的默认配色，
  并在 `boot.log` 里记一条 `palette-missing`（正常现象，不是错误）。

## 发货闸门（顺序是死的）

## 装（两步，各一条命令）

```bash
git clone https://github.com/mothworm/dsh-gallery.git
cd dsh-gallery

# 1. 宿主侧：开屏动画（装完要**重启** DSH 才生效）
node dsh-boot-gallery/tools/install.mjs --profile desktop

# 2. 页面侧：悬浮球 + 壁纸面板 + 磨砂玻璃（刷新即可）
node dsh-boot-suites/gallery/tools/install.mjs --profile desktop
```

两个脚本都会：校验源文件 → 备份 profile 的 `cordis.patch.yml` → 复制并**逐文件核摘要** →
确保 patch 里有对应条目（已有就不重复追加）。

**不需要编译**：`lib/client.js` 等构建产物已随仓库提供。只有改 `parts/` 源码的人才需要重建。

装完重启 DSH，应该能看到开屏动画；进桌面后点悬浮球换主题。
自带三套风景开箱即用，加自己的主题见
[添加主题素材包](dsh-gallery-pack/tools/添加主题素材包.md)。

> macOS / Linux 上同样两条命令（把 `--profile desktop` 保持不变）。
> ⚠ 本仓库在 **Windows 上验证过**；macOS 未经实机验证，遇到报错请开 issue。

## 发货闸门（改代码的人看）

在 `dsh-boot-suites/gallery/` 下：

```
node tools/build-client.mjs                  # 拼产物 + 断言产物里不许出现 exports.inject
node tools/selftest.mjs                      # 假 DOM 冒烟，必须 FAIL 0
node tools/install.mjs --profile desktop     # 只有上一步 exit=0 才允许跑
```

在 `dsh-boot-gallery/` 下：`node tools/selftest.mjs`（服务端）、`node tools/selftest-client.mjs`（客户端）、
`node tools/install.mjs --profile desktop`（安装）。

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

1. **本仓库不含任何第三方作品素材**，只含取素材的代码，外加三套自画风景。
2. **你导入的主题素材版权归各自作者所有**。放本机自己用没问题，
   但**不要提交进本仓库**——那会把别人的图变成你需要负责的再分发。
3. **本项目与 DeepSeek Harness 官方、与任何第三方作品都没有赞助或背书关系。**