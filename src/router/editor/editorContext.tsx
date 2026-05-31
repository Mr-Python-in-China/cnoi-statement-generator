import type { Emitter } from "mitt";
import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";
import { type Updater } from "use-immer";

import type { ImmerContent, ImmerDocument } from "@/types/document";

type EditorDocContextValue = {
  doc: ImmerDocument;
  updateDoc: Updater<ImmerDocument>;
  path: string[] | undefined;
  setPath: Dispatch<SetStateAction<string[] | undefined>>;
  modified: boolean;
  setModified: Dispatch<SetStateAction<boolean>>;
};

type EditorContentContextValue = {
  content: ImmerContent;
  updateContent: Updater<ImmerContent>;
};

type EditorPanelContextValue = {
  panel: string;
  setPanel: Dispatch<SetStateAction<string>>;
};

export type EditorEvents = {
  documentSaved: {
    path: string[];
  };
};

type EditorEventBusContextValue = Emitter<EditorEvents>;

export const EditorDocContext = createContext<EditorDocContextValue | null>(
  null,
);
export const EditorContentContext =
  createContext<EditorContentContextValue | null>(null);
export const EditorPanelContext = createContext<EditorPanelContextValue | null>(
  null,
);
export const EditorEventBusContext =
  createContext<EditorEventBusContextValue | null>(null);

export function useEditorDoc() {
  const res = useContext(EditorDocContext);
  if (res === null) throw new Error("EditorDocContext is null");
  return res;
}

export function useEditorContent() {
  const res = useContext(EditorContentContext);
  if (res === null) throw new Error("EditorContentContext is null");
  return res;
}

export function useEditorPanel() {
  const res = useContext(EditorPanelContext);
  if (res === null) throw new Error("EditorPanelContext is null");
  return res;
}

export function useEditorEvents() {
  const res = useContext(EditorEventBusContext);
  if (res === null) throw new Error("EditorEventBusContext is null");
  return res;
}
