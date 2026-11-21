# dsh-boot-gallery

DeepSeek Harness 的**开屏动画插件**（通用主题系统）。**自研，不依赖任何第三方插件。**

它本身**不绑定任何特定作品**：开机播什么，完全由 `~/.dsh/boot-naruto/arts/<预设>/` 里的素材决定。
随插件分发的只有三套自画风景（清寒 / 暖秋 / 夜潮）；其余主题（含任何第三方作品主题）
由使用者自行导入素材包，不在本仓库。

> 本文件里的示例、测试夹具与历史注释中会出现早期使用的某部作品的角色名 ——
> 那是**开发过程留痕**，不是本插件的内容主张。插件对外只承诺"一个通用的开屏 + 主题框架"。

## 它做什么

打开 DSH(一次应用启动 = 一个标签页)时铺满窗口播一段约 7.5 秒的片头:

```
晓云纹起势 → 小南(晓袍红云) → 鼬(噤声/写轮眼) → 纸翼展开 → 月球星空 → 能量球白闪
→ 斑 ⊕ 柱间 斜切对撞 → 双写轮眼·宇智波家徽 → 千鸟 × 紫炎 + 标题
```

- **点画面任意处** 或 **Esc** = 立即跳过(退场是"虚化淡出",不是硬切)
- **Ctrl+Alt+B** = 强制重播一次(调试用,不用重启)
- 系统开了「减少动态效果」(`prefers-reduced-motion`)时直接不播
- 分镜时长/顺序都在 `lib/client.js` 顶部的 `TIMELINE` 与 `SPEED` 常量里;改源文件 `src/client.src.js` 后用 `node tools/build-client.mjs` 重新生成

## 主题预设(preset)—— 一个预设只用一个素材文件夹

动画按主题分成「预设」。每个预设是 `~\.dsh\boot-naruto\arts\<preset>\` **一个文件夹**,里面
只放这个主题自己的 `preset.json` + 图。**一个预设只用一个文件夹的图**,不跨文件夹混用。

```
C:\Users\<你>\.dsh\boot-naruto\arts\
└── konan\
    ├── preset.json     ← 分镜表(契约见下)
    ├── 01.jpg          ← 只能 .jpg/.jpeg/.png/.webp
    └── 02.jpg
```

### 优先级与降级(硬要求)

```
arts\<preset>\preset.json 里写了 "clip" 且 clips\ 真有那一段(且 faststart)  →  播这一段的视频(11-19 新增)
        ↓ 没点名 / 找不到那段 / 没做 faststart
arts\<preset>\ 里有可播预设  →  播那个预设自己的 acts
        ↓ 任何一步坏(网络 / 404 / JSON 坏 / schema≠1 / acts 空 / 图不在白名单)
内置 9 幕:走本插件自己的 /dsh-boot-gallery/frames/NN.jpg 路由(仍是本机,不外连)
```

- **视频改成"由预设点名"**(`dsh-boot-gallery\lib\client.js` 的 `const VIDEO_GLOBAL = false`)。
  旧语义"目录里有 mp4 就抢占所有预设"仍然保留,把 `VIDEO_GLOBAL` 改成 `true` 即可 —— 但两者**只能选一个**:
  开了全局,就没有"其它预设逐帧照旧"。默认选**点名**,因为用户 11-19 要求"只有永夜·扉间用视频"。
- 点名了却没找到那段 ⇒ **照旧播该预设的图**,并单独 `report({mode:'clip-miss'})`,不静默换内容。
- `clip` 是**未知键**,老宿主(`presetEntry` 只硬校验 `schema`/`acts`)与老客户端会安静忽略 ⇒ 同一份素材包新老通吃。
- 上面这些改动跑在**开屏 webview**里,**必须重启宿主**才生效;套件侧的热挂载管不到它。
- ⚠ 旧版这里写的是「把 `src/client.src.js` 里的 `PRESET_OVER_VIDEO` 改成 `true` 重新生成」——**两个都不成立了**:
  那个常量已删,而本包**根本没有 `src\` 目录**(只有 `lib\client.js` + `lib\index.js`,直接改直接装)。
  私有包里那份 `dsh-gallery-pack\dsh-boot-gallery\src\client.src.js` 是**更早血脉的残留**,别拿它当真源。

### 预设 JSON 契约(schema 1)

```json
{ "schema": 1, "id": "konan", "title": "晓·小南",
  "open": "akatsuki-cloud",
  "acts": [
    { "file": "01.jpg", "dur": 1250, "pos": "62% 22%",
      "z0": 1.16, "z": 1.05, "kb": ["4% 5%", "-4% -4%"],
      "pupil": "50% 24%", "flash": false }
  ],
  "title": "晓 · 小南", "sub": "AKATSUKI · DSH 开屏动画" }
