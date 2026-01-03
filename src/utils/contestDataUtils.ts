import type { HookAPI as ModalHookAPI } from "antd/es/modal/useModal";
import type { Updater } from "use-immer";
import type {
  ContentBase,
  DocumentBase,
  ImmerContent,
  ImmerDocument,
} from "@/types/document";

export function removeProblemCallback<Content extends ContentBase>(
  modal: ModalHookAPI,
  setPanel: React.Dispatch<React.SetStateAction<string>>,
  updateContent: Updater<ImmerContent<Content>>,
) {
  return async (uuid: string) => {
    if (
      !(await modal.confirm({
        title: "确认删除该题目吗？",
      }))
    )
      return;
    updateContent((draft) => {
      const problemsDraft = (draft as ImmerContent<Content>).problems;
      const index = problemsDraft.findIndex((x) => x.uuid === uuid);
      if (index === -1) return;
      const extraContentsKeys = Object.keys(
        (draft as ImmerContent<Content>).extraContents,
      );
      const panels = [
        ...extraContentsKeys,
        ...problemsDraft.map((p) => p.uuid),
      ];
      const targetKey =
        extraContentsKeys.length + index === panels.length
          ? panels[panels.length - 1]
          : panels[extraContentsKeys.length + index];
      setPanel((panel) => (panel === uuid ? targetKey : panel));
      problemsDraft.splice(index, 1);
    });
  };
}

export function toImmerContent(content: ContentBase): ImmerContent {
  return {
    ...content,
    images: content.images.map((img) => ({
      ...img,
      url: URL.createObjectURL(img.blob),
    })),
  };
}

export async function exportDocument(doc: ImmerDocument) {
  const json = await import("@/utils/jsonDocument").then((mod) =>
    mod.documentToJson(doc),
  );
  const blob = new Blob([json], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.name}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importDocument() {
  return new Promise<DocumentBase | undefined>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(undefined);
        return;
      }
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const json = event.target?.result as string;
            const data = await import("@/utils/jsonDocument").then((mod) =>
              mod.jsonToDocument(json),
            );
            resolve(data);
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsText(file);
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}
