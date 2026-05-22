import type { DocumentBase } from "@/types/document";
import type { FC, ReactNode } from "react";

export { ExplorerItem } from "../components/ExplorerPage";
export type GetExplorerItemFunction = (
  path: string[],
) => Promise<ExplorerItem[]>;

export type StorageMethodObject = {
  saveDocument: (
    path: string[],
    content: DocumentBase,
  ) => Promise<DocumentBase>;
  loadDocument: (path: string[]) => Promise<DocumentBase>;
  ExplorerPage: FC<{
    path: string[];
    mode: "open" | "save";
    onSelect: (key: string) => void;
    onOpenFolder: (key: string) => void;
    setFileItems: (items: ExplorerItem[]) => void;
    onConfirm: (file: string | ExplorerItem) => void;
  }>;
  icon: ReactNode;
  name: string;
};
