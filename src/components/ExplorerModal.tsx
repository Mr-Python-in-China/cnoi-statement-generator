import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { App, AutoComplete, Breadcrumb, Button, Modal, Space } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

import { loadDocument, saveDocument, storageMethods } from "@/storage";
import {
  DocNotFoundError,
  LoadDocumentError,
  SaveDocumentError,
} from "@/storage/errors";
import type { ExplorerItem, StorageMethodObject } from "@/storage/types";
import type { DocumentBase } from "@/types/document";
import { deleteRecentlyOpened } from "@/utils/indexedDB/recentlyOpened";

import ExplorerPage from "./ExplorerPage";
import { createModal } from "./modalWrapper";

import "./ExplorerModal.css";

const Page: StorageMethodObject["ExplorerPage"] = ({
  path,
  mode,
  onSelect,
  onOpenFolder,
  setFileItems,
  onConfirm,
}) => {
  if (path.length === 0)
    return (
      <ExplorerPage
        onOpenFolder={onOpenFolder}
        items={Object.entries(storageMethods).map(([key, method]) => ({
          key,
          name: method.name,
          type: "folder",
          icon: method.icon,
        }))}
        onSelect={() => {
          throw new Error("Oops... This function shouldn't be called!");
        }} // everything is a folder, so this won't be called
        setFileItems={setFileItems}
        onConfirm={onConfirm}
      />
    );

  const currentStorageKey = path[0];
  if (!(currentStorageKey in storageMethods))
    throw new Error(`Unsupported storage method: ${currentStorageKey}`);
  const StorageExplorerPage =
    storageMethods[currentStorageKey as keyof typeof storageMethods]
      .ExplorerPage;
  return (
    <StorageExplorerPage
      path={path.slice(1)}
      mode={mode}
      onSelect={(url) => onSelect(url)}
      onOpenFolder={onOpenFolder}
      setFileItems={setFileItems}
      onConfirm={onConfirm}
    />
  );
};

export type ExplorerResult =
  | {
      state: "success";
      path: string[];
      doc: DocumentBase;
    }
  | { state: "cancelled" };

export type ExplorerProps =
  | {
      mode: "open";
    }
  | { mode: "save"; doc: DocumentBase };

