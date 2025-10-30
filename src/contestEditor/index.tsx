import { type FC, useEffect, useState } from "react";
import { useImmer } from "use-immer";
import type { ImmerContestData } from "@/types/contestData";
import exampleStatements from "./exampleStatements";
import { App, Button, Tabs, type TabsProps } from "antd";
import Body from "./body";
import {
  newProblem,
  removeProblemCallback,
  toImmerContestData,
} from "@/utils/contestDataUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileArrowDown } from "@fortawesome/free-solid-svg-icons";

import "./index.css";
import { compileToPdf, typstInitPromise } from "@/compiler";

const ContestEditor: FC = () => {
  const [contestData, updateContestData] = useImmer<ImmerContestData>(
    toImmerContestData(exampleStatements["SupportedGrammer"]),
  );
  const [panel, setPanel] = useState("config");
  const [exportDisabled, setExportDisabled] = useState(true);
  const { modal, notification } = App.useApp();
  const items: TabsProps["items"] = [
    {
      key: "config",
      label: "比赛配置",
      closable: false,
      destroyOnHidden: true,
    },
    {
      key: "precaution",
      label: "注意事项",
      closable: false,
      destroyOnHidden: true,
    },
    ...contestData.problems.map((x, i) => ({
      key: x.key,
      label: (
        <>
          {x.title}
          <span className="contest-editor-tab-item-sublabel">T{i + 1}</span>
        </>
      ),
      destroyOnHidden: true,
    })),
  ];
  useEffect(() => {
    let mounted = true;
    typstInitPromise.then(() => {
      if (mounted) setExportDisabled(false);
    });
    return () => {
      mounted = false;
    };
  });
  const removeProblem = removeProblemCallback(
    modal,
    setPanel,
    updateContestData,
  );
  return (
    <div className="contest-editor">
      <Tabs
        type="editable-card"
        items={items}
        activeKey={panel}
        onChange={(x) => {
          setPanel(x);
        }}
        onEdit={async (e, action) => {
          if (action === "remove") removeProblem(e as string);
          else {
            const v = newProblem(contestData);
            setPanel(v.key);
            updateContestData((draft) => {
              draft.problems.push(v);
            });
          }
        }}
        tabBarExtraContent={{
          right: (
            <Button
              type="primary"
              icon={<FontAwesomeIcon icon={faFileArrowDown} />}
              disabled={exportDisabled}
              onClick={async () => {
                if (exportDisabled) return;
                setExportDisabled(true);
                try {
                  const data = await compileToPdf(contestData);
                  if (!data) throw new Error("编译器未返回任何数据");
                  const blob = new Blob([data.slice().buffer], {
                    type: "application/pdf",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${contestData.title || "statement"}${
                    contestData.dayname ? `-${contestData.dayname}` : ""
                  }.pdf`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  console.log("Error when exporting PDF.", e);
                  notification.error({
                    message: "导出失败",
                    description: (
                      <>
                        <div>{e instanceof Error ? e.message : String(e)}</div>
                        <div>
                          如果你认为这是网站的错误，请{" "}
                          <a
                            href="https://github.com/Mr-Python-in-China/cnoi-statement-generator/issues"
                            target="_blank"
                          >
                            提交 issue
                          </a>
                          。
                        </div>
                      </>
                    ),
                    duration: 5,
                    showProgress: true,
                    pauseOnHover: true,
                  });
                }
                setExportDisabled(false);
              }}
            >
              导出 PDF
            </Button>
          ),
        }}
      />
      <Body {...{ contestData, updateContestData, panel, setPanel }} />
    </div>
  );
};

export default ContestEditor;
