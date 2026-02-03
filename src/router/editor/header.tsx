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

import "./header.css";
import useTemplateManager from "@/components/templateManagerContext";
import useTypstInitStatus from "@/components/typstInitStatusContext";
import {
  exportDocument,
  importDocument,
  toImmerContent,
} from "@/utils/contestDataUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router";
import { useVersionInfo } from "@/components/useVersionInfo";

const ContestEditorHeader: FC<{
  doc: ImmerDocument;
  updateDoc: Updater<ImmerDocument>;
  setPanel: Dispatch<SetStateAction<string>>;
}> = ({ doc, updateDoc: updateDoc, setPanel }) => {
  const { notification, message } = App.useApp();
  const { compiler } = useTemplateManager();
  const navigate = useNavigate();

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
  const onClickImportConfig = useCallback(async () => {
    try {
      const data = await importDocument();
      if (!data) return;
      if (data.uuid === "") data.uuid = doc.uuid;
      if (data.uuid !== doc.uuid) {
        message.error("导入的文档不匹配。");
        return;
      }

      // Clear old images
      doc.content.images.forEach((img) => URL.revokeObjectURL(img.url));

      updateDoc(
        () =>
          ({
            ...data,
            content: toImmerContent(data.content),
            previewImage: undefined,
          }) satisfies ImmerDocument,
      );
      setPanel("config");
      message.success("文档导入成功");
    } catch (error) {
      message.error("文档导入失败");
      console.error("Error when importing config.", error);
    }
  }, [doc.content.images, doc.uuid, message, setPanel, updateDoc]);
  const onClickExportConfig = useCallback(async () => {
    try {
      await exportDocument(doc);
      message.success("文档备份成功");
    } catch (error) {
      message.error("文档备份失败");
      console.error("Error when exporting config.", error);
    }
  }, [message, doc]);
  const onClickExportTypstSource = useCallback(async () => {
    try {
      const data = await compiler.exportTypstSourceZip(doc.content);
      if (!data) throw new Error("Compiler did not return any data.");
      const blob = new Blob([data], {
        type: "application/zip",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.name}-source.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      message.success("Typst 源代码导出成功");
    } catch (e) {
      message.error("Typst 源代码导出失败");
      console.error("Error when exporting Typst source zip.", e);
    }
  }, [compiler, doc.name, doc.content, message]);
  const versionInfo = useVersionInfo();
  const menuGroup = useMemo(
    (): MenuGroup[] => [
      {
        key: "home",
        label: (
          <>
            <FontAwesomeIcon icon={faAngleLeft} />
            主页
          </>
        ),
        onSelect: () => navigate("/"),
      },
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
          {
            key: "export typst source",
            label: "导出 Typst 源代码",
            onSelect: onClickExportTypstSource,
            disabled: typstInitStatus !== "fulfilled",
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
            onSelect: versionInfo.show,
          },
        ],
      },
    ],
    [
      navigate,
      onClickExportConfig,
      onClickExportPDF,
      onClickExportTypstSource,
      onClickImportConfig,
      typstInitStatus,
      versionInfo.show,
    ],
  );
  return (
    <header>
      <div>
        <MenuBar menuGroup={menuGroup} />
      </div>
      <div className="file-name">{doc.name}</div>
      {versionInfo.contextHolder}
    </header>
  );
};

export default ContestEditorHeader;
