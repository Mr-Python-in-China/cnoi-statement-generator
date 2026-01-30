import type { ImmerContent } from "@/types/document";
import {
  useEffect,
  useRef,
  useState,
  type FC,
  type Dispatch,
  type SetStateAction,
  use,
} from "react";
import { type Updater } from "use-immer";
import Preview from "./preview";
import { Splitter } from "antd";
import MarkdownPanel from "./markdownPanel";
import useTemplateManager from "@/components/templateManagerContext";

import "./body.css";
import "./config-common.css";

const Body: FC<{
  content: ImmerContent;
  updateContent: Updater<ImmerContent>;
  panel: string;
  setPanel: Dispatch<SetStateAction<string>>;
}> = ({ panel, content, updateContent, setPanel }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<number[] | undefined>(undefined);
  const { ConfigPanelFC } = use(useTemplateManager().uiMetadataPromise);

  useEffect(() => {
    if (!divRef.current) return;
    const div = divRef.current;
    const handleResize = () =>
      setSizes((x) => {
        if (x === undefined) return x;
        const s = x[0] + x[1];
        const res = [
          (x[0] / s) * div.clientWidth,
          (x[1] / s) * div.clientWidth,
        ];
        if (x[1] == 0) return res;
        let d = 0;
        if (x[0] < 250) d = 250 - x[0];
        else if (x[1] < 250) d = -(250 - x[1]);
        res[0] += d;
        res[1] -= d;
        return res;
      });
    const ob = new ResizeObserver(handleResize);
    ob.observe(div);
    return () => {
      ob.disconnect();
    };
  }, []);
  return (
    <div className="contest-editor-body" ref={divRef}>
      <Splitter onResize={setSizes}>
        <Splitter.Panel
          defaultSize="50%"
          min={250}
          size={sizes === undefined ? "50%" : sizes[0]}
        >
          {panel === "config" ? (
            <ConfigPanelFC
              {...{
                content,
                updateContent,
                setPanel,
              }}
            />
          ) : (
            <MarkdownPanel
              {...(panel.startsWith("extra-")
                ? {
                    code: content.extraContents[panel.slice(6)].markdown,
                    setCode: (v) =>
                      updateContent((x) => {
                        x.extraContents[panel.slice(6)].markdown =
                          typeof v === "function"
                            ? v(x.extraContents[panel.slice(6)].markdown)
                            : v;
                      }),
                  }
                : {
                    code: (() => {
                      const p = content.problems.find((y) => y.uuid === panel);
                      if (!p) throw new Error("Target panel not found");
                      return p.markdown;
                    })(),
                    setCode: (v) =>
                      updateContent((x) => {
                        const p = x.problems.find((y) => y.uuid === panel);
                        if (!p) throw new Error("Target panel not found");
                        p.markdown =
                          typeof v === "function" ? v(p.markdown) : v;
                      }),
                  })}
            />
          )}
        </Splitter.Panel>
        <Splitter.Panel
          min={250}
          size={sizes === undefined ? "50%" : sizes[1]}
          collapsible
        >
          {(!sizes || sizes[1] > 0) && <Preview data={content} />}
        </Splitter.Panel>
      </Splitter>
    </div>
  );
};

export default Body;
