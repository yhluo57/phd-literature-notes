# 项目交接笔记

这个仓库是罗雨涵的自旋电子方向博士一年级文献阅读网页，部署在 GitHub Pages。仓库名为 `phd-literature-notes`，GitHub 用户名为 `yhluo57`。

## 项目定位

- 目标：把 MRAM、MnGa/MnAl、微磁模拟、VCMA、ML with MBE 等方向的文献整理成可搜索、可筛选、可维护的网页。
- 主要入口：`index.html`。
- 样式文件：`css/style.css`。
- 页面逻辑：`js/app.js`。
- 文献数据：`data/papers.json`。
- 主题配置：`data/theme.json`。
- 路线图旧数据：`data/roadmaps.json`，现在路线图主要由 `papers.json` 动态生成。

## 已有功能

- 总览：按分组、年份、标签、状态筛选文献。
- 单篇笔记：展示文献信息、研究问题、核心贡献、关键指标、关键图谱卡片、实验条件和个人笔记。
- 路线图：先选分组，再显示该分组全部文献的时间线，并汇总每篇文献的关键参数。
- 材料索引：按材料体系聚合文献。
- 工作台：支持 PDF 文件名批量生成条目、DOI 新建文献、编辑已有文献、批量编辑、JSON 复制/下载、GitHub API 同步。
- 重复检测：导入新文献时会检查已有文献重复和同批次重复，强重复默认跳过，疑似重复会提示人工核对。
- 主题设置：可在工作台里改配色、字体、圆角和界面密度。

## 主题设置说明

主题默认读取 `data/theme.json`。工作台里的“主题设置”有三个关键按钮：

- `应用到当前浏览器`：只在当前浏览器预览并保存草稿，不会触发 GitHub Pages 部署。
- `保存主题到 GitHub`：把当前主题写入 `data/theme.json`，会触发一次 GitHub Pages 部署。
- `恢复默认主题`：恢复为雾粉杏、鼠尾草绿、温柔墨蓝方案。

默认配色：

- 背景：`#fbf7f3`
- 卡片：`#ffffff`
- 主文字：`#25313a`
- 次级文字：`#74808a`
- 主色：`#6f9f9a`
- 玫瑰强调：`#d98b8b`
- 蓝灰强调：`#8aa6c1`
- 边框：`#eadfda`
- 标签/参数底色：`#f8ece9`

## GitHub 同步原理

网页本身是静态网页，浏览器不能直接改 GitHub 仓库文件，必须通过 GitHub API。工作台里的 token 是 GitHub 生成的临时授权码，要求 fine-grained token，仓库选择 `yhluo57/phd-literature-notes`，权限只需要 `Contents: Read and write`。

- 同步文献会写入 `data/papers.json`。
- 保存主题会写入 `data/theme.json`。
- 每次写入 GitHub 都会产生一次 commit，并触发一次 GitHub Pages deployment。
- 只在本地预览主题、复制 JSON、编辑但不点击同步，不会触发 deployment。

## 给后续 Codex 的上下文

用户不是计算机专业，第一次使用 GitHub。解释时请尽量少用术语，必要术语要用生活化语言解释。她偏好浅、柔和、但不要单调的配色；当前目标是“雾粉杏 + 鼠尾草绿 + 温柔墨蓝”交叉使用，而不是大面积单一绿色或杏色。

如果新的对话没有上下文，优先读取这个文件、`README.md`、`data/papers.json`、`data/theme.json`、`js/app.js` 和 `css/style.css`。不要随意覆盖用户在工作台里同步过的文献数据。

## 常见维护任务

- 增加文献字段：修改 `normalizePaper`、编辑区表单、单篇详情展示和 `PROJECT_NOTES.md`。
- 调整主题字段：修改 `defaultTheme`、`renderThemeEditor`、`applyTheme` 和 `data/theme.json`。
- 改工作台按钮说明：主要在 `renderWorkbench` 中。
- 优化配色落点：优先改 CSS 变量和使用变量的组件，不要把颜色写死在很多地方。
- 部署后看不到变化：通常是浏览器缓存或 GitHub Pages 还没刷新；`index.html` 里的 CSS/JS 版本号可用于强制刷新缓存。
