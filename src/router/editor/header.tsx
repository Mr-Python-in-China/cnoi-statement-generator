import type { ImmerDocument } from "@/types/document";
import {
  useCallback,
  useEffect,
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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router";
import { useVersionInfo } from "@/components/useVersionInfo";
import { saveDocument } from "@/storage";
import useExplorer from "@/components/useExplorer";
import { toImmerContent } from "@/utils/contestDataUtils";
import navigationState from "./navigationState";

const ContestEditorHeader: FC<{
  doc: ImmerDocument;
  path: string[];
  updateDoc: Updater<ImmerDocument>;
  setPanel: Dispatch<SetStateAction<string>>;
  setPath: Dispatch<SetStateAction<string[]>>;
  modified: boolean;
  setModified: Dispatch<SetStateAction<boolean>>;
}> = ({ doc, path, modified, setModified, setPath, updateDoc }) => {
  const { notification, message, modal } = App.useApp();
  const { compiler } = useTemplateManager();
  const navigate = useNavigate();
  const explorer = useExplorer();

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

  const onClickSave = useCallback(async () => {
    try {
      await saveDocument(path, doc);
      setModified(false);
    } catch (e) {
      console.error("Error when saving document.", e);
      message.error("保存失败");
    }
  }, [doc, path, message, setModified]);

  const onClickOpen = useCallback(async () => {
    const confirmed =
      !modified ||
      (await modal.confirm({
        content: (
          <>
            你确定要继续吗？
            <br />
            未保存的更改将会丢失。
          </>
        ),
        mask: {
          closable: true,
        },
      }));
    if (!confirmed) return;
    const data = await explorer.show({
      mode: "open",
    });
    if (data.state === "success") {
      const url = new URL(window.location.href);
      url.searchParams.set("file", data.path.map(encodeURIComponent).join("/"));
      url.searchParams.set("_noConfirm", "");
      navigationState.value = {
        doc: {
          ...data.doc,
          content: toImmerContent(data.doc.content),
          previewImage: undefined,
        },
      };
      navigate({
        search: url.search,
      });
    }
  }, [explorer, modal, modified, navigate]);

  const onClickSaveAs = useCallback(() => {
    explorer
      .show({
        mode: "save",
        doc,
      })
      .then((data) => {
        if (data.state === "success") {
          setPath(data.path);
          updateDoc({
            ...data.doc,
            content: toImmerContent(data.doc.content),
            previewImage: undefined,
          });
          const nowUrl = new URL(window.location.href);
          nowUrl.searchParams.set(
            "file",
            data.path.map(encodeURIComponent).join("/"),
          );
          history.replaceState(undefined, "", new URL(nowUrl).href);
        }
      });
  }, [explorer, setPath, updateDoc, doc]);

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
            key: "open",
            label: "打开",
            onSelect: onClickOpen,
            shortcut: "Ctrl+O",
          },
          {
            key: "save",
            label: "保存",
            onSelect: onClickSave,
            shortcut: "Ctrl+S",
          },
          {
            key: "saveAs",
            label: "另存为",
            onSelect: onClickSaveAs,
            shortcut: "Ctrl+Shift+S",
          },
          {
            key: "export PDF",
            label: "导出 PDF",
            onSelect: onClickExportPDF,
            disabled: typstInitStatus !== "fulfilled",
            shortcut: "Ctrl+Shift+P",
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
      onClickExportPDF,
      onClickExportTypstSource,
      typstInitStatus,
      versionInfo.show,
      onClickSave,
      onClickSaveAs,
      onClickOpen,
    ],
  );
  useEffect(() => {
    document.title = `${modified ? "● " : ""}${doc.name} - CNOI Statement Generator`;
  });
  return (
    <header>
      <div>
        <MenuBar menuGroup={menuGroup} />
      </div>
      <div className="title">
        <div className="file-name">{doc.name}</div>
        {modified && <div className="modified-indicator">●</div>}
      </div>
      {versionInfo.contextHolder}
      {explorer.ContextHolder}
    </header>
  );
};

export default ContestEditorHeader;
