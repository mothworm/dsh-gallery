# dsh-gallery —— DeepSeek Harness 开屏动画 + 主题壁纸（代码）

一个仓库、两个互相独立的插件。都是自研，都不依赖第三方插件。

| 目录 | 包名 | 半边 | 干什么 |
|---|---|---|---|
| `dsh-boot-gallery/` | `dsh-boot-gallery` | 宿主侧 | 开屏动画 + `/dsh-boot-gallery/*` 六条路由（预设清单、素材发图、mp4 分段、诊断落盘） |
| `dsh-boot-suites/gallery/` | `dsh-boot-suite-gallery` | 页面侧 | 悬浮球 + 壁纸面板 + 卡片排版配色 + 磨砂玻璃文本框 |

> **两份都要装。** 只装宿主侧没有面板，只装页面侧拿不到画面 URL——缺任何一边都等于没装。

两份 README 各管各的，互不重复：素材契约、mp4 规则、宿主路由清单在 `dsh-boot-gallery/README.md`，文本框那层的 CSS 约束在 `dsh-boot-suites/gallery/README.md`。

---

## 它做什么

**开屏动画**：进 DSH 桌面版时播一段由若干张图组成的动效（推镜 + 视差 + 球心圆徽）。

**主题壁纸**：进去之后，聊天背后是同一套的主题图。一套主题 = 开屏画面 + 桌面壁纸 + 配色，在悬浮球面板里选一次，两处一起换（这不是两件事）。

**轮播**：主题可按时间自动换（到点切下一套）；壁纸可在当前这套的几张图之间自动换，也可以点「下一张」手动换。

**磨砂玻璃文本框**：聊天卡片底色是真正的 `backdrop-filter` 磨砂玻璃（底面另有 SVG 噪声颗粒层），颜色与雾感两个旋钮可调。默认取向是磨砂亚克力——能看见背后的画，只是不锐利。

**自带三套主题**：清寒 / 暖秋 / 夜潮，随插件分发（`dsh-boot-suites/gallery/arts-builtin/`），装完就能用，不需要另外找素材。

**可以加自己的主题**：把主题目录放进 `~/.dsh/boot-naruto/arts/`（Windows 为 `%USERPROFILE%\.dsh\boot-naruto\arts\`），刷新面板即可见，不用改代码。目录契约与可验证的步骤见 **[添加主题素材包](docs/add-theme-pack.md)**。

> **路径写法**：下文用 `~/.dsh` 表示家目录下的 `.dsh`，Windows 下即 `%USERPROFILE%\.dsh`（PowerShell 里写 `$HOME\.dsh`）。插件读取路径用的是 `os.homedir()`，脚本自己处理，你不用改。

---

## 为什么两个包放一个仓库

它们绑在同一个契约上（套件的画面 URL 只能从开屏插件的清单里取，不许自己拼路径），一次改动经常两边都动。合仓之后跨树引用是仓库内相对路径，`git log` 也能一次看到两边。

但它们仍然是**两次安装**：各自的 `package.json`、各自的 `cordis.patch.yml`、各自装进 `~/.dsh/profiles/desktop/node_modules/`。合仓不等于合体。

---

## 仓库里的素材：只有我们自己画的三套

截至 2026-11-22：媒体类 **15 个**，全部在 `dsh-boot-suites/gallery/arts-builtin/`。复查：

```bash
git ls-files | grep -Ei '\.(png|jpe?g|webp|gif|mp4|psd|zip)$'
```

输出里只应出现 `arts-builtin/{scenery-cool,scenery-warm,scenery-dark}/` 下的文件。

为什么开这个口子：那三套是我们自己用 ComfyUI 生成的风景，不含任何他人角色或美术作品，随插件分发不涉及授权问题；而"装完插件就能用"是基本体验。

`.gitignore` 里的例外是**目录限定**的（`!/arts-builtin/`），不是 `!*.jpg`——后者会把参考图、截图稿、测试素材一起放进仓库。

开屏分镜图**不内嵌**在 `client.js` 里，是运行时从 `~/.dsh/boot-naruto/arts/` 按目录读取的。所以：想加主题就放素材进去，代码一行都不用改。其它主题由使用者自行准备，本仓库不分发（详见 [添加主题素材包](docs/add-theme-pack.md)）。

主题不依赖调色文件：没有调色就走 `normalizePalette(null)` 的默认配色，并在 `boot.log` 里记一条 `palette-missing`（**正常现象，不是错误**）。

---

## 发货闸门（顺序是死的）

### 装之前要有

| 前提 | 说明 |
|---|---|
| DSH 桌面版 | 先启动过一次，这样 `~/.dsh/profiles/desktop/` 才会存在（脚本不替你创建 profile） |
| Node.js ≥ 20 | 两个 `install.mjs` 都是 Node 脚本。`node -v` 报 `command not found` 就先装：macOS `brew install node`、Windows 用官方 installer 或 `winget install OpenJS.NodeJS.LTS` |
| 终端 | Windows 用 PowerShell / Git Bash 都行；路径里的 `~` 在 PowerShell 里写成 `$HOME` |

> 2026-11-22 在 macOS（Apple Silicon）上实测：这台机器一开始就没装 node，第一条命令直接 `zsh: command not found: node`。所以把它写进前提，别让下一个人也卡在这。

### 平台差异（只有这几处不一样，安装命令本身是一致的）

| 事情 | macOS | Windows |
|---|---|---|
| 装 Node | `brew install node` | `winget install OpenJS.NodeJS.LTS` 或官网 installer |
| 家目录写法 | `~/.dsh` | `%USERPROFILE%\.dsh`（PowerShell 里写 `$HOME\.dsh`） |
| 硬刷新页面 | `Cmd + Shift + R` | `Ctrl + Shift + R` |
| 装完生效 | 宿主侧热挂载，改 `lib/client.js` 要重载页面 | 同左 |
| 实机验证 | ✅ macOS（Sequoia 15.6 / Apple Silicon，2026-11-22） | ✅ Windows（作者本机，装插件 + 素材包流程） |

只有"装 Node"这一步两边命令不同；下面两条安装命令在两边完全一样，所以这份 README 不拆成两份——拆了必然有一份会忘记同步。

---

## 装（两条命令）

```bash
git clone https://github.com/mothworm/dsh-gallery.git
cd dsh-gallery

