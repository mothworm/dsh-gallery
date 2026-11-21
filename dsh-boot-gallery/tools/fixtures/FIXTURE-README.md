# `boot-live.json` —— 从运行中的宿主抓的真机夹具

`tools/selftest-client.mjs` 的「[9] 真机夹具」段吃它。里面是：

| 字段 | 内容 |
|---|---|
| `manifestTop` | `/dsh-boot-gallery/presets.json` 去掉 `presets` 后的顶层（`plugin/exists/manual/selected/count/usable/maxActs/dir/log`） |
| `presets` | 全部清单条目**原样**（含那个 `ok:false` 的 `ui` 共享素材目录条目） |
| `clips` | `/clips.json` 原样（片名、`bytes`、`faststart`、`url`） |
| `docs` | **每套可播预设自己的 `preset.json` 全文**（17 份） |

## 它验的是本项目最贵的一句话

> 「只有点了名的预设走视频，**其它预设逐帧不变**。」

这句话的真正含义不是"我写了个 `if`"，而是"**装机上这 17 套、各拿自己的真分镜表，都只有一套会被视频抢走**"。
所以这一段拿真实清单 + 真实分镜逐套开一次机，断言：上视频 1 套、`clip-miss` 0 套、其余全部 `mode=preset`。

以前这段只有**手写的 konan 假数据**撑着，那属于"我以为对"。

## 怎么重抓（宿主要开着；不用重启、不用刷页面）

```
python <随便一个地方>\fetch.py     # 本轮那次的一键脚本，见下
```

要点（都是踩过的坑）：

1. **`presets.json` 里每条的 `url` 自己就带 `/dsh-boot-gallery` 前缀**，别在 `BASE` 之后再拼一次。
   我第一版就是拼成了 `/dsh-boot-gallery/dsh-boot-gallery/arts/...`，17 条全 404，
   差点据此写下"宿主清单公布的 URL 自己会 404"这种**假结论**。
   ⇒ **断定一个 URL 坏了之前，先把实际发出去的 URL 打印出来。**
2. 目录里**没有 `preset.json` 的条目**（`ui`）本来就 404，那是预期，抓的时候按 `ok` 跳过即可。
3. 落盘前扫一遍 `Users` / `userprofile` / 盘符 —— 实测宿主的 `dir` 是**相对名**（`"arts"`/`"clips"`）、
   `log` 是对象，所以这份夹具**不含任何人的绝对路径**；但每次重抓都要再扫一遍，别靠记忆。
4. 抓完必须重跑自测；**不许手改 JSON 让断言变绿**（那就回到"我以为对"）。

## 时效

快照是**这台机器此刻**的预设集合。加了新主题、改了分镜，旧快照照样能跑（断言只依赖三件事：
点名的恰好一套、其余不点名、清单里至少有一条带 `/arts/` 的 URL）；但**新主题的 `clip` 键没进快照**，
所以真机验收仍以 `boot.log` 的 `mode=video clip=…` 为准。