```

| 字段 | 规则 | 非法时的行为 |
|---|---|---|
| `schema` | 必须 `=== 1` | 整个预设当坏数据 → 回落内置 |
| `id` | `^[a-z0-9][a-z0-9_-]{0,63}$`(**小写**,和目录名一致) | 目录不进清单 |
| `open` | `"akatsuki-cloud"` 或 `"none"` | 缺省/别的 → 按 `akatsuki-cloud` |
| `acts` | 数组,非空;**最多 8 幕**,第 9 幕起忽略 | 空/非数组 → 回落内置 |
| `acts[].file` | 白名单位图扩展名,单层文件名,不许 `..`/斜杠 | 这一幕被丢掉 |
| `acts[].dur` | 120–8000 ms | 回默认 **900**(不会拿 0 顶上) |
| `acts[].pos` / `pupil` | `"62% 22%"` 两个百分数 | 回默认 `50% 50%` / 不画瞳环 |
| `acts[].z0` / `z` | 0.2–4 的数 | 回默认 `1.075` / `1` |
| `acts[].kb` | 两条 `"x y"` 位移(`%|px|vw|vh|em|rem`) | 回默认 `["0% 0%","0% 0%"]` |
| `acts[].flash` | 只有布尔 `true` 算 | 字符串 `"yes"` 不算 |
| 顶层 `title`/`sub` | 落在**最后一幕**的片名(也可以写在某个 act 上,act 优先) | 超长截断 |

⚠️ 契约样例里 `title` 出现了两次(顶层 + 片尾),`JSON.parse` 的语义是**后一个赢**,所以清单里的
`title` 会是片尾那个。生成素材时只写一次,别依赖这个巧合。

预设的 `acts[]` 只复用内置 `TIMELINE` 的**一个子集**:`dur/pos/kb/z0/z/pupil/flash`(外加 `file` 对应内
置的 `src`);`kind` 由浏览器固定成 `"img"`(`open` 决定要不要额外插一幕 `kind:"cloud"`),`duel` 那种
左右对撞**不在预设契约里**,内置终幕仍然有它。渲染走的还是同一套 `imgLayer()` 与 CSS
`@keyframes nbn-kb`(`--z0/--z/--k0..--k3`),新预设没有另发明一套字段。

### 宿主路由(6 条)

| 路由 | kind | 作用 |
|---|---|---|
| `/dsh-boot-gallery/clips.json` | exact | mp4 片库(GET)/选择(POST)——**语义未改** |
| `/dsh-boot-gallery/media` | prefix | mp4 字节 ——**语义未改** |
| `/dsh-boot-gallery/presets.json` | exact | **新**:预设清单(GET)/写预设选择(POST `{"preset":"konan"}`) |
| `/dsh-boot-gallery/arts` | prefix | **新**:服务 `arts/<预设>/<文件>`,preset.json + 白名单位图 |
| `/dsh-boot-gallery/report` | exact | 浏览器侧诊断落 `boot.log` ——**语义未改** |
| `/dsh-boot-gallery/status.json` | exact | 状态 ——**语义未改** |

`/arts` 与 `/media` 同一套不变量:`Range`→206/416、成功 `no-cache`+ETag、只有查询串 `?v=` 等于
**该文件自己的** version 才发 `immutable`、失败一律 `no-store`、扩展名白名单之外一律 404。
名字净化:预设 id 只许 `[a-z0-9_-]`,文件名只许单个段 + 白名单扩展名(`preset.json` 是唯一放行的
非位图名);请求名先净化、再映射到 `readdirSync` 出来的磁盘真名,所以 `..%2f`、`..\`、绝对路径
全都到不了 `join()`。查找大小写不敏感(Windows 文件系统如此),但清单公布的 `id` 一律小写。

清单里每个预设都带 `files:[{name,version,url}]`,浏览器用它给每张图拼 `?v=`;拿不到 version
就干脆不带 `?v=`(退化成 `no-cache`),**绝不错发 immutable**。
- ⚠ **但"`files[]` 一定填得满"只对真预设成立**。`presetEntry` 第一步就要求目录里有 `preset.json`
  (`lib\index.js:221-222`),没有就 `ok:false / error:"缺 preset.json" / files:[] / url:""` **直接返回**,
  那段"扫目录填 files"的代码在它**后面**。资源包里的共享素材目录 `arts\ui\`(五遁配饰底框)故意不放
  `preset.json`,所以它的清单条目就是空的 —— 这是**特性**:`ok:false` 让开屏选单和"没选择就取清单第一个"
  的兜底都自动跳过它(`lib\client.js:151/597`),它不会变成一个叫 `ui` 的可笑主题。
  代价是**消费方不能只信清单**:套件的 `frameUrl` 会退回"从宿主自己给的 `/arts/` URL 切前缀再拼文件名",
  并且**要求 `ui` 条目存在**(目录真在)才敢拼 —— 详见 `dsh-boot-suites\naruto\tools\fixtures\FIXTURE-README.md`。

### 浏览器侧 API

```js
window.__dshBootGallery = { version, play, skip, timeline,
  active,        // 本次真正在播的那套(预设或内置)
  presets(),     // → Promise<清单数组>(拿不到就是空数组,永不 reject)
  usePreset(id, playNow),  // POST 选择,下次启动生效;playNow 为真则立刻重播一次
  normalizePreset(doc, item) }  // 调试:坏数据回 null
