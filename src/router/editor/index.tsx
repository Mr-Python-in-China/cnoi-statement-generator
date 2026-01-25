import {
  type FC,
  useEffect,
  useState,
  useMemo,
  use,
  Suspense,
  useCallback,
} from "react";
import { useImmer, type Updater } from "use-immer";
import type {
  DocumentBase,
  ImmerContent,
  ImmerDocument,
} from "@/types/document";
import { App, Tabs, type TabsProps } from "antd";
import Body from "./body";
import { debounce } from "lodash-es";
import useTemplateManager, {
  TemplateManagerContext,
} from "@/components/templateManagerContext";

import "./index.css";
import {
  DocumnetNotFoundError,
  loadDocumentFromDB,
  saveDocumentToDB,
} from "@/utils/indexedDBUtils";
import TemplateManager from "@/utils/templateManager";
import {
  removeProblemCallback,
  toImmerContent,
} from "@/utils/contestDataUtils";
import TypstInitStatusProvider from "@/components/typstInitStatusProvider";
import ContestEditorHeader from "./header";
import { useParams } from "react-router";

import ErrorPage from "../errorPage";

const ContestEditorImpl: FC<{ initialDoc: DocumentBase }> = ({
  initialDoc,
}) => {
  const templateManager = useTemplateManager();
  const compiler = templateManager.compiler;
  const uiMeta = use(templateManager.uiMetadataPromise);

  const [doc, updateDoc] = useImmer<ImmerDocument>({
    ...initialDoc,
    content: toImmerContent(initialDoc.content),
    previewImage: undefined,
  });
  const content = doc.content;
  const updateContent =
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(
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

  // Create a debounced save function (saves at most once per 500ms)
  const debouncedSave = useMemo(
    () =>
      debounce(async (data: ImmerDocument) => {
        try {
          await saveDocumentToDB({
            ...data,
            modifiedAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Failed to auto-save:", error);
        }
      }, 500),
    [],
  );

  // Auto-save to IndexedDB whenever content changes (debounced)
  useEffect(() => {
    debouncedSave(doc);
  }, [doc, debouncedSave]);

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
      closeable: false,
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
      <ContestEditorHeader
        doc={doc}
        updateDoc={updateDoc}
        setPanel={setPanel}
      />
      <main>
        <Tabs
          type="editable-card"
          items={items}
          activeKey={panel}
          onChange={(x) => {
            setPanel(x);
          }}
          onEdit={async (e, action) => {
            if (action === "remove") removeProblem(e as string);
            else {
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

const ContestEditorWithInitalPromise: FC<{
  initialPromise: Promise<
    | {
        doc: DocumentBase;
        templateManager: TemplateManager;
      }
    | undefined
  >;
}> = ({ initialPromise }) => {
  const initial = use(initialPromise);
  return !initial ? (
    <ErrorPage>该文档不存在</ErrorPage>
  ) : (
    <TemplateManagerContext.Provider value={initial.templateManager}>
      <TypstInitStatusProvider>
        <ContestEditorImpl initialDoc={initial.doc} />
      </TypstInitStatusProvider>
    </TemplateManagerContext.Provider>
  );
};

const ContestEditor: FC = () => {
  const { documentId } = useParams();
  const initialPromise = (async () => {
    try {
      const document = await loadDocumentFromDB(documentId!);
      return {
        doc: document,
        templateManager: new TemplateManager(document.templateId),
      };
    } catch (e) {
      if (e instanceof DocumnetNotFoundError) return undefined;
      throw e;
    }
  })();
  return (
    <Suspense>
      <ContestEditorWithInitalPromise initialPromise={initialPromise} />
    </Suspense>
  );
};

export default ContestEditor;
