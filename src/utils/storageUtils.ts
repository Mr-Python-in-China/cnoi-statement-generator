import type ContestData from "@/types/contestData";
import configSchema from "../../typst-template/config-schema.json";
import Ajv from "ajv";

const STORAGE_KEY = "cnoi-contest-data";

const ajv = new Ajv({ allErrors: true });
const validateSchema = ajv.compile(configSchema);

/**
 * Serialize contest data for storage
 * Note: Images with blob URLs will not persist correctly and will need to be re-uploaded
 */
export function serializeContestData(
  data: ContestData<{ withMarkdown: true }>
): string {
  // Create a clean copy without internal keys
  const cleanData = {
    title: data.title,
    subtitle: data.subtitle,
    dayname: data.dayname,
    date: data.date,
    noi_style: data.noi_style,
    file_io: data.file_io,
    use_pretest: data.use_pretest,
    support_languages: data.support_languages.map((lang) => ({
      name: lang.name,
      compile_options: lang.compile_options,
    })),
    problems: data.problems.map((problem) => ({
      name: problem.name,
      title: problem.title,
      type: problem.type,
      dir: problem.dir,
      exec: problem.exec,
      input: problem.input,
      output: problem.output,
      time_limit: problem.time_limit,
      memory_limit: problem.memory_limit,
      testcase: problem.testcase,
      point_equal: problem.point_equal,
      submit_filename: problem.submit_filename,
      pretestcase: problem.pretestcase,
      statementMarkdown: problem.statementMarkdown,
    })),
    precautionMarkdown: data.precautionMarkdown,
    // Note: images are excluded as blob URLs won't persist
  };
  return JSON.stringify(cleanData, null, 2);
}

/**
 * Deserialize contest data from storage
 */
export function deserializeContestData(
  json: string
): ContestData<{ withMarkdown: true }> {
  const data = JSON.parse(json);
  return data as ContestData<{ withMarkdown: true }>;
}

/**
 * Validate contest data against schema
 */
export function validateContestData(
  data: unknown
): { valid: boolean; errors?: string[] } {
  const valid = validateSchema(data);
  if (!valid && validateSchema.errors) {
    const errors = validateSchema.errors.map(
      (err) => `${err.instancePath} ${err.message}`
    );
    return { valid: false, errors };
  }
  return { valid: true };
}

/**
 * Save contest data to localStorage
 */
export function saveToLocalStorage(
  data: ContestData<{ withMarkdown: true }>
): void {
  try {
    const serialized = serializeContestData(data);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
    throw error;
  }
}

/**
 * Load contest data from localStorage
 */
export function loadFromLocalStorage(): ContestData<{
  withMarkdown: true;
}> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data = deserializeContestData(stored);
    const validation = validateContestData(data);
    if (!validation.valid) {
      console.error("Stored data validation failed:", validation.errors);
      return null;
    }
    return data;
  } catch (error) {
    console.error("Failed to load from localStorage:", error);
    return null;
  }
}

/**
 * Clear contest data from localStorage
 */
export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export contest data as a JSON file
 */
export function exportToFile(
  data: ContestData<{ withMarkdown: true }>,
  filename?: string
): void {
  const json = serializeContestData(data);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename || `${data.title || "contest"}-${Date.now()}-config.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import contest data from a JSON file
 */
export async function importFromFile(
  file: File
): Promise<ContestData<{ withMarkdown: true }>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const data = deserializeContestData(json);
        const validation = validateContestData(data);
        if (!validation.valid) {
          reject(
            new Error(
              "配置文件验证失败：" + (validation.errors?.join(", ") || "未知错误")
            )
          );
          return;
        }
        resolve(data);
      } catch (error) {
        reject(
          new Error(
            "配置文件解析失败：" +
              (error instanceof Error ? error.message : String(error))
          )
        );
      }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsText(file);
  });
}
