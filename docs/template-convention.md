这份文档有关如何创建新模板。在新建模板时需遵守下面的说明。

- 在 templates 下为你的模板新建一个文件夹。
- 文件夹下需包含 `manifest.json`。这是一个用于说明你的模板的文件。其中包含人类可读的名称、简介等信息。
- `configComponent.tsx` 用于描述配置页的 UI 样式。该文件仅默认导出一个组件，为页面的根。
- `unifiedPlugins.ts` 用于为 unified 添加新插件。默认导出插件列表。
