# -*- coding: utf-8 -*-
# 一次性:从运行中的宿主抓「每台预设的 preset.json + 片库」存成自测夹具。
# 为什么要真数据:目标 (1) 说"其它预设逐帧不变",以前只有假数据撑着。
import json, os, urllib.request, sys

BASE = 'http://127.0.0.1:19387/dsh-boot-naruto'
# 落点跟着脚本自己走,不写死盘符 —— 本目录要进版本库,`D:\<某个目录>\...` 那种字面量
# 一是把作者的本机布局念出去,二是仓库一挪位置这脚本就悄悄写到旧地址去了。
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures', 'boot-live.json')

def get(u):
    with urllib.request.urlopen(u, timeout=20) as r:
        return json.loads(r.read().decode('utf-8'))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
mf = get(BASE + '/presets.json')
clips = get(BASE + '/clips.json')
docs = {}
for p in mf['presets']:
    if not p.get('ok'):
        continue                      # 非主题目录(arts/ui)没有 preset.json,404 是预期
    # ⚠ p['url'] **自己就带 `/dsh-boot-naruto` 前缀**(清单里就是 /dsh-boot-naruto/arts/<id>/preset.json?v=…)。
    #   第一版在这里又拼了一次 BASE,于是请求变成 /dsh-boot-naruto/dsh-boot-naruto/arts/… ⇒ 17 条全 404,
    #   我差点据此宣称"宿主清单公布的 URL 自己会 404"。**教训:断定 URL 坏了之前,先把发出去的 URL 打出来。**
    u = BASE + p['url'].split('?')[0].replace('/dsh-boot-naruto', '', 1)
    print('    GET %s' % u)
    try:
        docs[p['id']] = get(u)
    except Exception as e:
        print('  !! %s 抓不到: %s' % (p['id'], e))

fixture = {
    '_note': '从运行中的桌面版宿主 GET 出来的真数据,供 tools/selftest-client.mjs 验 '
             '"没点名的预设不会被 clips 目录抢占"。刷新方法见同目录 FIXTURE-README.md。',
    '_fetchedFrom': BASE,
    'manifestTop': {k: mf[k] for k in mf if k != 'presets'},
    'presets': mf['presets'],
    'clips': clips,
    'docs': docs,
}
blob = json.dumps(fixture, ensure_ascii=False, indent=1)
# 脱敏纪律:夹具是要进版本库的,不许带任何人的绝对路径
for bad in ('Users', 'userprofile', ':\\\\'):
    if bad.lower() in blob.lower():
        print('  !! 夹具里出现可疑串 %r —— 拒绝落盘' % bad); sys.exit(1)
open(OUT, 'w', encoding='utf-8').write(blob)
print('  写出 %d B  预设 %d 条(其中可播 %d)  片库 %d 段' % (
    os.path.getsize(OUT), len(mf['presets']), len(docs), len(clips.get('clips', []))))
print('  带 clip 键的预设: %s' % [k for k, v in docs.items() if v.get('clip')])
print('  clips.selected = %r ; 片名 %s' % (clips.get('selected'), [c['name'] for c in clips.get('clips', [])]))
