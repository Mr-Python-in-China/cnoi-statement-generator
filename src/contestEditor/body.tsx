import type { ImmerContestData } from "@/types/contestData";
import {
  useEffect,
  useRef,
  useState,
  type FC,
  type Dispatch,
  type SetStateAction,
  type RefObject
} from "react";
import { type Updater } from "use-immer";
import Preview from "./preview";
import { Splitter } from "antd";
import ConfigPanel from "./configPanel";

import "./body.css";
import MarkdownPanel from "./markdownPanel";

const Body: FC<{
  contestData: ImmerContestData;
  updateContestData: Updater<ImmerContestData>;
  panel: string;
  setPanel: Dispatch<SetStateAction<string>>;
  imageMapping: Map<string, string>;
  imageBlobsRef: RefObject<Map<string, Blob>>;
  setImageMapping: Dispatch<SetStateAction<Map<string, string>>>;
}> = ({
  panel,
  contestData,
  updateContestData,
  setPanel,
  imageMapping,
  imageBlobsRef,
  setImageMapping,
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<number[] | undefined>(undefined);

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
            <ConfigPanel
              {...{
                contestData,
                updateContestData,
                setPanel,
                imageMapping,
                imageBlobsRef,
                setImageMapping,
              }}
            />
          ) : (
            <MarkdownPanel
              {...(panel === "precaution"
                ? {
                    code: contestData.precautionMarkdown,
                    setCode: (v) =>
                      updateContestData((x) => {
                        x.precautionMarkdown =
                          typeof v === "function" ? v(x.precautionMarkdown) : v;
                      }),
                  }
                : {
                    code: (() => {
                      const p = contestData.problems.find(
                        (y) => y.key === panel
                      );
                      if (!p) throw new Error("Target panel not found");
                      return p.statementMarkdown;
                    })(),
                    setCode: (v) =>
                      updateContestData((x) => {
                        const p = x.problems.find((y) => y.key === panel);
                        if (!p) throw new Error("Target panel not found");
                        p.statementMarkdown =
                          typeof v === "function" ? v(p.statementMarkdown) : v;
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
          {(!sizes || sizes[1] > 0) && <Preview data={contestData} />}
        </Splitter.Panel>
      </Splitter>
    </div>
  );
};

export default Body;
