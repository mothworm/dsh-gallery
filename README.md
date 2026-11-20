# dsh-naruto —— DeepSeek Harness 火影主题（代码）

一个仓库、**两个互相独立的插件**。都是自研，都不依赖第三方插件。

| 目录 | 包名 | 半边 | 干什么 |
|---|---|---|---|
| [`dsh-boot-naruto/`](dsh-boot-naruto/) | `dsh-boot-naruto` | **宿主侧** | 开屏动画 + `/dsh-boot-naruto/*` 六条路由（预设清单、素材发图、mp4 分段、诊断落盘） |
| [`dsh-boot-suites/naruto/`](dsh-boot-suites/naruto/) | `dsh-boot-suite-naruto` | **页面侧** | 悬浮球 + 环形选单 + 卡片排版配色 + 文字底框（配饰：五遁） |

两份 README 各管各的，**互不重复**；素材契约、mp4 规则、宿主路由清单在
[dsh-boot-naruto/README.md](dsh-boot-naruto/README.md)，底框那层的 CSS 约束在
[dsh-boot-suites/naruto/README.md](dsh-boot-suites/naruto/README.md)。

## 为什么两个包放一个仓库

它们绑在同一个契约上（套件的画面 URL 只能从开屏插件的清单里取，不许自己拼路径），
一次改动经常两边都动。合仓之后跨树引用是仓库内相对路径，`git log` 也能一次看到两边。

但**它们仍然是两次安装**：各自的 `package.json`、各自的 `cordis.patch.yml`、各自装进
`%USERPROFILE%\.dsh\profiles\desktop\node_modules\`。合仓不等于合体。

## 这个仓库里一个字节素材都没有

- 截至 2026-11-20：**69 个文件 / 媒体类 0**（`dsh-boot-naruto` 11 + `dsh-boot-suites` 58）。
- 内置九幕的分镜图**不内嵌**在 `client.js` 里，是运行时从 `%USERPROFILE%\.dsh\boot-naruto\frames\` 取；
  那九张图连同各预设分镜、五遁底框、开机视频都在**私有素材包**里，另行投放，不进版本库。
  （11-14 时 `lib\client.js` 真的内嵌过 1.33 MB base64 JPEG，所以那时整目录禁止提交；
  这条前提已经失效，复核口径写在 [dsh-boot-naruto/.gitignore](dsh-boot-naruto/.gitignore) 顶部。）
- 复查命令与口径：[「素材分离」一节](dsh-boot-suites/naruto/README.md#素材分离这个包为什么可以开源)。

## 发货闸门（顺序是死的）

在 `dsh-boot-suites/naruto/` 下：

```
node tools/build-client.mjs                  # 拼产物 + 断言产物里不许出现 exports.inject
node tools/selftest.mjs                      # 假 DOM 冒烟，必须 FAIL 0
node tools/install.mjs --profile desktop     # 只有上一步 exit=0 才允许跑
```

在 `dsh-boot-naruto/` 下：`node tools/selftest.mjs`（服务端）与 `node tools/selftest-client.mjs`（客户端）。

⚠ 别把 `install` 用 `&&` 跟在会失败的 `selftest` 后面——本仓库出过一次事故，profile 里的包被写成了半套。

⚠ 改完**页面侧**套件可以热挂载 + `Ctrl+Shift+R` 生效；改**开屏侧** `lib/client.js` 必须**重启宿主**
（bundle 随宿主进程启动载入内存，刷页面无效）。这条判据的证据链见
`dsh-boot-naruto/README.md`「已知边界」末段。

## ⚠ 仓库根 ≠ 工作区根

这个 `.git` 就放在工作区根上，但用的是**白名单**跟踪（见 [.gitignore](.gitignore)）：
只有上面那两棵树，加上仓库根的 `.gitignore` / `.gitattributes` / `README.md` / `LICENSE`
四份元文件，属于本仓库；工作区里其余十几个不相干目录一律不跟踪。
所以在这里 `git add -A` 是安全的，但也**别指望**它帮你管别的项目——那些要各自开仓库。

## 授权与版权边界

代码按 **BSD-3-Clause** 授权，全文见 [LICENSE](LICENSE)；两份 `package.json` 的 `license`
字段与之一致。三条边界要说在前头：

1. **本仓库不含任何《火影忍者》素材**，只含取素材的代码。
2. **作品名称、角色形象（晓 / 宇智波斑 / 千手柱间 / 宇智波鼬 / 日向雏田 …）版权归各自权利人**
   （原作 © 岸本齐史·集英社 / MIZUKI SHOUNEN 事务所；游戏形象 © 《火影忍者》手游运营方）。
   对代码的授权**不构成**对这些形象的任何授权。
3. **私有素材包是另一件事**：那份包只对熟人分发，且**禁止商用**——那条限制跟着素材包走，
   不约束本仓库里的代码。
