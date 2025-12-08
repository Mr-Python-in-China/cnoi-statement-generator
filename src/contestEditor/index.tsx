import {
  type FC,
  useEffect,
  useState,
  useMemo,
  use,
  Suspense,
  useCallback,
} from "react";
import { useImmer } from "use-immer";
import type { ImmerContestData } from "@/types/contestData";
import exampleStatements from "./exampleStatements";
import { App, Button, Tabs, type TabsProps, Space, Dropdown } from "antd";
import Body from "./body";
import {
  newProblem,
  removeProblemCallback,
  toImmerContestData,
} from "@/utils/contestDataUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileArrowDown,
  faEllipsisVertical,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
import { debounce } from "lodash-es";
import { compileToPdf, typstInitPromise, registerAssetUrls } from "@/compiler";
import {
  saveConfigToDB,
  loadConfigFromDB,
  exportConfig,
  importConfig,
  saveImageToDB,
  clearDB,
} from "@/utils/indexedDBUtils";

import "./index.css";

interface InitialData {
  ContestData: ImmerContestData;
}

const ContestEditorImpl: FC<{
  initialData: InitialData;
}> = ({ initialData }) => {
  const [contestData, updateContestData] = useImmer<ImmerContestData>(
    initialData.ContestData,
  );

  // Register asset blob URLs with compiler whenever images change
  useEffect(() => {
    const mapping = new Map(
      contestData.images.map((img) => [img.uuid, img.url]),
    );
    registerAssetUrls(mapping);
  }, [contestData.images]);

  const [panel, setPanel] = useState("config");
  const [exportDisabled, setExportDisabled] = useState(true);

  // Create a debounced save function (saves at most once per 500ms)
  const debouncedSave = useMemo(
    () =>
      debounce(async (data: ImmerContestData) => {
        try {
          await saveConfigToDB(data);
        } catch (error) {
          console.error("Failed to auto-save:", error);
        }
      }, 500),
    [],
  );

  // Auto-save to IndexedDB whenever contestData changes (debounced)
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
  }, []);
  const removeProblem = removeProblemCallback(
    modal,
    setPanel,
    updateContestData,
  );
  const onClickExportPDF = useCallback(async () => {
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
      console.error("Error when exporting PDF.", e);
      notification.error({
        title: "导出失败",
        placement: "bottomRight",
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
  }, [contestData, exportDisabled, notification]);
  const onClickImportConfig = useCallback(() => {
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
            contestData.images.forEach((img) => URL.revokeObjectURL(img.url));

            // Create blob URLs and save to IndexedDB
            const imageList: typeof contestData.images = [];
            for (const [uuid, blob] of images.entries()) {
              const url = URL.createObjectURL(blob);

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
              await saveImageToDB(uuid, blob);
            }

            const dataWithUrls = {
              ...data,
              images: imageList,
            };

            updateContestData(() => toImmerContestData(dataWithUrls));
            setPanel("config");
            message.success("配置导入成功");
          } catch (error) {
            notification.error({
              title: "导入失败",
              placement: "bottomRight",
              description:
                error instanceof Error ? error.message : String(error),
              duration: 5,
            });
            console.error("Error when importing config.", error);
          }
        };
        reader.readAsText(file);
      } catch (error) {
        notification.error({
          title: "导入失败",
          placement: "bottomRight",
          description: error instanceof Error ? error.message : String(error),
          duration: 5,
        });
        console.error("Error when importing config.", error);
      }
    };
    input.click();
  }, [contestData, message, notification, updateContestData]);
  const onClickExportConfig = useCallback(async () => {
    try {
      const json = await exportConfig(contestData);
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
        title: "导出失败",
        placement: "bottomRight",
        description: error instanceof Error ? error.message : String(error),
        duration: 5,
        showProgress: true,
        pauseOnHover: true,
      });
      console.error("Error when exporting config.", error);
    }
  }, [contestData, message, notification]);
  const onClickLoadExampleConfig = useCallback(
    async ({ key }: { key: string }) => {
      const r = await modal.confirm({
        title: "载入示例配置",
        content: "载入示例配置将会覆盖当前的所有配置，是否继续？",
        okText: "继续",
        cancelText: "取消",
      });
      if (!r) return;
      for (const i of contestData.images) URL.revokeObjectURL(i.url);
      const example = exampleStatements[key];
      setPanel("config");
      const conf = toImmerContestData({
        ...example,
        images: [],
      });
      updateContestData(() => conf);
      await clearDB();
      await saveConfigToDB(conf);
      message.success("示例配置已经载入");
    },
    [contestData.images, message, modal, updateContestData],
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
              <div className="contest-editor-autosave-indicator">
                <FontAwesomeIcon icon={faCircleInfo} /> 你的修改将自动保存
              </div>
              <Button
                type="primary"
                icon={<FontAwesomeIcon icon={faFileArrowDown} />}
                disabled={exportDisabled}
                onClick={onClickExportPDF}
              >
                导出 PDF
              </Button>
              <Dropdown
                placement="bottomRight"
                trigger={["click"]}
                menu={{
                  items: [
                    {
                      key: "import config",
                      label: "导入配置",
                      onClick: onClickImportConfig,
                    },
                    {
                      key: "export config",
                      label: "导出配置",
                      onClick: onClickExportConfig,
                    },
                    {
                      key: "load example config",
                      label: "加载示例配置",
                      children: Object.keys(exampleStatements).map((x) => ({
                        key: x,
                        label: x,
                      })),
                      onClick: onClickLoadExampleConfig,
                    },
                  ],
                }}
              >
                <Button
                  title="更多操作"
                  icon={<FontAwesomeIcon icon={faEllipsisVertical} />}
                />
              </Dropdown>
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
        }}
      />
    </div>
  );
};

const ContestEditorWithInitalPromise: FC<{
  initialPromise: Promise<InitialData>;
}> = ({ initialPromise }) => {
  const initialData = use(initialPromise);
  return <ContestEditorImpl initialData={initialData} />;
};

const ContestEditor: FC = () => {
  const initialPromise = (async () => {
    const stored = await loadConfigFromDB().catch((e) => {
      console.warn(
        "Error when loading config from DB. Will use default config.",
        e,
      );
      return undefined;
    });

    if (!stored)
      return {
        ContestData: toImmerContestData({
          ...exampleStatements["SupportedGrammar"],
          images: [],
        }),
      };

    // Create blob URLs for images and add them to images array
    const images = stored.data.images || [];
    const imageList = [];

    for (const img of images) {
      const blob = stored.images.get(img.uuid);
      if (blob) {
        const url = URL.createObjectURL(blob);
        imageList.push({
          uuid: img.uuid,
          name: img.name,
          url,
        });
      }
    }

    return {
      ContestData: toImmerContestData({
        ...stored.data,
        images: imageList,
      }),
    };
  })();
  return (
    <Suspense fallback={<div className="contest-editor" />}>
      <ContestEditorWithInitalPromise initialPromise={initialPromise} />
    </Suspense>
  );
};

export default ContestEditor;
