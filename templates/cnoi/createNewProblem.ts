import type { ImmerContent } from "@/types/document";
import type { Content } from "./types";

export default function createNewProblem(
  content: ImmerContent<Content>,
): Content["problems"][number] {
  return {
    uuid: crypto.randomUUID(),
    name: "new_problem",
    title: "新题目",
    type: "standard",
    dir: "new_problem",
    exec: "new_problem",
    input: "new_problem.in",
    output: "new_problem.out",
    time_limit: "1 秒",
    memory_limit: "256 MB",
    testcase: "10",
    point_equal: "是",
    submit_filename: content.support_languages.map(() => "new_problem.ext"),
    advancedEditing: false,
    markdown: "",
    pretestcase: "",
  };
}
