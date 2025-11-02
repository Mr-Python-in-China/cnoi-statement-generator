import { type FC, useEffect, useRef, useState, useMemo } from "react";
import { useImmer } from "use-immer";
import type { ImmerContestData } from "@/types/contestData";
import type ContestData from "@/types/contestData";
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
import { debounce } from "lodash";

import "./index.css";
import { compileToPdf, typstInitPromise, registerAssetUrls } from "@/compiler";
import {
  saveConfigToDB,
  loadConfigFromDB,
  clearDB,
  exportConfig,
  importConfig,
  saveImageToDB,
} from "@/utils/indexedDBUtils";

const ContestEditor: FC = () => {
  // Map of UUID to blob URL for images
  const [imageMapping, setImageMapping] = useState<Map<string, string>>(
    new Map()
  );
  // Map of UUID to Blob for persistence
  const imageBlobsRef = useRef<Map<string, Blob>>(new Map());

  const [contestData, updateContestData] = useImmer<ImmerContestData>(() => {
    return toImmerContestData(exampleStatements["SupportedGrammer"]);
  });

  // Register asset blob URLs with compiler whenever they change
  useEffect(() => {
    registerAssetUrls(imageMapping);
  }, [imageMapping]);

  // Load data from IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await loadConfigFromDB();
        if (stored && mounted) {
          // Create blob URLs for images
          const newImageMapping = new Map<string, string>();
          const images = stored.data.images || [];

          for (const img of images) {
            const blob = stored.images.get(img.uuid);
            if (blob) {
              const url = URL.createObjectURL(blob);
              newImageMapping.set(img.uuid, url);
              imageBlobsRef.current.set(img.uuid, blob);
            }
          }

          setImageMapping(newImageMapping);

          // Update contest data with blob URLs
          const dataWithUrls = {
            ...stored.data,
            images: images.map((img) => ({
              uuid: img.uuid,
              name: img.name,
              url: newImageMapping.get(img.uuid) || "",
            })),
          };

          updateContestData(() =>
            toImmerContestData(
              dataWithUrls as ContestData<{ withMarkdown: true }>
            )
          );
        }
      } catch (error) {
        console.error("Failed to load from IndexedDB:", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [updateContestData]);

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
      debounce(async (data: ImmerContestData, mapping: Map<string, string>) => {
        try {
          await saveConfigToDB(data, mapping);
        } catch (error) {
          console.error("Failed to auto-save:", error);
        }
      }, 500),
    []
  );

  // Auto-save to IndexedDB whenever contestData changes (debounced)
  useEffect(() => {
    debouncedSave(contestData, imageMapping);
  }, [contestData, imageMapping, debouncedSave]);

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
                    content:
                      "这将清除所有当前的编辑，恢复为初始配置。此操作不可撤销。",
                  });
                  if (confirmed) {
                    // Clear IndexedDB and revoke blob URLs
                    await clearDB();
                    imageMapping.forEach((url) => URL.revokeObjectURL(url));
                    setImageMapping(new Map());
                    imageBlobsRef.current.clear();

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
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        try {
                          const json = event.target?.result as string;
                          const { data, images } = await importConfig(json);

                          // Clear old images
                          imageMapping.forEach((url) =>
                            URL.revokeObjectURL(url)
                          );
                          const newImageMapping = new Map<string, string>();
                          imageBlobsRef.current.clear();

                          // Create blob URLs and save to IndexedDB
                          const imageList: typeof contestData.images = [];
                          for (const [uuid, blob] of images.entries()) {
                            const url = URL.createObjectURL(blob);
                            newImageMapping.set(uuid, url);
                            imageBlobsRef.current.set(uuid, blob);

                            // Find image name
                            const imgData = (
                              data.images as Array<{
                                uuid: string;
                                name: string;
                              }>
                            )?.find((i) => i.uuid === uuid);
                            imageList.push({
                              uuid,
                              name: imgData?.name || "image",
                              url,
                            });

                            // Save to IndexedDB
                            await saveImageToDB(
                              uuid,
                              imgData?.name || "image",
                              blob
                            );
                          }

                          setImageMapping(newImageMapping);

                          const dataWithUrls = {
                            ...data,
                            images: imageList,
                          };

                          updateContestData(() =>
                            toImmerContestData(
                              dataWithUrls as ContestData<{
                                withMarkdown: true;
                              }>
                            )
                          );
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
                      reader.readAsText(file);
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
                onClick={async () => {
                  try {
                    const json = await exportConfig(
                      contestData,
                      imageMapping
                    );
                    const blob = new Blob([json], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${contestData.title || "contest"}-${Date.now()}-config.json`;
                    a.click();
                    URL.revokeObjectURL(url);
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
                          <div>
                            {e instanceof Error ? e.message : String(e)}
                          </div>
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
      <Body
        {...{
          contestData,
          updateContestData,
          panel,
          setPanel,
          imageMapping,
          imageBlobsRef,
          setImageMapping,
        }}
      />
    </div>
  );
};

export default ContestEditor;
