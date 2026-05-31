import {
  faFileLines,
  faWindowMaximize,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { App } from "antd";
import { useEffect, useState } from "react";

import ExplorerPage from "@/components/ExplorerPage";
import type { DocumentBase, DocumentMeta } from "@/types/document";
import {
  deleteDocumentFromDB,
  loadDocumentFromDB,
  loadDocumentMetasFromDB,
  saveDocumentToDB,
} from "@/utils/.client/indexedDB/browserStorage";

import type { StorageMethodObject } from "../types";

export default {
  name: "浏览器存储",
  enabled: true,
  saveDocument: async (
    path: string[],
    content: DocumentBase,
  ): Promise<DocumentBase> => {
    const name = path[0];
    await saveDocumentToDB({
      ...content,
      name,
    });
    return {
      ...content,
      name,
    };
  },
  loadDocument: (path: string[]): Promise<DocumentBase> =>
    loadDocumentFromDB(path[0]),
  icon: <FontAwesomeIcon icon={faWindowMaximize} />,
  ExplorerPage: (props) => {
    const { message, modal } = App.useApp();
    const [metas, setMetas] = useState<DocumentMeta[] | undefined>(undefined);
    useEffect(() => void loadDocumentMetasFromDB().then(setMetas), []);
    return (
      metas && (
        <ExplorerPage
          {...props}
          items={metas.map((meta) => ({
            key: meta.name,
            name: meta.name,
            type: "file",
            modifiedAt: meta.modifiedAt ? new Date(meta.modifiedAt) : undefined,
            icon: <FontAwesomeIcon icon={faFileLines} />,
            actions: {
              delete: () =>
                modal.confirm({
                  title: "确认删除",
                  content: "您确定要删除这个文档吗？",
                  onOk: () =>
                    deleteDocumentFromDB(meta.name).then(
                      () => {
                        setMetas((m) => m?.filter((x) => x.name !== meta.name));
                        message.success("文档已删除");
                      },
                      (e) => {
                        console.error("Failed to delete document:", e);
                        message.error("删除文档失败");
                      },
                    ),
                }),
            },
          }))}
        />
      )
    );
  },
} satisfies StorageMethodObject;
