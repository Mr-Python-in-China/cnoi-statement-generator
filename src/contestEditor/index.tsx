import {
  type FC,
  useEffect,
  useState,
  useMemo,
  use,
  Suspense,
  useCallback,
} from "react";
import { useImmer, type Updater } from "use-immer";
import type {
  ContentBase,
  DocumentBase,
  ImmerContent,
  ImmerDocument,
} from "@/types/document";
import { App, Button, Tabs, type TabsProps, Space, Dropdown } from "antd";
import Body from "./body";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileArrowDown,
  faEllipsisVertical,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
import { debounce } from "lodash-es";
import useTemplateManager, {
  TemplateManagerContext,
} from "@/components/templateManagerContext";

import "./index.css";
import {
  getFirstDocumentUUID,
  loadDocumentFromDB,
  saveContentToDB,
} from "@/utils/indexedDBUtils";
import TemplateManager from "@/templateManager";
import { removeProblemCallback } from "@/utils/contestDataUtils";
import TypstInitStatusProvider from "@/components/typstInitStatusProvider";

function toImmerContent(content: ContentBase): ImmerContent {
  return {
    ...content,
    images: content.images.map((img) => ({
      ...img,
      url: URL.createObjectURL(img.blob),
    })),
  };
}

function toImmerDocument(doc: DocumentBase): ImmerDocument {
  return {
    ...doc,
    content: toImmerContent(doc.content),
  };
}

const ContestEditorImpl: FC<{ initialDoc: DocumentBase }> = ({
  initialDoc,
}) => {
  const templateManager = useTemplateManager();
  const compiler = templateManager.compiler;
  const uiMeta = use(templateManager.uiMetadataPromise);

  const [doc, updateDoc] = useImmer<ImmerDocument>(toImmerDocument(initialDoc));
  const content = doc.content;
  const updateContent =
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(
      ((updater) => {
        if (typeof updater === "function")
          updateDoc((d) => {
            const x = updater(d.content);
            if (x !== undefined)
              return {
                ...d,
                content: x,
              };
          });
        else
          updateDoc((d) => {
            d.content = updater;
          });
      }) satisfies Updater<ImmerContent>,
      [updateDoc],
    );

  // Register asset blob URLs with compiler whenever images change
  useEffect(() => {
    const mapping = new Map(content.images.map((img) => [img.uuid, img.url]));
    compiler.registerAssetUrls(mapping);
  }, [compiler, content.images]);

  // "config" | "extra-{name}" | "{problem-uuid}"
  const [panel, setPanel] = useState("config");
  const [exportDisabled, setExportDisabled] = useState(true);

  // Create a debounced save function (saves at most once per 500ms)
  const debouncedSave = useMemo(
    () =>
      debounce(async (data: ImmerContent) => {
        try {
          await saveContentToDB(doc.uuid, data);
        } catch (error) {
          console.error("Failed to auto-save:", error);
        }
      }, 500),
    [doc.uuid],
  );

  // Auto-save to IndexedDB whenever content changes (debounced)
  useEffect(() => {
    debouncedSave(content);
  }, [content, debouncedSave]);

  const { modal, notification, message } = App.useApp();
  const items: TabsProps["items"] = [
    {
      key: "config",
      label: "基础信息",
      closable: false,
      destroyOnHidden: true,
    },
    ...Object.entries(uiMeta.extraContents).map(([extraName, meta]) => ({
      key: `extra-${extraName}`,
      label: meta.displayName,
      closeable: false,
      destroyOnHidden: true,
    })),
    ...content.problems.map((x, i) => ({
      key: x.uuid,
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
    compiler.typstInitPromise.then(() => {
      if (mounted) setExportDisabled(false);
    });
    return () => {
      mounted = false;
    };
  }, [compiler]);
  const removeProblem = removeProblemCallback(modal, setPanel, updateContent);
  const onClickExportPDF = useCallback(async () => {
    if (exportDisabled) return;
    setExportDisabled(true);
    try {
      const data = await compiler.compileToPdf(content);
      if (!data) throw new Error("编译器未返回任何数据");
      const blob = new Blob([data.slice().buffer], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.name}.pdf`;
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
  }, [doc.name, compiler, content, exportDisabled, notification]);
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
            const data = await import("@/utils/jsonDocument").then((mod) =>
              mod.importDocument(json),
            );

            // Clear old images
            content.images.forEach((img) => URL.revokeObjectURL(img.url));

            updateContent(() => toImmerContent(data.content));
            setPanel("config");
            message.success("文档导入成功");
          } catch (error) {
            notification.error({
              title: "导入失败",
              placement: "bottomRight",
              description: "无法解析此文档。",
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
          description: "无法解析此文档。",
          duration: 5,
        });
        console.error("Error when importing config.", error);
      }
    };
    input.click();
  }, [content, message, notification, updateContent]);
  const onClickExportConfig = useCallback(async () => {
    try {
      const json = await import("@/utils/jsonDocument").then((mod) =>
        mod.exportDocument(doc),
      );
      const blob = new Blob([json], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.name}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success("文档导出成功");
    } catch (error) {
      notification.error({
        title: "导出失败",
        placement: "bottomRight",
        description: "出现神秘错误。查看控制台了解详情。",
        duration: 5,
        showProgress: true,
        pauseOnHover: true,
      });
      console.error("Error when exporting config.", error);
    }
  }, [message, notification, doc]);
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
            const v = uiMeta.createNewProblem(content);
            setPanel(v.uuid);
            updateContent((draft) => {
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
                      label: "导入文档",
                      onClick: onClickImportConfig,
                    },
                    {
                      key: "export config",
                      label: "导出文档",
                      onClick: onClickExportConfig,
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
          content,
          updateContent,
          panel,
          setPanel,
        }}
      />
    </div>
  );
};

const ContestEditorWithInitalPromise: FC<{
  initialPromise: Promise<{
    doc: DocumentBase;
    templateManager: TemplateManager;
  }>;
}> = ({ initialPromise }) => {
  const { doc, templateManager } = use(initialPromise);
  return (
    <TemplateManagerContext.Provider value={templateManager}>
      <TypstInitStatusProvider>
        <ContestEditorImpl initialDoc={doc} />
      </TypstInitStatusProvider>
    </TemplateManagerContext.Provider>
  );
};

const ContestEditor: FC = () => {
  console.log("ContestEditor rendered");
  const initialPromise = (async () => {
    const uuid = await getFirstDocumentUUID();
    if (!uuid) throw new Error("didn't impl");
    const document = await loadDocumentFromDB(uuid);
    if (!document) throw new Error("Document not found in DB");
    return {
      doc: document,
      templateManager: new TemplateManager(document.templateId),
    };
  })();
  return (
    <Suspense fallback={<div className="contest-editor" />}>
      <ContestEditorWithInitalPromise initialPromise={initialPromise} />
    </Suspense>
  );
};

export default ContestEditor;
