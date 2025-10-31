import { type FC, useEffect, useRef, useState, useMemo } from "react";
import { useImmer } from "use-immer";
import type { ImmerContestData } from "@/types/contestData";
import exampleStatements from "./exampleStatements";
import { App, Button, Tabs, type TabsProps, Space } from "antd";
import Body from "./body";
import {
  newProblem,
  removeProblemCallback,
  toImmerContestData,
} from "@/utils/contestDataUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileArrowDown,
  faFileImport,
  faFileExport,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import debounce from "lodash.debounce";

import "./index.css";
import { compileToPdf, typstInitPromise } from "@/compiler";
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
  exportToFile,
  importFromFile,
} from "@/utils/storageUtils";

const ContestEditor: FC = () => {
  const [contestData, updateContestData] = useImmer<ImmerContestData>(() => {
    // Try to load from localStorage on initialization
    const stored = loadFromLocalStorage();
    if (stored) {
      return toImmerContestData(stored);
    }
    return toImmerContestData(exampleStatements["SupportedGrammer"]);
  });
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

  // Create a debounced save function (saves at most once per 500ms)
  const debouncedSave = useMemo(
    () =>
      debounce((data: ImmerContestData) => {
        try {
          saveToLocalStorage(data);
        } catch (error) {
          console.error("Failed to auto-save:", error);
        }
      }, 500),
    []
  );

  // Auto-save to localStorage whenever contestData changes (debounced)
  useEffect(() => {
    debouncedSave(contestData);
  }, [contestData, debouncedSave]);

  const { modal, notification, message } = App.useApp();
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
            <Space>
              <Button
                type="default"
                icon={<FontAwesomeIcon icon={faRotateLeft} />}
                onClick={async () => {
                  const confirmed = await modal.confirm({
                    title: "确认重置配置",
                    content: "这将清除所有当前的编辑，恢复为初始配置。此操作不可撤销。",
                  });
                  if (confirmed) {
                    clearLocalStorage();
                    const initialData = toImmerContestData(
                      exampleStatements["SupportedGrammer"]
                    );
                    updateContestData(() => initialData);
                    setPanel("config");
                    message.success("配置已重置");
                  }
                }}
                title="重置配置"
              >
                重置
              </Button>
              <Button
                type="default"
                icon={<FontAwesomeIcon icon={faFileImport} />}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "application/json,.json";
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    try {
                      const data = await importFromFile(file);
                      updateContestData(() => toImmerContestData(data));
                      setPanel("config");
                      message.success("配置导入成功");
                    } catch (error) {
                      notification.error({
                        message: "导入失败",
                        description:
                          error instanceof Error
                            ? error.message
                            : String(error),
                        duration: 5,
                      });
                    }
                  };
                  input.click();
                }}
                title="导入配置"
              >
                导入
              </Button>
              <Button
                type="default"
                icon={<FontAwesomeIcon icon={faFileExport} />}
                onClick={() => {
                  try {
                    exportToFile(contestData);
                    message.success("配置导出成功");
                  } catch (error) {
                    notification.error({
                      message: "导出失败",
                      description:
                        error instanceof Error ? error.message : String(error),
                      duration: 5,
                    });
                  }
                }}
                title="导出配置"
              >
                导出
              </Button>
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
          </Space>
          ),
        }}
      />
      <Body {...{ contestData, updateContestData, panel, setPanel }} />
    </div>
  );
};

export default ContestEditor;
