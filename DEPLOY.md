# 食谱天下 · 一键发布到 GitHub

## 🚀 三步上线

### 1) 把代码下载到本地

把 `/workspace` 里这 5 个文件下载到本地新建文件夹 `Watercolour-Recipe/`：

- `index.html`
- `styles.css`
- `db.js`
- `app.js`
- `README.md`

### 2) 在本地推送

进入 `Watercolour-Recipe/` 目录，打开终端执行：

```bash
cd Watercolour-Recipe

git init
git config user.name "nicole96fang"
git config user.email "your@email.com"   # ← 换成你的邮箱

git add index.html styles.css db.js app.js README.md
git commit -m "init: 食谱天下 Watercolour Recipe 🍯"

git branch -M main
git remote add origin https://github.com/nicole96fang/Watercolour-Recipe.git
git push -u origin main
```

期间会弹窗让你登录 GitHub，照提示授权即可。

### 3) 开启 GitHub Pages（拿到真正的公网链接）

1. 打开 https://github.com/nicole96fang/Watercolour-Recipe
2. 顶部菜单 **Settings** → 左侧 **Pages**
3. **Source** 选 `Deploy from a branch`
4. **Branch** 选 `main` / 目录留空 `(root)` → 点 **Save**
5. 等待 30 秒左右，页面刷新后顶部会出现一行绿色提示：
   > ✅ Your site is live at https://nicole96fang.github.io/Watercolour-Recipe/

这就是你的 **永久公网链接**，手机/电脑都能直接打开 🍯

---

## 🛟 推送时常见问题

- **`remote: Permission denied`** → GitHub 没登录，重新执行 `gh auth login` 或在弹窗里授权
- **`error: failed to push some refs`** → 远程仓库已有内容（如自动生成的 README），先把远程拉下来：
  ```bash
  git pull origin main --allow-unrelated-histories --rebase
  git push -u origin main
  ```
- **`gh` 不是命令** → 直接用 `git push`，终端会提示你在浏览器登录 GitHub

---

部署完成后请告诉我一声，我可以继续帮你：
- 🍯 美化首页动画
- 🥣 增加「一键复制其他人的公开食谱」
- 📱 帮你做 PWA 图标与「添加到主屏」

————— Made with 💙 —————
