#!/usr/bin/env bash
# 用 GitHub token 推送当前分支，**token 全程不打印、不落在 remote URL 里**。
#
# 为什么不用 `https://<token>@github.com/...`：
#   那样 token 会出现在 git 的报错输出、`ps` 的进程列表、以及 git 的 reflog/配置里。
# 这里改用 GIT_ASKPASS：git 只在需要密码时把 token 交给它，URL 里干干净净，
#   报错信息最多出现 https://github.com/owner/repo.git，不携带凭据。
#
# token 从哪来（按优先级）：
#   1) 环境变量 GH_TOKEN
#   2) ~/.dsh-gallery-token（一行，最好 chmod 600）
#   3) 交互输入（read -s，不回显）
#
# 用法：
#   tools/push-with-token.sh              # 推当前分支到 origin
#   tools/push-with-token.sh main         # 指定分支
set -euo pipefail

cd "$(dirname "$0")/.."

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"

if [ -z "${GH_TOKEN:-}" ]; then
  if [ -r "$HOME/.dsh-gallery-token" ]; then
    GH_TOKEN="$(tr -d '\r\n' < "$HOME/.dsh-gallery-token")"
    echo "· token 来源：~/.dsh-gallery-token"
  else
    printf 'GitHub token（输入不回显）：'
    read -r -s GH_TOKEN
    echo
  fi
fi
[ -n "${GH_TOKEN:-}" ] || { echo "!! 没有 token，退出"; exit 1; }
export GH_TOKEN

# remote 里若已经混进凭据，先剥掉（避免 token 随 URL 泄露到日志/配置）
CLEAN_URL="$(git remote get-url origin | sed -E 's#https://[^@/]+@#https://#')"
if [ "$CLEAN_URL" != "$(git remote get-url origin)" ]; then
  echo "· 发现 remote URL 里带凭据，已剥离为：$CLEAN_URL"
  git remote set-url origin "$CLEAN_URL"
fi

ASKPASS="$(mktemp "${TMPDIR:-/tmp}/gh-askpass.XXXXXX")"
trap 'rm -f "$ASKPASS"' EXIT
cat > "$ASKPASS" <<'EOS'
#!/usr/bin/env bash
case "$1" in
  *Username*) printf '%s\n' "x-access-token" ;;
  *Password*) printf '%s\n' "$GH_TOKEN" ;;
esac
EOS
chmod 700 "$ASKPASS"

echo "· 推送到 origin/$BRANCH …"
GIT_ASKPASS="$ASKPASS" \
GIT_TERMINAL_PROMPT=0 \
git -c credential.helper= push origin "HEAD:refs/heads/$BRANCH"

echo "· 完成。可到仓库页确认提交。"
