import type { DocumentBase, DocumentMeta } from "@/types/document";
import {
  loadDocumentFromDB,
  loadDocumentMetasFromDB,
  saveDocumentToDB,
} from "@/utils/indexedDB/browserStorage";
import {
  faFileLines,
  faWindowMaximize,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { StorageMethodObject } from "../types";
import ExplorerPage from "@/components/ExplorerPage";
import { useEffect, useState } from "react";

export default {
  name: "浏览器存储",
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
          }))}
        />
      )
    );
  },
} satisfies StorageMethodObject;
