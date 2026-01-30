import type { ConfigPanelFC } from "@/types/templates";
import type { Content } from "./contentZod";
import { Input, Select } from "antd";
import themeList from "./themeList";

const ConfigPanel: ConfigPanelFC<Content> = ({ content, updateContent }) => {
  return (
    <form className="contest-editor-config">
      <label>
        标题
        <Input
          name="title"
          value={content.title}
          onChange={(e) =>
            updateContent((v) => {
              v.title = e.target.value;
            })
          }
        />
      </label>{" "}
      <label>
        副标题
        <Input
          name="subtitle"
          value={content.subtitle}
          onChange={(e) =>
            updateContent((v) => {
              v.subtitle = e.target.value;
            })
          }
        />
      </label>
      <label>
        作者
        <Input
          name="author"
          value={content.author}
          onChange={(e) =>
            updateContent((v) => {
              v.author = e.target.value;
            })
          }
        />
      </label>
      <label>
        单位
        <Input
          name="institution"
          value={content.institution}
          onChange={(e) =>
            updateContent((v) => {
              v.institution = e.target.value;
            })
          }
        />
      </label>
      <label>
        日期
        <Input
          name="date"
          value={content.date}
          onChange={(e) =>
            updateContent((v) => {
              v.date = e.target.value;
            })
          }
        />
      </label>
      <label>
        主题
        <Select
          options={themeList.map(([value, label]) => ({ value, label }))}
          value={content.theme}
          onChange={(value) =>
            updateContent((v) => {
              v.theme = value;
            })
          }
        />
      </label>
    </form>
  );
};
export default ConfigPanel;
