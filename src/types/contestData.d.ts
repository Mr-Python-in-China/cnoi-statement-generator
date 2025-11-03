export type DateArr = [number, number, number, number, number, number];

export interface LanguageConfig {
  name: string;
  compile_options: string;
}

export interface ProblemDataBase {
  name: string;
  title: string;
  type: string;
  dir: string;
  exec: string;
  input: string;
  output: string;
  time_limit: string;
  memory_limit: string;
  testcase: string;
  point_equal: string;
  submit_filename: string[];
  pretestcase: string;
}

export type ContentFlags = {
  withMarkdown?: boolean;
  withTypst?: boolean;
};

type MarkdownProblemExt<Conf extends ContentFlags> =
  Conf["withMarkdown"] extends true ? { statementMarkdown: string } : object;
type TypstProblemExt<Conf extends ContentFlags> = Conf["withTypst"] extends true
  ? { statementTypst: string }
  : object;

export type ProblemData<Conf extends ContentFlags = ContentFlags> =
  ProblemDataBase & MarkdownProblemExt<Conf> & TypstProblemExt<Conf>;

export interface ContestDateRange {
  start: DateArr;
  end: DateArr;
}

type MarkdownContestExt<Conf extends ContentFlags> =
  Conf["withMarkdown"] extends true ? { precautionMarkdown: string } : object;
type TypstContestExt<Conf extends ContentFlags> = Conf["withTypst"] extends true
  ? { precautionTypst: string }
  : object;

/**
 * 基础比赛配置（不含可选扩展）。
 */
export interface ContestDataBase<Conf extends ContentFlags = ContentFlags> {
  title: string;
  subtitle: string;
  dayname: string;
  date: ContestDateRange;
  noi_style: boolean;
  file_io: boolean;
  use_pretest: boolean;
  support_languages: LanguageConfig[];
  problems: ProblemData<Conf>[];
}

export type ContestData<
  Conf extends ContentFlags = { withMarkdown: false; withTypst: false },
> = ContestDataBase<Conf> & MarkdownContestExt<Conf> & TypstContestExt<Conf>;

export type UILanguageConfig = LanguageConfig & { key: import("crypto").UUID };

export type UIProblemData<Conf extends ContentFlags = { withMarkdown: true }> =
  ProblemData<Conf> & { key: import("crypto").UUID };

export interface UIImageItem {
  uuid: string;
  name: string;
  url: string; // blob URL for display
}

export interface EditorImageData {
  uuid: string;
  blob: Blob;
}

export interface ImmerContestData extends ContestData<{ withMarkdown: true }> {
  problems: UIProblemData<{ withMarkdown: true }>[];
  support_languages: UILanguageConfig[];
  images: UIImageItem[];
}

export interface StoredContestData extends ContestData<{ withMarkdown: true }> {
  images: {
    uuid: string;
    name: string;
  }[];
}

export type ContestDataWithImages = ContestData<{ withMarkdown: true }> & {
  images: UIImageItem[];
};
