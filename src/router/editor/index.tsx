import {
  type FC,
  useEffect,
  useState,
  use,
  useCallback,
  Suspense,
  type Dispatch,
  type SetStateAction,
  useMemo,
  useLayoutEffect,
} from "react";
import { useImmer, type Updater } from "use-immer";
import type { ImmerContent, ImmerDocument } from "@/types/document";
import { App, Tabs, type TabsProps } from "antd";
import Body from "./body";
import useTemplateManager, {
  TemplateManagerContext,
} from "@/components/templateManagerContext";
import "./index.css";
import TemplateManager from "@/utils/templateManager";
import {
  removeProblemCallback,
  toImmerContent,
} from "@/utils/contestDataUtils";
import TypstInitStatusProvider from "@/components/typstInitStatusProvider";
import ContestEditorHeader from "./header";
import { redirect } from "react-router";
import ErrorPage from "../errorPage";
import type { Route } from "./+types";
import { loadDocument } from "@/storage";
import { DocNotFoundError } from "@/storage/errors";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const file = new URL(request.url).searchParams.get("file");
  if (!file) throw redirect("/");
  const path = file.split("/").map((x) => decodeURIComponent(x));
  const doc = await loadDocument(path);
  return {
    doc,
    path,
  };
}

export const ErrorBoundary: FC<Route.ErrorBoundaryProps> = ({ error }) => {
  console.error("Failed to load document in editor route", error);
  return (
    <ErrorPage>
      {error instanceof DocNotFoundError ? "文档不存在" : "加载文档时发生错误"}
    </ErrorPage>
  );
};

const ContestEditorMain: FC<{
  doc: ImmerDocument;
  updateDoc: Updater<ImmerDocument>;
  path: string[];
  setPath: Dispatch<SetStateAction<string[]>>;
  panel: string;
  setPanel: Dispatch<SetStateAction<string>>;
  modified: boolean;
  setModified: Dispatch<SetStateAction<boolean>>;
}> = ({ doc, updateDoc, panel, setPanel, modified, setModified }) => {
  const templateManager = useTemplateManager();
  const uiMeta = use(templateManager.uiMetadataPromise);
  const compiler = templateManager.compiler;

  const content = doc.content;
  const updateContent = useCallback(
    ((updater) => {
      if (typeof updater === "function")
        updateDoc((d) => {
          const x = updater(d.content);
          if (x !== undefined)
            return {
              ...d,
              content: x,
            };
        });
      else
        updateDoc((d) => {
          d.content = updater;
        });
      setModified(true);
    }) satisfies Updater<ImmerContent>,
    [updateDoc, setModified],
  );

  // Register asset blob URLs with compiler whenever images change
  useEffect(() => {
    const mapping = new Map(content.images.map((img) => [img.uuid, img.url]));
    compiler.registerAssetUrls(mapping);
  }, [compiler, content.images]);

  const { modal } = App.useApp();
  const items: TabsProps["items"] = [
    {
      key: "config",
      label: "基础信息",
      closable: false,
      destroyOnHidden: true,
    },
    ...Object.entries(uiMeta.extraContents).map(([extraName, meta]) => ({
      key: `extra-${extraName}`,
      label: meta.displayName,
      closable: false,
      destroyOnHidden: true,
    })),
    ...content.problems.map((x, i) => ({
      key: x.uuid,
      label: (
        <>
          {x.title}
          <span className="contest-editor-tab-item-sublabel">T{i + 1}</span>
        </>
      ),
      destroyOnHidden: true,
    })),
  ];
  const removeProblem = removeProblemCallback(modal, setPanel, updateContent);

  useEffect(() => {
    if (!modified) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "你确定要离开吗？未保存的更改将会丢失。";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [modified]);

  return (
    <>
      <main>
        <Tabs
          type="editable-card"
          items={items}
          activeKey={panel}
          onChange={(x) => {
            setPanel(x);
          }}
          hideAdd={uiMeta.createNewProblem === undefined}
          onEdit={async (e, action) => {
            if (action === "remove") removeProblem(e as string);
            else {
              if (!uiMeta.createNewProblem) return;
              const v = uiMeta.createNewProblem(content);
              setPanel(v.uuid);
              updateContent((draft) => {
                draft.problems.push(v);
              });
            }
          }}
        />
        <Body
          {...{
            content,
            updateContent,
            panel,
            setPanel,
          }}
        />
      </main>
    </>
  );
};

const ContestEditor: FC<Route.ComponentProps> = ({ loaderData }) => {
  const [doc, updateDoc] = useImmer<ImmerDocument>({
    ...loaderData.doc,
    content: toImmerContent(loaderData.doc.content),
    previewImage: undefined,
  });
  const [path, setPath] = useState(loaderData.path);

  const pathStr = useMemo(() => path.map(encodeURIComponent).join("/"), [path]);
  const [templateManagerState, setTemplateManagerState] = useState<
    TemplateManager | undefined
  >(undefined);
  useLayoutEffect(() => {
    const manager = new TemplateManager(doc.templateId);
    setTemplateManagerState(manager);
    return () => manager.dispose();
  }, [doc.templateId]);
  const templateManager =
    templateManagerState?.template === doc.templateId
      ? templateManagerState
      : undefined;

  // "config" | "extra-{name}" | "{problem-uuid}"
  const [panel, setPanel] = useState("config");

  const [modified, setModified] = useState(false);
  useLayoutEffect(
    () => setModified(false),
    // oxlint-disable-next-line eslint-plugin-react-hooks/exhaustive-deps
    [pathStr],
  );

  if (!templateManager) return undefined;

  return (
    <TemplateManagerContext.Provider value={templateManager}>
      <TypstInitStatusProvider>
        <ContestEditorHeader
          {...{
            doc,
            updateDoc,
            setPanel,
            path,
            setPath,
            modified,
            setModified,
          }}
        />
        <Suspense>
          <ContestEditorMain
            {...{
              doc,
              updateDoc,
              panel,
              setPanel,
              path,
              setPath,
              modified,
              setModified,
            }}
          />
        </Suspense>
      </TypstInitStatusProvider>
    </TemplateManagerContext.Provider>
  );
};

export default ContestEditor;
