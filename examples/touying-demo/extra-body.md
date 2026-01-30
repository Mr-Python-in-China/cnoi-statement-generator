# 语法说明

## 基本文档语法

你可以使用 markdown 直接编写你希望展示的内容。

Markdown 的语法非常简单。你可以阅读 [Markdown Reference](https://commonmark.org/help/) 快速了解。

同时，删除线、LaTeX 公式等一些 GFM 语法也是支持的。

## 差异说明

但与编写传统文档不同，我们修改和添加了一些语法以方便使用。

### 节与小节

在前面的演示中，你已经看到了，**一级标题** `#` 和**二级标题** `##` 被用作了划分节与小节。他们都有特别的样式，比如新开一页等。

三级标题及更高级的标题将直接在本页显示。

---

### 分页

有时你可能想手动控制分页。

你可以使用三条短横线 `---` 来进行分页。

## 动画能力

你还可以添加动画！

::pause

这里的动画使用了 `::pause`。它会将之后的内容隐藏，并在下一页显示。

::pause

当然，多个动画也是可以的。

::meanwhile

使用 `::meanwhile` 会将动画状态重置，以便你同时添加多个动画。

::pause

动画以页为分隔，这页设置的动画将不会影响到下一页。

# 致谢

---

这里是 [CNOI Statement Generator](https://cnoi.mrpython.top/)，为算法竞赛选手编写的 Markdown 转 PDF 工具。项目在 [Github](https://github.com/Mr-Python-in-China/cnoi-statement-generator) 上开源，开源协议为 AGPL-3.0。

模板本体直接使用了强大的 [Touying](https://touying-typ.github.io/zh/docs/dynamic/equation)。  
有相当多的功能在 Markdown 中难以完成。强烈推荐你学习 Typst 来直接编写丰富的内容。

生成 PDF 的工具为 [Typst](https://typst.app/)，一款比 Tex 好用得多的排版软件。通过 [typst.ts](https://github.com/Myriad-Dreamin/typst.ts) 项目，得以将由 Rust 编写的 typst 编译为 WASM 并在浏览器上执行。

该模板使用了开源字体：[阿里巴巴普惠体](https://www.alibabafonts.com/) 和 [Jetbrains Mono](https://www.jetbrains.com/lp/mono/)。  
网站使用的 UI 组件库为 [Ant Design](https://ant.design/index-cn)。  
Markdown 解析器使用的是 [UnifiedJS](https://unifiedjs.com/)。

还有诸多依赖没有一一列出。

---

开源好闪，拜谢开源！
