# 博一文献阅读

这是一个面向自旋电子方向博士文献整理的 GitHub Pages 静态网页模板。

当前第一版已导入四组本地文献：

- MnGa / MTJ
- MnGa / 电流诱导磁化翻转
- VCMA
- ML with MBE

## 为什么这样设计

参考的 ISSCC 页面适合芯片论文比较，主要字段是工艺、面积、功耗、能效、目标模型。这个版本改成更适合 MRAM、MnGa/MnAl 和微磁模拟的结构：

- 材料体系
- 器件结构
- 物理机制
- 关键指标
- 实验条件
- 模拟参数
- 研究问题、证据链和课题相关性

## 本地预览

在这个目录下启动一个静态服务器即可预览：

```bash
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

## GitHub Pages

当前部署仓库为 `yhluo57/phd-literature-notes`，GitHub Pages 地址：

```text
https://yhluo57.github.io/phd-literature-notes/
```

## 工作台功能

网页顶部进入“工作台”后，可以完成这些维护动作：

- 新文献导入：新建空白条目，或从 DOI 生成一篇新文献信息。
- 在线/半在线编辑：先按分组筛选，再搜索和选择文献；修改会先保存在浏览器本地草稿，页面顶部会显示是否有未同步修改。
- JSON 自动生成：随时复制或下载当前 `papers.json`。
- PDF 文件名批量生成：选择多个 PDF，网页会用文件名猜测年份、期刊、标题、标签和分组。
- DOI 补全：在编辑区给当前选中文献补全年份、期刊、作者、标题和 DOI 链接。
- 重点图谱升级：给选中文献生成研究问题、证据链和关键图谱卡片模板。
- GitHub 同步：填入 fine-grained token 后，可以手动同步，也可以打开自动同步模式。

## 路线图

路线图页按研究分组展示。选择分组后，页面会把该分组下全部文献按年份排成时间线，并生成全量对照表；重点图谱文献会保留状态标识，但不会作为唯一筛选条件。

GitHub API 的作用是让网页有权限替你更新仓库里的 `data/papers.json`。它相当于网页里的“保存到 GitHub”按钮：网页把当前 JSON 发给 GitHub，GitHub 生成一次提交，GitHub Pages 随后刷新。

`Branch` 默认保持 `main` 即可，它表示保存到仓库的主分支。`Token` 不是之前部署用的 Deploy key，而是 GitHub 生成的一串网页授权码；建议只给 `yhluo57/phd-literature-notes` 这个仓库，并只开启 Contents 读写权限。Token 只保存在当前浏览器会话中。
