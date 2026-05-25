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
import {
  useBeforeUnload,
  useBlocker,
  useNavigate,
  useSearchParams,
} from "react-router";
import ErrorPage from "../errorPage";
import type { Route } from "./+types";
import { loadDocument } from "@/storage";
import { DocNotFoundError, LoadDocumentError } from "@/storage/errors";
import navigationState from "./navigationState";
import { requestUserAction } from "@/components/RequestUserActionHolder";

const ContestEditorLoader: FC<Route.ComponentProps> = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<
    | {
        doc: DocumentBase;
        path: string[];
      }
    | { error: unknown }
    | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (searchParams.has("_noConfirm")) {
          setSearchParams(
            (prev) => {
              prev.delete("_noConfirm");
              return prev;
            },
            {
              replace: true,
            },
          );
          return;
        }
        const file = searchParams.get("file");
        if (!file) {
          navigate("/", { replace: true });
          return;
        }
        const parsedPath = file.split("/").map((x) => decodeURIComponent(x));
        let nextDoc: DocumentBase | undefined = navigationState.value?.doc;
        if (!nextDoc) {
          if (parsedPath[0] === "fs") await requestUserAction();
          nextDoc = await loadDocument(parsedPath);
        }
        navigationState.value = undefined;
        if (cancelled) return;
        setState({
          doc: nextDoc,
          path: parsedPath,
        });
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load document in editor route", err);
        setState({ error: err });
      }
    };

    run();
    return () => void (cancelled = true);
  }, [searchParams, setSearchParams, navigate]);

  if (!state) return null;

  if (state && "error" in state)
    return (
      <ErrorPage>
        {state.error instanceof DocNotFoundError
          ? "文档不存在"
          : state.error instanceof LoadDocumentError
            ? state.error.message
            : "加载文档时发生错误"}
      </ErrorPage>
    );

  return <ContestEditor {...state} />;
};

export default ContestEditorLoader;

const ContestEditorMain: FC<{
  doc: ImmerDocument;
  updateDoc: Updater<ImmerDocument>;
  path: string[];
  setPath: Dispatch<SetStateAction<string[]>>;
  panel: string;
  setPanel: Dispatch<SetStateAction<string>>;
  modified: boolean;
  setModified: Dispatch<SetStateAction<boolean>>;
}> = ({ doc, updateDoc, panel, setPanel, setModified }) => {
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

const ContestEditor: FC<{ doc: DocumentBase; path: string[] }> = ({
  doc: rawDoc,
  path: initialPath,
}) => {
  const loaderImmerDoc = useMemo(
    (): ImmerDocument => ({
      ...rawDoc,
      content: toImmerContent(rawDoc.content),
    }),
    [rawDoc],
  );

  const [doc, updateDoc] = useImmer<ImmerDocument>(loaderImmerDoc);
  const [path, setPath] = useState(initialPath);
  const { modal } = App.useApp();

  useLayoutEffect(() => {
    updateDoc(loaderImmerDoc);
    setPath(initialPath);
  }, [initialPath, loaderImmerDoc, updateDoc]);
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

  useBeforeUnload((event: BeforeUnloadEvent) => {
    if (!modified) return;
    event.preventDefault();
    event.returnValue = "你确定要离开吗？未保存的更改将会丢失。";
  });
  const blocker = useBlocker(
    ({ nextLocation }) =>
      modified && !/(\?|&)_noConfirm/.test(nextLocation.search),
  );
  useEffect(() => {
    let oldState = "";
    if (blocker.state === "blocked" && oldState !== "blocked") {
      modal
        .confirm({
          content: (
            <>
              你确定要继续吗？
              <br />
              未保存的更改将会丢失。
            </>
          ),
          mask: {
            closable: true,
          },
        })
        .then(
          (confirmed) => {
            if (confirmed) blocker.proceed();
            else blocker.reset();
          },
          () => blocker.reset(),
        );
    }
    oldState = blocker.state;
  }, [blocker, modal]);

  return (
    <>
      {templateManager && (
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
      )}
    </>
  );
};
