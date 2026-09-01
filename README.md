# Sandy Sun 的工具箱

Sandy Sun 的个人工具导航站。使用 Astro 构建，通过 GitHub Pages 发布到 `https://snowm243.github.io/`。

## 当前工具

- [上海工资计算器](https://snowm243.github.io/Payroll-Cal/)
- [2026 学习日历](https://snowm243.github.io/study-calendar/)
- [美国各州学习地图](https://snowm243.github.io/us-states-study-map/)（源码位于 `projects/us-states-study-map/`）

## 本地开发

```bash
npm install
npm run dev
```

打开 http://localhost:4321 查看效果。

## 项目结构

```
src/
├── data/
│   ├── tools.json      # 工具列表配置 —— 加新工具只需要在这里加一条，不用碰代码
│   └── profile.json    # 个人信息配置 —— 姓名/简介/邮箱/GitHub 链接
├── components/
│   ├── Sidebar.astro   # 左侧个人信息栏
│   └── ToolCard.astro  # 单个工具卡片
├── layouts/
│   └── Main.astro      # 页面整体布局，引入字体和全局样式
├── styles/
│   └── global.css      # 设计 token（颜色/圆角/阴影变量）
└── pages/
    └── index.astro     # 首页：搜索框 + 分类筛选 + 工具网格
```

## 加一个新工具

打开 `src/data/tools.json`，在数组里加一条：

```json
{
  "name": "工具名称",
  "desc": "一句话描述这个工具是干什么的",
  "url": "https://your-tool.github.io/",
  "icon": "🔧",
  "color": "#e8f0fe",
  "category": "效率工具",
  "status": "live",
  "order": 3
}
```

- `icon` 可以是 emoji，也可以换成图片路径（需要改 `ToolCard.astro` 里 icon 渲染方式）
- `status` 只有 `"live"` 或 `"dev"` 两种，对应"正常运行"/"开发中"的小圆点
- `category` 会自动出现在顶部的分类 tab 里，不用手动维护
- `order` 数字越小，工具在页面中越靠前

## 修改个人信息

打开 `src/data/profile.json` 改姓名、简介、邮箱、GitHub 链接。

如果要换成真实头像照片，把图片放进 `public/` 目录（比如 `public/avatar.jpg`），然后把 `profile.json` 里的 `avatar` 字段改成 `"/avatar.jpg"`。

## 部署到 GitHub Pages

### 方式一：GitHub Actions 自动部署（推荐）

1. 把整个项目 push 到 GitHub 仓库
   - 如果想用根域名访问（`你的用户名.github.io`），仓库名必须叫 `你的用户名.github.io`
   - 如果用别的仓库名，会是 `你的用户名.github.io/仓库名`，此时需要在 `astro.config.mjs` 里加一行 `base: '/仓库名'`
2. 仓库 Settings → Pages → Source 选择 **GitHub Actions**
3. push 到 `main` 分支后，`.github/workflows/deploy.yml` 会自动构建并发布
4. 当前 `astro.config.mjs` 已配置为 `https://snowm243.github.io`

### 方式二：手动构建上传

```bash
npm run build
```

`dist/` 目录里就是构建好的静态文件，直接上传到任意静态托管都可以。
