import { type Dispatch, type FC, type SetStateAction } from "react";
import CodeMirror from "@uiw/react-codemirror";
import {
  markdown as markdownExtension,
  markdownLanguage,
} from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";

import "./markdownPanel.css";

const MarkdownPanel: FC<{
  code: string;
  setCode: Dispatch<SetStateAction<string>>;
}> = ({ code, setCode }) => {
  return (
    <CodeMirror
      className="contest-editor-markdown-panel"
      extensions={[
        EditorView.lineWrapping,
        EditorView.theme({
          "&.cm-focused": { outline: "none" },
          "&.cm-editor": { height: "100%" },
          ".cm-scroller": {
            "z-index": "2",
            "overflow-anchor": "none",
          },
        }),
        markdownExtension({
          base: markdownLanguage,
          extensions: [{ remove: ["HTMLBlock", "HTMLTag"] }],
          completeHTMLTags: false,
        }),
      ]}
      value={code}
      onChange={(x) => setCode(x)}
    />
  );
};

export default MarkdownPanel;
