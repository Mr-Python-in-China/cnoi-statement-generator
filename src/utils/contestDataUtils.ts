import type { ImmerContestData } from "@/types/contestData";
import type ContestData from "@/types/contestData";
import type { HookAPI as ModalHookAPI } from "antd/es/modal/useModal";
import type React from "react";
import type { Updater } from "use-immer";

export function toImmerContestData(
  data: ContestData<{ withMarkdown: true }>
): ImmerContestData {
  return {
    ...data,
    support_languages: data.support_languages.map((x) => ({
      ...x,
      key: crypto.randomUUID(),
    })),
    problems: data.problems.map((problem) => ({
      ...problem,
      key: crypto.randomUUID(),
    })),
    images: [],
  };
}

export function newProblem(
  contestData: ImmerContestData
): ImmerContestData["problems"][number] {
  return {
    key: crypto.randomUUID(),
    name: "problem",
    title: "新题目",
    type: "传统型",
    dir: "problem",
    exec: "problem",
    input: "problem.in",
    output: "problem.out",
    time_limit: "1.0 秒",
    memory_limit: "512 MiB",
    testcase: "10",
    point_equal: "是",
    submit_filename: contestData.support_languages.map(
      (lang) => "problem." + lang.name
    ),
    pretestcase: "10",
    statementMarkdown: "",
  };
}

export function removeProblemCallback(
  modal: ModalHookAPI,
  setPanel: React.Dispatch<React.SetStateAction<string>>,
  updateContestData: Updater<ImmerContestData>
) {
  return async (e: string) => {
    if (
      !(await modal.confirm({
        title: "确认删除该题目吗？",
      }))
    )
      return;
    updateContestData((draft) => {
      const index = draft.problems.findIndex((x) => x.key === e);
      if (index === -1) return;
      const n = draft.problems.length;
      const targetKey =
        n === 1
          ? "precaution"
          : draft.problems[index === n - 1 ? n - 2 : index + 1].key;
      setPanel((panel) => (panel === e ? targetKey : panel));
      draft.problems.splice(index, 1);
    });
  };
}
