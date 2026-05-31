import { faAngleLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { App } from "antd";
import { useCallback, useEffect, useMemo, type FC } from "react";
import { useNavigate } from "react-router";

import ExplorerModal from "@/components/ExplorerModal";
import MenuBar, { type MenuGroup } from "@/components/menuBar";
import { useModal } from "@/components/modalWrapper";
import NewDocModal from "@/components/NewDocModal";
import useTemplateManager from "@/components/templateManagerContext";
import useTypstInitStatus from "@/components/typstInitStatusContext";
import { VersionInfoModal } from "@/components/VersionInfoModal";
import { saveDocument } from "@/storage/index.client";
import { recordRecentlyOpened } from "@/utils/.client/indexedDB/recentlyOpened";
import { toImmerContent } from "@/utils/contestDataUtils";
import { removeImmer } from "@/utils/documentZod";
import { documentToJson } from "@/utils/jsonDocument";
import { uploadDocumentFromFile } from "@/utils/uploadDocument";

import { useEditorDoc, useEditorEvents } from "./editorContext";
import { navigateToEditorWithDoc } from "./navigationState";

import "./header.css";

const ContestEditorHeader: FC = () => {
  const { doc, path, modified, setModified, setPath, updateDoc } =
    useEditorDoc();
  const editorEvents = useEditorEvents();
  const { notification, message, modal } = App.useApp();
  const { compiler } = useTemplateManager();
  const navigate = useNavigate();

  const [explorer, explorerContextHolder] = useModal(ExplorerModal);
  const [newDocModal, newDocModalContextHolder] = useModal(NewDocModal);

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

  const confirmDiscardUnsavedChanges = useCallback(async () => {
    if (!modified) return true;
    return await modal.confirm({
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
    });
  }, [modal, modified]);

  const onClickOpen = useCallback(async () => {
    if (!(await confirmDiscardUnsavedChanges())) return;
    const data = await explorer.show({
      mode: "open",
    });
    if (data.state === "success")
      navigateToEditorWithDoc(
        navigate,
        {
          ...data.doc,
          content: toImmerContent(data.doc.content),
        },
        data.path,
      );
  }, [explorer, navigate, confirmDiscardUnsavedChanges]);

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
          });
          const nowUrl = new URL(window.location.href);
          nowUrl.searchParams.set(
            "file",
            data.path.map(encodeURIComponent).join("/"),
          );
          history.replaceState(undefined, "", new URL(nowUrl).href);
          recordRecentlyOpened(data.path, data.doc.name).catch((e) =>
            console.warn("Failed to record recently opened document", e),
          );
          editorEvents.emit("documentSaved", { path: data.path });
        }
      });
  }, [explorer, setPath, updateDoc, doc, editorEvents]);

  const onClickSave = useCallback(async () => {
    if (!path) {
      onClickSaveAs();
      return;
    }
    try {
      await saveDocument(path, doc);
      setModified(false);
      editorEvents.emit("documentSaved", { path });
    } catch (e) {
      console.error("Error when saving document.", e);
      message.error("保存失败");
    }
  }, [doc, path, message, setModified, onClickSaveAs, editorEvents]);

  const onClickUpload = useCallback(async () => {
    await uploadDocumentFromFile({
      navigate,
      beforeOpen: confirmDiscardUnsavedChanges,
      onError: (e) => {
        console.error("Error when loading document from uploaded file.", e);
        message.error("文件加载失败");
      },
    });
  }, [message, confirmDiscardUnsavedChanges, navigate]);

  const onClickDownload = useCallback(async () => {
    const json = await documentToJson(removeImmer(doc));
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [doc]);

  const onClickNew = useCallback(async () => {
    if (!(await confirmDiscardUnsavedChanges())) return;
    newDocModal.show();
  }, [confirmDiscardUnsavedChanges, newDocModal]);

  const [versionInfo, versionInfoContextHolder] = useModal(VersionInfoModal);
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
            key: "new",
            label: "新建",
            onSelect: onClickNew,
          },
          {
            key: "open",
            label: "打开",
            onSelect: onClickOpen,
            shortcut: "Ctrl+O",
          },
          {
            key: "upload",
            label: "从本地上传",
            onSelect: onClickUpload,
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
            key: "download",
            label: "下载到本地",
            onSelect: onClickDownload,
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
            onSelect: () => versionInfo.show(),
          },
        ],
      },
    ],
    [
      navigate,
      onClickExportPDF,
      onClickExportTypstSource,
      typstInitStatus,
      versionInfo,
      onClickSave,
      onClickSaveAs,
      onClickOpen,
      onClickDownload,
      onClickUpload,
      onClickNew,
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
      {versionInfoContextHolder}
      {explorerContextHolder}
      {newDocModalContextHolder}
    </header>
  );
};

export default ContestEditorHeader;
