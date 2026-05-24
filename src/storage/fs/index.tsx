import { useCallback, useEffect, useRef } from "react";
import type { StorageMethodObject } from "../types";
import { Button } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHardDrive, faInbox } from "@fortawesome/free-solid-svg-icons";
import type { DocumentBase } from "@/types/document";
import { DocNotFoundError, SaveDocumentError } from "../errors";
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

const ensureFileSystemApi = () => {
  if (!("showOpenFilePicker" in window) || !("showSaveFilePicker" in window)) {
    throw new SaveDocumentError("当前浏览器不支持");
  }
};

const ensurePermission = async (
  handle: FileSystemFileHandle,
  mode: FileSystemPermissionMode,
) => {
  const status = await handle.queryPermission({ mode });
  if (status === "granted") return;
  const next = await handle.requestPermission({ mode });
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
    ensureFileSystemApi();
    const handle = await getFsHandle(path);
    if (!handle) throw new DocNotFoundError("文件句柄不存在，请重新选择文件");
    await ensurePermission(handle, "readwrite");
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
    if (!navigator.userActivation.hasBeenActive) alert("你需要授权文件访问。"); // 用户交互后才能读取文件
    const handle = await getFsHandle(path);
    if (!handle) {
      throw new DocNotFoundError("文件句柄不存在，请重新选择文件");
    }
    await ensurePermission(handle, "read");
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

    useEffect(() => {
      onConfirmRef.current = onConfirm;
    }, [onConfirm]);

    const handlePickFile = useCallback(async () => {
      ensureFileSystemApi();
      try {
        const handle =
          mode === "open"
            ? (await window.showOpenFilePicker(jsonPickerOptions))[0]
            : await window.showSaveFilePicker(jsonSaveOptions);
        if (!handle) return;
        const key = await saveFsHandle(handle);
        onConfirmRef.current(key);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        throw error;
      }
    }, [mode]);

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
