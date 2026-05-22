import { useCallback, useEffect, useRef } from "react";
import type { StorageMethodObject } from "../types";
import { Button } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHardDrive, faInbox } from "@fortawesome/free-solid-svg-icons";
import type { DocumentBase } from "@/types/document";
import { DocNotFoundError, SaveDocumentError } from "../errors";
import { documentToJson, jsonToDocument } from "@/utils/jsonDocument";

import "./index.css";

const fileHandleMap = new Map<string, FileSystemFileHandle>();

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

const registerHandle = (handle: FileSystemFileHandle, key?: string) => {
  const handleKey = key ?? handle.name;
  fileHandleMap.set(handleKey, handle);
  if (handleKey !== handle.name) {
    fileHandleMap.set(handle.name, handle);
  }
  return handleKey;
};

const getHandle = (key: string) => fileHandleMap.get(key);

export default {
  name: "本机",
  saveDocument: async (
    path: string[],
    content: DocumentBase,
  ): Promise<DocumentBase> => {
    const key = path[0];
    ensureFileSystemApi();
    let handle = key ? getHandle(key) : undefined;
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
    const key = path[0];
    const handle = key ? getHandle(key) : undefined;
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
        const key = registerHandle(handle);
        onConfirmRef.current({ type: "file", key });
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