```

## 装

```
node dsh-gallery-pack\tools\install.mjs --profile desktop     # 或 --profile web
```

脚本会先备份 `cordis.patch.yml` 与 `package.json`,再复制包、追加 insert,并校验**配置层字节只增不减**。装完**必须重启**(bundle 层在启动时装配),然后 **Ctrl+Shift+R** 硬刷新(宿主给客户端 bundle 发 `immutable`)。

## 想换成自己的片子(mp4 接口)

**2026-11-19 起改成"由预设点名"**:光把视频丢进目录**不再抢占所有预设**(默认 `VIDEO_GLOBAL = false`)。
要让某一套开机画面用视频,两步:

1. 片源丢进 `C:\Users\<你>\.dsh\boot-naruto\clips\`;
2. 在那一套的 `arts\<preset>\preset.json` 里加一个键:`"clip": "<目录里的真文件名>"`。
   中文名可以(`safeName` 允许 CJK),但必须**逐字一致——这一处区分大小写**,写错就当没点名。
   - ⚠ **但「·」(U+00B7 间隔号) 和空格会被拒**:实测白名单是 `/^[A-Za-z0-9_.一-龥-]+$/`(`lib\index.js:80`)。
     `·` 不在里面 ⇒ `/media` 那一跳答 `400 bad clip name` ⇒ `<video>` error ⇒ `playVideo` 直接 `finish()`
     ⇒ **开机画面闪一下就进桌面,`boot.log` 一句错误都没有**。火影主题名里全是这个点号(「永夜 · 扉间」),
     所以**片源一律用预设 id 的 ASCII 名**:`"clip": "tobirama-night.mp4"`。上面那句"中文名可以"要连着这条一起读。

没点名的预设**逐帧照旧**走自己的图片分镜;将来新建任何主题/开机画面想上视频,同样只加这一行,代码不用再改。

- 扩展名:`.mp4 .m4v .webm .mov .mkv`(建议只用 H.264 + `yuv420p` 的 mp4)
- **必须 faststart**(`moov` 排在 `mdat` 之前),否则那一段**根本不会被选中**:尾部索引会先黑屏到看门狗超时
  ```
  ffmpeg -i in.mp4 -c copy -movflags +faststart out.mp4
  ```
- 只播**一段**,**不支持连播多个片段**(v1 明确不做,先在别的工具里剪成一段)。
- 点了名却没找到那段、或它没做 faststart ⇒ **照旧播该预设的图**,并且单独往 `boot.log` 写一条 `mode=clip-miss`,不静默换内容。
- 想回老语义(目录里有片就全局播、`selectedClip` 为 null 时自动挑 mtime 最新那段):把 `lib\client.js` 的 `VIDEO_GLOBAL` 改成 `true`。
  老语义下仍可用 `POST` 指定哪一段:
  ```
  curl -X POST http://127.0.0.1:<端口>/dsh-boot-gallery/clips.json -d "{\"selectedClip\":\"out.mp4\"}"
  ```
  选择写在 `~\.dsh\boot-naruto\selection.json`(原子写 + 损坏自愈;**不存 localStorage**,因为换端口就丢)
- ⚠ 上面这段判断跑在**开屏 webview**里,**改完必须重启宿主**才生效;套件侧热挂载管不到它。

## 排查

- `GET /dsh-boot-gallery/status.json` → 片源目录、找到几段、当前选择
- `GET /dsh-boot-gallery/clips.json` → 片库(空数组 = 回落到**内置九幕**;那九张图是运行时从 `~\.dsh\boot-naruto\frames\` 取的,见「素材与版权」,**不是内嵌**)
- `GET /dsh-boot-gallery/presets.json` → 预设清单:每个预设的 `ok/acts/bytes/mtime/files[]`;
  **不合格的不删,而是带 `ok:false` + `error:"为什么"`**,所以"为什么我的预设没播"先看这个字段
- `GET /dsh-boot-gallery/arts/<预设>/preset.json` → 宿主实际看到的那份分镜表
- `~\.dsh\boot-naruto\boot.log` → 每次播了什么(`mode=preset|builtin|video preset=<id> acts=<n>`),
  以及被跳过的预设目录;**桌面版没控制台,这是唯一能看的证据**
- 控制台前缀 `[dsh-boot-gallery]`;`window.__dshBootGallery.play()/.skip()/.timeline/.presets()/.usePreset()`

## 素材与版权

**本包代码里一个字节素材都没有**(11-20 复核:`lib\client.js` 45,860 B,`data:image/(jpeg|png|webp)`
命中 0)。内置九幕的分镜图由宿主在运行时从 `~\.dsh\boot-naruto\frames\NN.jpg` 发,那九个文件由
**私有素材包**投放(包里 `frames/` 9 条 / 1,395,945 B),不在代码树里。
⚠ 本文件旧版写的"内嵌的是压缩后的 JPEG"**已经过期**:11-14 时确实内嵌过 ≈1.33 MB base64
(所以那时 `.gitignore` 禁整目录提交),后来改成走 `/frames/` 路由,禁令的理由随之消失。

分镜原图取自作者自备的《火影忍者》手游壁纸目录(各人本机路径不同,不写在这里)。
角色「晓/宇智波斑/千手柱间/宇智波鼬/宇智波佐助/日向雏田/舍人」版权归 MIZUKI SHOUNEN 事务所 /
岸本齐史·集英社、游戏形象版权属《火影忍者》手游运营方。

授权分两层,别混:

- **代码**:BSD-3-Clause,全文见仓库根 [`../LICENSE`](../LICENSE)(与本包 `package.json` 的
  `license` 字段一致)。对代码的授权**不构成**对上述形象的任何授权。
- **素材包**:不随代码分发、只对熟人投放,且**禁止商用**。那条限制跟着素材包走。

## 已知边界

- 覆盖范围是 **DSH 客户端窗口**,不是操作系统屏幕;`z-index:2147483000` 压不过别的插件里更高的浮层。
- 顶部「跳过」提示同时给了 `env(titlebar-area-height)` 与 Esc 两条退路:窗口按钮是原生命中测试,任何 z-index 都压不过它。
- 客户端 bundle **禁止**出现静态 `exports.inject`,也禁止 `const inject = [...]` —— 宿主加载器对没激活的条目是直接抛的("web boot: N entries did not activate"),整个 GUI 会起不来。`tools/build-client.mjs` 每次生成都会断言这两条。
- 预设的**素材质量**不归本插件:宿主只校验 `schema`、`acts` 非空、文件在白名单里且真的存在;图对不对、好不好看由生成素材的一方负责。
- 「一个预设只用一个文件夹」是硬约束:浏览器只会拼 `/arts/<当前预设>/` 这一个前缀,**没有**跨预设混图的能力,这是故意的。
- 预设图片走 HTTP,不像内置那样零网络:第一次播要现下图(已做 `new Image()` 预载;`?v=` 对上才 `immutable`)。宿主没起来 / 断网 → 自动落回内置 9 幕。
- 离线自测覆盖逻辑与契约(`tools/selftest.mjs` + `tools/selftest-client.mjs`),**不等于**画面正确;
  画面正确只认 `boot.log` 里的真机报告(见下面两条)。
- **已对运行中的宿主验过的**（2026-11-19，桌面版 profile）：`/presets.json` 的 `ui` 条目形状（`ok:false/files:[]`）、
  `/arts/ui/frame-katon.png` → `200 image/png`、`/clips.json` 认出片源且 `faststart:true`、
  `/media/<片源>` → 200 与 `Range` 头段/中段都答 **206 + `Accept-Ranges: bytes`**、
  以及 `preset.json` 三种 `?v=` 的缓存头（裸→`no-cache`、对上→`immutable`、错/空→`no-cache`）。
  最后一条顺带证伪了我自己一度写下的"清单公布的 URL 自己会 404"——那是我把 `p['url']`（**自带** `/dsh-boot-gallery` 前缀）
  又拼了一次 base 造成的**双前缀**，不是宿主的问题。**教训：断定一条 URL 坏了之前，先把实际发出去的 URL 打印出来。**
  👉 **这些 GET 不用重启宿主、不用刷页面**，是本项目里最快发现"清单字段其实不存在"这类 bug 的手段
  （本轮那个"底框在真机永远 `frame=0`"就是这么抓到的，比读代码可靠）。
- **真机验收进度（2026-11-20 06:16 重启宿主之后，进程 StartTime 同日 06:16:02，证据全在 `boot.log`）**：
  - ✅ **探针戳 `b=b1931` 出现了**：`client contrast=mount b=b1931 ran=1 examined=15 …` 与
    `client contrast=dom b=b1931 ran=2 …` ⇒ 页面吃的就是磁盘上那份新 bundle，不再是"进程启动时装进内存的旧代码"。
  - ✅ **开屏真的在播视频**：`client … mode=video clips=1 clip=tobirama-night.mp4 preset=tobirama-night acts=1 force=false`
    ⇒ "由预设点名"这条语义在真机开屏 webview 里成立（此前只有离线自测撑着）。
  - ⏳ **仍未验**：五遁**底框的真机绘制** —— 要一条 `deco=<遁> frame=1` 的报告才算。
    日志目前只有 `deco=none frame=0`，那一句只证明探针在跑，**不证明图画出来了**；
    而 `frame=0` 配 `deco≠none` 的常见病根是 PNG 没进 `arts\ui\` 或文件名对不上（大小写除外）。
  - 为什么这两条**光刷页面验不到、必须重启宿主**（11-19 的实测证据链，留档免得下次重推）：
    当时装机 `client.js` 是当天 01:34 那份，而 23:06 的开机报告形如 `mode=preset clips=-1 preset=`——
    `preset` 为空在当前代码里**只可能**出现在 `video`/`builtin` 分支，`preset` 分支必带 id，
    所以那条报告不可能由磁盘上那份代码发出 ⇒ 页面当时吃的仍是**进程启动时载入内存的旧 bundle**。
  - 离线自测全绿（**boot 服务端 110 项 / boot 客户端 94 项 / 套件 341 断言**，均 `FAIL 0`；11-20 复跑确认）
    **不等于**画面正确。
