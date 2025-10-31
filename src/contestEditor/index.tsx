import { type FC, useEffect, useRef, useState } from "react";
import { useImmer } from "use-immer";
import type { ImmerContestData } from "@/types/contestData";
import exampleStatements from "./exampleStatements";
import { App, Button, Tabs, type TabsProps, Dropdown } from "antd";
import Body from "./body";
import {
  newProblem,
  removeProblemCallback,
  toImmerContestData,
} from "@/utils/contestDataUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileArrowDown,
  faClockRotateLeft,
  faFloppyDisk,
} from "@fortawesome/free-solid-svg-icons";

import "./index.css";
import { compileToPdf, typstInitPromise } from "@/compiler";
import {
  autoSave,
  loadHistory,
  getHistoryList,
  deleteHistory,
  getCurrentHistoryId,
} from "@/utils/historyStorage";

const ContestEditor: FC = () => {
  // Try to load from history first
  const initialData = (() => {
    const currentHistoryId = getCurrentHistoryId();
    if (currentHistoryId) {
      const historyData = loadHistory(currentHistoryId);
      if (historyData) return historyData;
    }
    return toImmerContestData(exampleStatements["SupportedGrammer"]);
  })();

  const [contestData, updateContestData] =
    useImmer<ImmerContestData>(initialData);
  const [panel, setPanel] = useState("config");
  const [exportDisabled, setExportDisabled] = useState(true);
  const imgsUrlRef = useRef<string[]>(contestData.images.map((img) => img.url));
  useEffect(() => {
    imgsUrlRef.current = contestData.images.map((img) => img.url);
  }, [contestData.images]);
  useEffect(
    () => () => imgsUrlRef.current.forEach((x) => URL.revokeObjectURL(x)),
    []
  );
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

  // Auto-save when contest data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        autoSave(contestData);
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, 1000); // Debounce for 1 second
    return () => clearTimeout(timer);
  }, [contestData]);

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
    updateContestData
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
            <>
              <Button
                icon={<FontAwesomeIcon icon={faFloppyDisk} />}
                onClick={() => {
                  try {
                    autoSave(contestData);
                    notification.success({
                      message: "保存成功",
                      duration: 2,
                    });
                  } catch (error) {
                    notification.error({
                      message: "保存失败",
                      description:
                        error instanceof Error ? error.message : String(error),
                      duration: 3,
                    });
                  }
                }}
                style={{ marginRight: 8 }}
              >
                保存
              </Button>
              <Dropdown
                menu={{
                  items: getHistoryList()
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((history) => ({
                      key: history.id,
                      label: (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <div>{history.title}</div>
                            <div style={{ fontSize: "12px", color: "#888" }}>
                              {new Date(history.timestamp).toLocaleString(
                                "zh-CN"
                              )}
                            </div>
                          </div>
                          <Button
                            type="text"
                            size="small"
                            danger
                            onClick={(e) => {
                              e.stopPropagation();
                              modal.confirm({
                                title: "确认删除该历史记录？",
                                onOk: () => {
                                  deleteHistory(history.id);
                                  notification.success({
                                    message: "删除成功",
                                    duration: 2,
                                  });
                                },
                              });
                            }}
                          >
                            删除
                          </Button>
                        </div>
                      ),
                      onClick: () => {
                        const historyData = loadHistory(history.id);
                        if (historyData) {
                          updateContestData(() => historyData);
                          notification.success({
                            message: "加载成功",
                            description: `已加载历史记录：${history.title}`,
                            duration: 2,
                          });
                        } else {
                          notification.error({
                            message: "加载失败",
                            description: "无法读取历史记录",
                            duration: 3,
                          });
                        }
                      },
                    })),
                }}
              >
                <Button
                  icon={<FontAwesomeIcon icon={faClockRotateLeft} />}
                  style={{ marginRight: 8 }}
                >
                  历史记录
                </Button>
              </Dropdown>
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
            </>
          ),
        }}
      />
      <Body {...{ contestData, updateContestData, panel, setPanel }} />
    </div>
  );
};

export default ContestEditor;
