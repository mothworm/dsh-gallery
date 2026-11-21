# dsh-boot-suite-gallery

DeepSeek Harness 桌面版的**页面侧主题套件**：悬浮球 + 环形选单 + 卡片排版/配色 + 文字底框（配饰）层。
它和**开屏动画插件** `dsh-boot-gallery`（宿主侧，管 `/dsh-boot-gallery/*` 路由与素材目录）是**两个包**，
配合使用但各自独立；素材契约、mp4 规则、宿主路由清单都在那边那份 README 里，本文件不重复。

> 本文件的定位：**给"拿到代码、准备自己改"的人（和他们的 agent）看的**。
> 第三方主题素材**不在这个仓库里**，也不该进；见下面「素材分离」。

## 目录

```
parts\      20/30/40/50/60/70/90-*.part.js  ← 唯一真源，按编号拼成产物
lib\        client.js                        ← 生成物，别手改（改了一跑 build 就没了）
data\       面板/文案等非调色数据
palettes\   每套配色的 JSON
tools\      build-client.mjs / selftest.mjs / install.mjs / fixtures\
tune-batch.mjs  批量调色的开发脚本（不参与发货）
```

## 发货闸门（顺序是死的）

```
node tools\build-client.mjs      # 拼产物，并断言产物里不许出现静态 exports.inject / const inject=[...]
node tools\selftest.mjs          # 假 DOM 冒烟，必须看到 "FAIL 0"
node tools\install.mjs --profile desktop   # 只有上一步 exit=0 才允许跑
```

- **红过就别 install**：本仓库出过一次事故——把 `install` 跟在失败的 `selftest` 后面用 `&&` 串跑，
  结果 profile 里的包只剩 `package.json`，`lib\` 没了。**用 `if ($LASTEXITCODE -eq 0)` 之类的判断，别串。**
- `install.mjs` **只复制三个文件**：`package.json`、`lib/index.js`、`lib/client.js`。
  ⇒ **`tools\` 不随装机副本发**，所以"源摘要 == 装机摘要"这条验收只覆盖那三个文件；
  ⇒ 别人从插件市场装完是**跑不了自测**的，要改代码必须回到源码。
- 写 `C:\<用户>\.dsh\profiles\desktop\` 需要权限；被沙箱挡下时 `EPERM` 会出在**备份 `cordis.patch.yml`**
  那一步，也就是**还没碰真文件就退出**（这个顺序是安全的，装机目录不会半新半旧）。
- 装完要**硬刷新页面**（`Ctrl+Shift+R`）：宿主给客户端 bundle 发 `immutable`。

## 素材分离（这个包为什么可以开源）

代码里**一个字节素材都没有**。要复查就跑：

```
python -c "import os;M={'.jpg','.jpeg','.png','.gif','.webp','.avif','.bmp','.ico','.tif','.tiff','.heic','.mp4','.m4v','.mkv','.webm','.mov','.avi','.psd','.xcf','.zip'};r='.';f=[os.path.join(d,x) for d,_,n in os.walk(r) if 'node_modules' not in d for x in n];print('文件',len(f),'媒体',len([p for p in f if os.path.splitext(p)[1].lower() in M]))"
```

（截至 2026-11-19 那次跑出来是 **58 文件 / 媒体 0**；这个数字会随重构变，**别把它抄进别的文档**。）
`.gitignore` 里有位图/视频/设计稿/压缩包三组规则，命中情况是用
`git check-ignore -v` 在临时仓库里实测过的，不是眼看猜的。
素材一律由 `dsh-boot-gallery` 从本机目录发出来：

```
C:\<用户>\.dsh\boot-naruto\
  arts\<预设>\preset.json + NN.jpg     主题分镜与画面
  arts\ui\frame-{doton,katon,raton,suiton,futon}.png   ← 文字底框（共享素材，不是主题）
  frames\NN.jpg                        内置兜底九幕
  clips\*.mp4                          开机视频片源
