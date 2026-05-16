import {
  type FC,
  useEffect,
  useState,
  use,
  useCallback,
  Suspense,
} from "react";
import { useImmer, type Updater } from "use-immer";
import type {
  DocumentBase,
  ImmerContent,
  ImmerDocument,
} from "@/types/document";
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
import DocNotFoundError from "@/storage/docNotFoundError";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const file = new URL(request.url).searchParams.get("file");
  if (!file) throw redirect("/");
  const data = await loadDocument(new URL(file));
  return {
    doc: data,
    path: file,
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

const ContestEditorImpl: FC<{
  initialData: { doc: DocumentBase; path: string };
}> = ({ initialData }) => {
  const templateManager = useTemplateManager();
  const uiMeta = use(templateManager.uiMetadataPromise);
  const compiler = templateManager.compiler;

  const [doc, updateDoc] = useImmer<ImmerDocument>({
    ...initialData.doc,
    content: toImmerContent(initialData.doc.content),
    previewImage: undefined,
  });
  const [path, setPath] = useState(initialData.path);
  const [modified, setModified] = useState(false);

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
    [updateDoc],
  );

  // Register asset blob URLs with compiler whenever images change
  useEffect(() => {
    const mapping = new Map(content.images.map((img) => [img.uuid, img.url]));
    compiler.registerAssetUrls(mapping);
  }, [compiler, content.images]);

  // "config" | "extra-{name}" | "{problem-uuid}"
  const [panel, setPanel] = useState("config");

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
  const [templateManager, setTemplateManager] = useState<
    TemplateManager | undefined
  >(undefined);
  useEffect(() => {
    const v = new TemplateManager(loaderData.doc.templateId);
    setTemplateManager(v);
    return () => v.dispose();
  }, [loaderData.doc]);
  return (
    templateManager && (
      <TemplateManagerContext.Provider value={templateManager}>
        <TypstInitStatusProvider>
          <Suspense>
            <ContestEditorImpl initialData={loaderData} />
          </Suspense>
        </TypstInitStatusProvider>
      </TemplateManagerContext.Provider>
    )
  );
};

export default ContestEditor;
