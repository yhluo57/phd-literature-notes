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

建议仓库名使用用户指定的 `博一文献阅读`。如果 GitHub Pages 对中文路径使用不顺手，后续也可以改成 `spintronics-literature`，网页标题仍然保留中文。
