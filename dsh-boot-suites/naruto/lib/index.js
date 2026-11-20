// 成套插件 · node 侧(纯客户端插件:host 侧为空实现)
//
// 故意一行逻辑都不写:装机只需要**硬刷新**,不需要重启桌面版 ——
// 用户此刻通过 SSH 隧道访问本机 GUI,少一次重启就少一次断隧道的风险。
// 真要给悬浮球加 token 用量统计那类功能,得往这里加 webServer 路由,
// 那就必然要重启;要做的时候单独提出来问,别顺手夹在视觉改动里。
//
// 空 apply 的作用只是让本包出现在 host 的 cordis 树 / Loader 里;
// 浏览器半边由 package.json 的 dsh.client + exports["./client"] 被自动发现并注入。
function apply() {}

export { apply };
