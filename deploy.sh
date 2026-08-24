#!/usr/bin/env bash
# ============================================
# 一键发布：食谱天下 → GitHub Pages
# 用法：
#   1) 把本目录所有文件（含本脚本）放到 Watercolour-Recipe/ 文件夹
#   2) 打开终端 cd 进去，执行：bash deploy.sh
# ============================================

set -e

REPO="https://github.com/nicole96fang/Watercolour-Recipe.git"
BRANCH="main"

echo "🍯 开始发布「食谱天下」到 GitHub Pages …"

# 1) git init（如果是空目录）
if [ ! -d .git ]; then
  git init
  git branch -M "$BRANCH"
fi

# 2) 配置身份（如未设置）
if [ -z "$(git config user.name)" ]; then
  git config user.name "nicole96fang"
  git config user.email "nicole96fang@users.noreply.github.com"
fi

# 3) 添加全部文件
git add -A

# 4) 提交（如有变更）
if git diff --cached --quiet; then
  echo "ℹ️  无新变更，跳过提交。"
else
  git commit -m "init: 食谱天下 Watercolour Recipe 🍯"
fi

# 5) 设置远程
if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REPO"
fi

# 6) 推送
echo "📤 推送到 $REPO …"
git push -u origin "$BRANCH"

cat <<'TXT'

✅ 推送完成！

接下来打开：
👉 https://github.com/nicole96fang/Watercolour-Recipe/settings/pages
把 Source 设为 `main` / `(root)`，点 Save。

等待 30 秒左右，你的永久公网链接就是：
👉 https://nicole96fang.github.io/Watercolour-Recipe/

TXT
