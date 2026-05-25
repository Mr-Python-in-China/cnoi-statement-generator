import { useCallback, useEffect, useRef } from "react";
import type { StorageMethodObject } from "../types";
import { App, Button } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHardDrive, faInbox } from "@fortawesome/free-solid-svg-icons";
import type { DocumentBase } from "@/types/document";
import {
  DocNotFoundError,
  LoadDocumentError,
  SaveDocumentError,
} from "../errors";
import { documentToJson, jsonToDocument } from "@/utils/jsonDocument";

import "./index.css";
import { getFsHandle, saveFsHandle } from "@/utils/indexedDB/fsHandles";

const jsonPickerOptions: OpenFilePickerOptions = {
  multiple: false,
  types: [
    {
      description: "JSON 文件",
      accept: {
        "application/json": [".csg", ".json"],
      },
    },
  ],
};

const jsonSaveOptions: SaveFilePickerOptions = {
  types: jsonPickerOptions.types,
  startIn: "documents",
};

const ensureFileLoadSystemApi = () => {
  if (!("showOpenFilePicker" in window))
    throw new LoadDocumentError("当前浏览器不支持");
};

const ensureFileSaveSystemApi = () => {
  if (!("showSaveFilePicker" in window))
    throw new SaveDocumentError("当前浏览器不支持");
};

const ensureLoadPermission = async (handle: FileSystemFileHandle) => {
  const status = await handle.queryPermission({ mode: "read" });
  if (status === "granted") return;
  const next = await handle.requestPermission({ mode: "read" });
  if (next !== "granted") {
    throw new LoadDocumentError("未授予文件访问权限");
  }
};

const ensureSavePermission = async (handle: FileSystemFileHandle) => {
  const status = await handle.queryPermission({ mode: "readwrite" });
  if (status === "granted") return;
  const next = await handle.requestPermission({ mode: "readwrite" });
  if (next !== "granted") {
    throw new SaveDocumentError("未授予文件访问权限");
  }
};

export default {
  name: "本机",
  saveDocument: async (
    path: string[],
    content: DocumentBase,
  ): Promise<DocumentBase> => {
    ensureFileSaveSystemApi();
    const handle = await getFsHandle(path);
    if (!handle) throw new DocNotFoundError("File handle not found");
    await ensureSavePermission(handle);
    const writable = await handle.createWritable();
    const payload = {
      ...content,
      name: handle.name || content.name,
    };
    await writable.write(await documentToJson(payload));
    await writable.close();
    return payload;
  },
  loadDocument: async (path: string[]): Promise<DocumentBase> => {
    ensureFileLoadSystemApi();
    const handle = await getFsHandle(path);
    if (!handle) {
      throw new DocNotFoundError("File handle not found");
    }
    await ensureLoadPermission(handle);
    const file = await handle.getFile();
    const doc = await jsonToDocument(await file.text());
    return {
      ...doc,
      name: handle.name || doc.name,
    };
  },
  icon: <FontAwesomeIcon icon={faHardDrive} />,
  ExplorerPage: ({ onConfirm, mode }) => {
    const didAutoPick = useRef(false);
    const onConfirmRef = useRef(onConfirm);
    const { message } = App.useApp();

    useEffect(() => {
      onConfirmRef.current = onConfirm;
    }, [onConfirm]);

    const handlePickFile = useCallback(async () => {
      try {
        let handle: FileSystemFileHandle;
        if (mode === "open") {
          ensureFileLoadSystemApi();
          handle = (await window.showOpenFilePicker(jsonPickerOptions))[0];
        } else {
          ensureFileSaveSystemApi();
          handle = await window.showSaveFilePicker(jsonSaveOptions);
        }
        if (!handle) return;
        const key = await saveFsHandle(handle);
        onConfirmRef.current(key);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        message.error(
          error instanceof LoadDocumentError ||
            error instanceof SaveDocumentError
            ? error.message
            : "操作失败",
        );
        throw error;
      }
    }, [mode, message]);

    useEffect(() => {
      if (didAutoPick.current) return;
      didAutoPick.current = true;
      void handlePickFile();
    }, [handlePickFile]);

    return (
      <div className="storage-fs-explorer-page">
        从本地文件系统选择文档以继续。
        <Button
          type="primary"
          icon={<FontAwesomeIcon icon={faInbox} />}
          onClick={() => void handlePickFile()}
        >
          选择文件
        </Button>
      </div>
    );
  },
} satisfies StorageMethodObject;