# 1. 宿主侧：开屏动画（宿主侧代码要重启 DSH 才生效）
node dsh-boot-gallery/tools/install.mjs --profile desktop

# 2. 页面侧：悬浮球 + 壁纸面板 + 磨砂玻璃
#    这一步会顺带把自带的三套风景装进 ~/.dsh/boot-naruto/arts/
#    （2026-11-22 修：以前只拷进 node_modules，arts/ 是空的 ⇒ 预设 0 套 ⇒ 开屏退化成黑屏兜底）
node dsh-boot-suites/gallery/tools/install.mjs --profile desktop
```

两个脚本都会：校验源文件 → 备份 profile 的 `cordis.patch.yml` → 复制并逐文件核摘要 → 确保 patch 里有对应条目（已有就不重复追加）。

第二条末尾还会自动跑一次 `dsh-boot-suites/gallery/tools/install-arts.mjs`，把仓库自带的三套风景（清寒 / 暖秋 / 夜潮）拷进 `~/.dsh/boot-naruto/arts/`——那是宿主真正读素材的地方，不拷过去面板里就是 0 套、开屏会退化成黑屏兜底。想手动补跑：

```bash
node dsh-boot-suites/gallery/tools/install-arts.mjs
```

> 不想要这三套图的人加 `--no-arts` 跳过（代价是开屏会走黑屏兜底，直到你自己放素材进去）。

**不需要编译**：`lib/client.js` 等构建产物已随仓库提供。只有改 `parts/` 源码的人才需要重建。

装完**重启 DSH**，应该能看到开屏动画；进桌面后点悬浮球换主题。自带三套风景开箱即用，加自己的主题见 [添加主题素材包](docs/add-theme-pack.md)。

macOS / Linux 上同样两条命令（`--profile desktop` 保持不变）。✅ 2026-11-22 在 macOS（Apple Silicon，DSH 桌面版）上跑通了完整安装链路。

> ⚠ macOS 上宿主/页面插件都是热挂载的，但改了 `lib/client.js` 之后要重载一次页面才生效——桌面版没有 View → Reload 菜单，`Cmd+R` 也不一定绑得上，最稳的是**重启应用**。
>
> ⚠ 若你的 DSH 版本聊天节点结构不同（控制台出现 `card-target-missing`），把 `dsh-boot-suites/gallery/data/surfaces.json` 里的 `card` / `cardKinds` 选择器按实际 DOM 改即可，不用动代码。

---

## 改代码者的自检闸门（改完再装）

在 `dsh-boot-suites/gallery/` 下：

```bash
node tools/build-client.mjs                  # 拼产物 + 断言产物里不许出现 exports.inject
node tools/selftest.mjs                      # 假 DOM 冒烟，必须 FAIL 0
node tools/install.mjs --profile desktop     # 只有上一步 exit=0 才允许跑
```

在 `dsh-boot-gallery/` 下：

```bash
node tools/selftest.mjs          # 服务端
node tools/selftest-client.mjs   # 客户端
node tools/install.mjs --profile desktop
```

素材包侧还有两条：

```bash
python dsh-gallery-pack/tools/selftest-pack.py    # 交付物级自测
python dsh-gallery-pack/tools/check-glass.py      # 磨砂玻璃结构断言（backdrop-filter 只许在卡片上等）
```

> ⚠ **别把 install 用 `&&` 跟在会失败的 selftest 后面**——本仓库出过一次事故，profile 里的包被写成了半套。

改完页面侧套件可以热挂载 + `Ctrl+Shift+R` 生效；改开屏侧 `lib/client.js` **必须重启宿主**才能生效（桌面版没有热重载 web 端口）。细节见 `dsh-boot-gallery/README.md`「已知边界」末段。

---

## 授权与版权边界

代码按 **BSD-3-Clause** 授权，全文见 [LICENSE](LICENSE)；两份 `package.json` 的 `license` 字段与之一致。

三条边界要说在前头：

1. **本仓库不含任何第三方作品素材**，只含取素材的代码，外加三套自画风景。
2. **你导入的主题素材版权归各自作者所有。** 放本机自己用没问题，但不要提交进本仓库——那会把别人的图变成你需要负责的再分发。
3. 本项目与 DeepSeek Harness 官方、与任何第三方作品都没有赞助或背书关系。

---

## 常见问题

**装完开屏是黑的 / 只有一个红圈？**
`arts/` 是空的（或没有可用素材）。跑一遍 `node dsh-boot-suites/gallery/tools/install-arts.mjs`，或自己放一套主题进去。

**面板里写着「共 0 套」？**
同上——宿主读的是 `~/.dsh/boot-naruto/arts/`，不是 `node_modules` 里的那份。

**点了「立刻重播开机」没反应？**
先确认当前主题里确实有可播放的开机素材（视频 / 图片序列），再硬刷新页面一次。

**`boot.log` 里有 `palette-missing`**
正常现象：这套主题没带调色文件，用了默认配色。

**装两遍会不会重复？**
不会。脚本逐文件核摘要，已存在的直接跳过。