```

所以"给别人用"的流程就是：**把素材包位置告诉对方的 agent**，让它把内容摆到上面那棵树里，
不需要改一行代码、不需要重新 build。私有包的投放说明与验收表在素材包自己那边（`SHARE.md`、
`资源包投放说明.md`、`视频规格须知.md`），不在本仓库。

## 文字底框（配饰）这层的设计约束

六档：`无 / 土遁 / 火遁 / 雷遁 / 水遁 / 风遁`（顺序是需求方指定的，别自己排）。

1. **整图缩放 + 只留外环**：每张 PNG 720×260，**中央烤成全透明**，按 `background-size:100% 100%`
   贴在卡片 `::after` 上。中央区域仍然是那块吃滑块的 CSS 填充层 ⇒
   **"拖滑块改透明度"只改文字底色，底框纹丝不动**。这条语义是从早先"九宫 `border-image`"方案改过来的，
   旧方案的 `--bs-frame-w / --bs-frame-slice` 已删除。
   ⇒ **这条分离性有两条断言守着**（`tools\selftest.mjs` 里"底框那条 CSS 规则不出现任何滑块旋钮"/"文字底那条不吃
   底框变量"），并且**做过阳性对照**：往 `::after` 注一条 `opacity:var(--bs-card-a)` 就会 `FAIL 1`。
   所以**别把它当"钉字面量的过度测试"删掉**——注意它切的是**装配后的 `shellCss`**，切 JS 源码 `SRC` 的花括号
   会切出 `{",` 那种三个字符的空块，断言立刻变成装饰（本轮真踩过）。
2. **文字自动内缩**：底框外环会压住第一行行首，所以激活底框时给卡片加 `--bs-frame-pt/pb = 基线+26px`、
   `--bs-frame-pr/pl = 基线+36px`。**基线是实测的**（`window.getComputedStyle(cardNode)`），不是猜的；
   量不到就只画框不内缩并留诊断。整套规则用 `:root[data-bs-frame]` 门控，**没选底框时一条都不生效**
   —— 这是"其他效果不变"的实现方式。
3. **URL 取法有两条，顺序是死的**（`70-dom.part.js` 的 `frameUrl`）：先查清单 `st.ui.files[].url`
   （带 `?v=`，缓存语义最好）；查不到就**从宿主自己给的某个 `/arts/` URL 切出前缀**拼
   `<前缀>/arts/ui/<文件>`（这条对最新和稍早的宿主都成立）。
   ⚠ 真宿主给 `ui` 的条目是 `ok:false / files:[]`，因为那个目录**故意不放** `preset.json`
   （放了它就会变成一个可选主题、还可能被"取清单第一个"的兜底选中当开机画面）。
   兜底还要求 `ui` **条目存在**才肯拼：CSS 背景图的 404 是静默的，拼一个不存在的地址会导致
   "文字白内缩 26/36px 却看不见框"，比什么都不画更难解释。
4. **旧四档（叶纹 / 风车 / 叶纹+风车 / 白绝）已整条删除**，连同 `--bs-deco-a/-b/-o`。
   旧 localStorage 值一律降级成 `none`，不崩、也不画出半只旧纹样。
   ⚠ 注意区分：**万花筒写轮眼的"风车"画法（`mangekyouPin`）是瞳术绘制，不是被删的配饰，别顺手删掉。**

## 自测为什么长这样

`tools\selftest.mjs` 里有两类断言，**缺一不可**：

- **行为断言**（点按钮 → 读 `documentElement` 上真正落地的属性/样式），不是"源码里有没有这行字"的正则。
  正则式断言会把重构判成回归。
- **真宿主快照集成**：直接吃 `tools\fixtures\presets-live.json`（从运行中的宿主 `GET /presets.json` 抓的）。
  起因是 11-19 一个真 bug：**假清单里手写了一个"理想中的 `ui` 条目"**，于是 328 条断言全绿，
  而真机上底框永远 `frame=0`。夹具的抓取与**脱敏步骤**见 `tools\fixtures\FIXTURE-README.md`
  （顶层 `dir`/`log` 是作者本机的绝对路径，**必须删掉才能进版本库**）。

## 已知边界 / 没做到的事

- 只在 **桌面版 profile** 上验过（`--profile desktop`）。web profile 没测。
- 底框是**整图缩放**，矮卡片上外环会纵向压扁（土遁/雷遁/风遁较明显）——需求方看过对照样张后接受了这个代价。
- 「`arts\ui\` 目录在、但某一张图缺失或改名」这种**部分投放**的情形，套件无法同步发现，会表现为"有内缩无框"。
  五张图必须逐字同名；投放后把五个 URL 各请求一次确认 `200 image/png` 是最省事的验收。
- 老套件 + 新素材包的组合会在选单里多出一个点不动的坏格子（`ui` 目录条目），这是**素材包超前于代码**的必然结果，
  先更代码即可。
- **授权：BSD-3-Clause**，全文在仓库根 [`../../LICENSE`](../../LICENSE)。两份 `package.json`
  的 `license` 字段与之一致。代码可自由改用。
- **素材不在本仓库**（除随包分发的三套自画风景外）：第三方主题素材请自行准备并放本机素材目录，
  版权归各自权利人；对代码的授权**不构成**对任何形象的授权。三层边界写在根 `README.md`「授权与版权边界」。
- 名称/形象权利：代码注释与测试夹具里出现的历史角色名只是开发留痕，本仓库不含对应素材，也不构成授权。
- **仓库布局（11-20 起）**：本目录和开屏插件 `dsh-boot-gallery/` 现在是**同一个 git 仓库的两棵子树**
  （合仓是为了让跨树契约一次改全；**仍是两次安装**，各自 `package.json`、各自 `cordis.patch.yml`）。
  仓库根用**白名单** `.gitignore` 只跟踪这两棵树，所以那个 `.git` 坐在开发工作区根上也不会把
  素材包 / PSD / 历史 zip 吸进版本库 —— 在别人机器上 clone 时不存在这个前提，两棵树照原样在库里。
