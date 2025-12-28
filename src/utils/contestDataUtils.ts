import type { HookAPI as ModalHookAPI } from "antd/es/modal/useModal";
import type { Updater } from "use-immer";
import type { ContentBase, ImmerContent } from "@/types/document";

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
