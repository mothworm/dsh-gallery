# `presets-live.json` —— 从**运行中的宿主**抓的真清单快照

## 它存在的理由

11-19 有个真 bug：五遁底框在真机上**永远 `frame=0`**，而自测 328 断言全绿。原因是自测喂的是
**手写的假清单**，里面给 `arts/ui/` 条目写了 `files[]`；可真实宿主对没有 `preset.json` 的目录会在
`dsh-boot-gallery\lib\index.js:221-222` 直接返回 `ok:false / files:[]`。

> 教训一句话：**"从清单查 URL"的逻辑，夹具必须用真宿主的输出，不能凭想象。**

这份快照就是那个守门犬：`selftest.mjs` 的「真宿主快照集成」一段直接吃它，所以谁以后把假清单
"修好看"了，这里会先炸。

## 怎么重抓（两步，第二步别省）

```powershell
# 1) 趁宿主开着,抓一份(不需要重启、不需要刷页面)
Invoke-WebRequest http://127.0.0.1:19387/dsh-boot-gallery/presets.json `
  -OutFile tools\fixtures\presets-live.json -UseBasicParsing

# 2) **脱敏**:顶层 dir / log 两个字段是开屏插件素材目录与日志的**本机绝对路径**(C:\Users\<用户名>\...),
#    这份包将来要进 git / 插件市场,绝不能带它。删掉这两个键,其余原样保留。
python -c "import json;d=json.load(open(r'tools/fixtures/presets-live.json',encoding='utf-8'));d.pop('dir',None);d.pop('log',None);json.dump(d,open(r'tools/fixtures/presets-live.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)"
```

抓完自检一下有没有漏网（**阳性对照**：`tobirama-night` 必须命中，`Users`/盘符必须不命中；
只看到"没匹配"就下结论是不够的，那可能只是正则坏了）：

```powershell
Select-String -Path tools\fixtures\presets-live.json -Pattern 'tobirama-night|Users|[A-Za-z]:\\' -Encoding utf8 |
  Group-Object { $_.Line -match 'Users|[A-Za-z]:' } | ForEach-Object { "命中组 $($_.Name): $($_.Count)" }
```

## 这份快照里有什么（2026-11-19 实测）

- 顶层：`plugin` / `exists` / `manual` / `selected` / `count` / `usable` / `maxActs` / `presets`
- `presets` **18 条**：17 个真主题 + 一个 **`ui`**（共享素材目录）
- `ui` 条目长这样，**要的就是这个丑样子**：`ok:false, error:"缺 preset.json", files:[], url:"", version:""`
- `tobirama-night`：`ok:true`、`acts:4`、`files` 5 条 = `01..04.jpg` + **`kunai.png`**
  （最后这条是故意的回归点：`artOf` 必须挑 `NN.jpg`，不能把飞镖贴图当主题画面）
- URL 一律是路由相对形如 `/dsh-boot-gallery/arts/<id>/<file>?v=<size><t><mtime>`，
  套件推导 arts 前缀（`frameUrl` 的兜底）靠的就是它。

## 时效性

快照是**本机这一台宿主**的输出，含本机装的主题集合与文件名。换机器/加主题后它当然会变——
**这不是问题**，因为断言只依赖三件事：`ui` 存在且 `ok:false/files:[]`、有至少一条带 `/arts/` 的
顶层 URL、`tobirama-night` 的 files 里混着一张非幕图。真机验证请以 `boot.log` 的
`b=b1931 … frame=1` 为准。
