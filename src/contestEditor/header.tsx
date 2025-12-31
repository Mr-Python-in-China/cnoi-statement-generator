import type { ImmerDocument } from "@/types/document";
import {
  useCallback,
  useMemo,
  type Dispatch,
  type FC,
  type SetStateAction,
} from "react";
import { type Updater } from "use-immer";
import MenuBar, { type MenuGroup } from "@/components/menuBar";
import { App } from "antd";
import { toImmerDocument } from "@/utils/contestDataUtils";

import "./header.css";
import useTemplateManager from "@/components/templateManagerContext";
import useTypstInitStatus from "@/components/typstInitStatusContext";

const ContestEditorHeader: FC<{
  doc: ImmerDocument;
  updateDoc: Updater<ImmerDocument>;
  setPanel: Dispatch<SetStateAction<string>>;
}> = ({ doc, updateDoc: updateDoc, setPanel }) => {
  const { notification, message } = App.useApp();
  const { compiler } = useTemplateManager();

  const typstInitStatus = useTypstInitStatus();

  const onClickExportPDF = useCallback(async () => {
    try {
      const data = await compiler.compileToPdf(doc.content);
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
  }, [compiler, doc.content, doc.name, notification]);
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

            if (data.uuid === "") data.uuid = doc.uuid;
            if (data.uuid !== doc.uuid) {
              message.error("导入的文档不匹配。");
              return;
            }

            // Clear old images
            doc.content.images.forEach((img) => URL.revokeObjectURL(img.url));

            updateDoc(() => toImmerDocument(data));
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
  }, [
    doc.content.images,
    doc.uuid,
    message,
    notification,
    setPanel,
    updateDoc,
  ]);
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
  const menuGroup = useMemo(
    (): MenuGroup[] => [
      {
        key: "file",
        label: "文件",
        items: [
          {
            key: "export PDF",
            label: "导出 PDF",
            onSelect: onClickExportPDF,
            disabled: typstInitStatus !== "fulfilled",
          },
          {
            key: "backup document",
            label: "备份文档",
            onSelect: onClickExportConfig,
          },
          {
            key: "import document",
            label: "导入文档",
            onSelect: onClickImportConfig,
          },
        ],
      },
      {
        key: "help",
        label: "帮助",
        items: [
          {
            key: "about",
            label: "关于",
          },
        ],
      },
    ],
    [
      onClickExportConfig,
      onClickExportPDF,
      onClickImportConfig,
      typstInitStatus,
    ],
  );
  return (
    <header>
      <div>
        <MenuBar menuGroup={menuGroup} />
      </div>
      <div className="file-name">{doc.name}</div>
    </header>
  );
};

export default ContestEditorHeader;