const ExplorerModal = createModal<ExplorerProps, ExplorerResult>((props) => {
  const { message } = App.useApp();
  const [navState, setNavState] = useState(() => ({
    history: [new Array<string>()],
    index: 0,
  }));
  const [filekey, setFilekey] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileItems, setFileItems] = useState<ExplorerItem[] | undefined>(
    undefined,
  );

  const handleSetFileItems = useCallback(
    (items: ExplorerItem[]) =>
      setFileItems((prev) => {
        let changed = false;
        if (prev === undefined || prev.length !== items.length) changed = true;
        else
          for (let i = 0; i < prev.length; i++)
            if (prev[i].key !== items[i].key) {
              changed = true;
              break;
            }
        return changed ? items : prev;
      }),
    [],
  );

  const currentPath = navState.history[navState.index];

  const isSamePath = (a: string[], b: string[]) =>
    a.length === b.length && a.every((value, idx) => value === b[idx]);

  const navigateTo = useCallback((nextPath: string[]) => {
    setNavState((state) => {
      if (isSamePath(state.history[state.index], nextPath)) return state;
      const history = state.history.slice(0, state.index + 1);
      history.push(nextPath);
      setFileItems(undefined);
      return { history, index: history.length - 1 };
    });
  }, []);

  const goBack = useCallback(
    () =>
      setNavState((state) =>
        state.index > 0 ? { ...state, index: state.index - 1 } : state,
      ),
    [],
  );

  const goForward = useCallback(() => {
    setNavState((state) =>
      state.index < state.history.length - 1
        ? { ...state, index: state.index + 1 }
        : state,
    );
  }, []);

  useEffect(() => {
    setFilekey("");
    // oxlint-disable-next-line eslint-plugin-react-hooks/exhaustive-deps
  }, [currentPath.map(encodeURIComponent).join("/")]);

  const breadcrumbItems = useMemo(
    () => [
      {
        title: (
          <button
            type="button"
            className="explorer-breadcrumb-button"
            onClick={() => navigateTo([])}
          >
            根目录
          </button>
        ),
      },
      ...currentPath.map((segment, index) => ({
        title: (
          <button
            type="button"
            className="explorer-breadcrumb-button"
            onClick={() => navigateTo(currentPath.slice(0, index + 1))}
          >
            {segment}
          </button>
        ),
      })),
    ],
    [currentPath, navigateTo],
  );

  const closeAsCancelled = useCallback(() => {
    props.modalHandler.resolveHide({ state: "cancelled" });
  }, [props.modalHandler]);

  const handleConfirm = async (file: string | string[] | ExplorerItem) => {
    const path = Array.isArray(file)
      ? [...currentPath, ...file]
      : [...currentPath, typeof file === "string" ? file : file.key];
    try {
      if (props.mode === "open") {
        if (!Array.isArray(file)) {
          const fileObj =
            typeof file === "string"
              ? fileItems?.find((item) => item.key === file)
              : file;
          if (!fileObj) {
            message.error("文件不存在");
            return;
          }
          setLoading(true);
          if (fileObj.type === "folder") {
            navigateTo(path);
            return;
          }
        }
        const doc = await loadDocument(path);
        message.success("打开成功");
        props.modalHandler.resolveHide({ state: "success", doc, path });
      } else {
        const doc = await saveDocument(path, props.doc);
        message.success("保存成功");
        props.modalHandler.resolveHide({ state: "success", doc, path });
      }
    } catch (error) {
      if (error instanceof DocNotFoundError) {
        message.error("文档不存在");
        try {
          await deleteRecentlyOpened(path);
        } catch (e) {
          console.warn(
            "Failed to delete recently opened entry after document not found",
            e,
          );
        }
      } else if (
        error instanceof LoadDocumentError ||
        error instanceof SaveDocumentError
      ) {
        message.error(error.message);
      } else {
        message.error(props.mode === "open" ? "打开失败" : "保存失败");
      }
      console.error(
        `Failed to ${props.mode === "open" ? "open" : "save"} document`,
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={props.mode === "open" ? "打开文件" : "保存文件"}
      open={props.modalHandler.visible}
      afterClose={props.modalHandler.remove}
      onCancel={closeAsCancelled}
      className="explorer-modal"
      classNames={{ body: "explorer-modal-body" }}
      width="100%"
      style={{
        height: "100%",
        top: 0,
        margin: "0 auto",
        padding: 16,
        maxWidth: 1200,
      }}
      footer={
        <Space>
          <Button onClick={closeAsCancelled}>取消</Button>
          <Button
            type="primary"
            loading={loading}
            disabled={!filekey}
            onClick={() => handleConfirm(filekey)}
          >
            {props.mode === "open" ? "打开" : "保存"}
          </Button>
        </Space>
      }
      mask={{
        closable: false,
      }}
    >
      <div className="explorer-toolbar">
        <div className="explorer-nav">
          <Button
            type="text"
            onClick={goBack}
            disabled={navState.index === 0}
            aria-label="后退"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Button>
          <Button
            type="text"
            onClick={goForward}
            disabled={navState.index >= navState.history.length - 1}
            aria-label="前进"
          >
            <FontAwesomeIcon icon={faArrowRight} />
          </Button>
        </div>
        <div className="explorer-address">
          <Breadcrumb items={breadcrumbItems} />
        </div>
      </div>
      <div className="explorer-content">
        <Page
          path={currentPath}
          mode={props.mode}
          onSelect={(key) => setFilekey(key)}
          onOpenFolder={(key: string) => navigateTo([...currentPath, key])}
          setFileItems={handleSetFileItems}
          onConfirm={handleConfirm}
        />
      </div>
      <div className="explorer-footer">
        <label className="explorer-filename-label" htmlFor="explorer-filename">
          文件名
        </label>
        <AutoComplete
          id="explorer-filename"
          backfill
          value={filekey}
          onChange={(v) => setFilekey(v)}
          placeholder="输入文件名"
          options={fileItems?.map((x) => ({
            label: x.key,
            value: x.key,
          }))}
          disabled={fileItems === undefined || loading}
        />
      </div>
    </Modal>
  );
});

export default ExplorerModal;
