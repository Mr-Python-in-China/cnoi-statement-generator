export interface ProblemData {
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

/** [year, month, day, hour, minute, second] */
export type DateArr = [number, number, number, number, number, number];

type ContestData<
  Conf extends {
    withMarkdown?: boolean;
    withTypst?: boolean;
  } = {
    withMarkdown: false;
    withTypst: false;
  },
> = {
  title: string;
  subtitle: string;
  dayname: string;
  date: {
    start: DateArr;
    end: DateArr;
  };
  noi_style: boolean;
  file_io: boolean;
  use_pretest: boolean;
  support_languages: {
    name: string;
    compile_options: string;
  }[];
  problems: (ProblemData &
    (Conf["withMarkdown"] extends true // with markdown
      ? { statementMarkdown: string }
      : unknown) &
    (Conf["withTypst"] extends true // with typst
      ? { statementTypst: string }
      : unknown))[];
} & (Conf["withMarkdown"] extends true
  ? { precautionMarkdown: string }
  : unknown) &
  (Conf["withTypst"] extends true ? { precautionTypst: string } : unknown);

export default ContestData;

export interface ImmerContestData extends ContestData<{ withMarkdown: true }> {
  problems: (ContestData<{ withMarkdown: true }>["problems"][number] & {
    key: import("crypto").UUID;
  })[];
  support_languages: (ContestData<{
    withMarkdown: true;
  }>["support_languages"][number] & {
    key: import("crypto").UUID;
  })[];
  images: {
    uuid: string;
    name: string;
    url: string; // blob URL for display
  }[];
}

export interface EditorImageData {
  uuid: string;
  blob: Blob;
}

export interface StoredContestData extends ContestData<{ withMarkdown: true }> {
  images: {
    uuid: string;
    name: string;
  }[];
}

export type ContestDataWithImages = Omit<ImmerContestData, "problems" | "support_languages" | "images"> & {
  images: {
    uuid: string;
    name: string;
    url: string; // blob URL for display (not stored in DB/export)
  }[];
  problems: Omit<ImmerContestData["problems"][number], "key">[];
  support_languages: Omit<ImmerContestData["support_languages"][number], "key">[];
};