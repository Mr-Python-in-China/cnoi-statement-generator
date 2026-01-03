import type { DocumentMeta } from "@/types/document";
import {
  loadDocumentMetasFromDB,
  saveDocumentToDB,
} from "@/utils/indexedDBUtils";
import { Suspense, use, type FC } from "react";

import "./index.css";
import favicon from "/favicon.svg";
import { App, Button, message, Select } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faUpload } from "@fortawesome/free-solid-svg-icons";
import { useImmer } from "use-immer";
import DocumentGrid from "./documentGrid";
import { importDocument } from "@/utils/contestDataUtils";

const RootImpl: FC<{
  initialDocumentMetasPromise: Promise<DocumentMeta[]>;
}> = ({ initialDocumentMetasPromise }) => {
  const { modal } = App.useApp();
  const [documentMetas, updateDocumentMetas] = useImmer(
    use(initialDocumentMetasPromise),
  );
  const [soryBy, setSortBy] = useImmer<
    "name" | "name (reversed)" | "modified at" | "modified at (reversed)"
  >("modified at (reversed)");
  return (
    <>
      <header className="root-header">
        <a href="/">
          <img src={favicon} alt="Favicon" className="favicon" />
          <h1 className="app-title">CNOI Statement Generator</h1>
        </a>
      </header>
      <div className="root-button-group">
        <div>
          <Button type="primary" icon={<FontAwesomeIcon icon={faPlus} />}>
            新建文档
          </Button>
          <Button
            type="default"
            icon={<FontAwesomeIcon icon={faUpload} />}
            onClick={async () => {
              try {
                const data = await importDocument();
                if (!data) return;
                if (data.uuid === "") data.uuid = crypto.randomUUID();
                const existing = documentMetas.find(
                  (meta) => meta.uuid === data.uuid,
                );
                if (existing)
                  if (
                    !(await modal.confirm({
                      title: "你确定要覆盖已有的文档吗？",
                    }))
                  )
                    return;
                await saveDocumentToDB(data, true);
                updateDocumentMetas((draft) => {
                  const newMeta: DocumentMeta = {
                    uuid: data.uuid,
                    name: data.name,
                    modifiedAt: data.modifiedAt,
                    templateId: data.templateId,
                    previewImage: undefined,
                  };
                  if (existing) draft[draft.indexOf(existing)] = newMeta;
                  else draft.push(newMeta);
                });
                message.success("文档导入成功");
              } catch (error) {
                message.error("导入文档失败");
                console.error("Error when importing document.", error);
              }
            }}
          >
            导入文档
          </Button>
        </div>
        <div>
          <Select
            className="root-button-group-sortby"
            options={
              [
                {
                  value: "name",
                  label: "名称 ↑",
                },
                {
                  value: "name (reversed)",
                  label: "名称 ↓",
                },
                {
                  value: "modified at",
                  label: "修改时间 ↑",
                },
                {
                  value: "modified at (reversed)",
                  label: "修改时间 ↓",
                },
              ] as const satisfies Array<{
                value: typeof soryBy;
                label: string;
              }>
            }
            value={soryBy}
            onChange={(value) => {
              setSortBy(value);
            }}
          />
        </div>
      </div>
      <DocumentGrid
        updateDocumentMetas={updateDocumentMetas}
        documentMetas={Array.from(documentMetas).sort((x, y) => {
          if (soryBy === "name")
            return x.name.localeCompare(y.name, "zh-Hans-CN", {
              sensitivity: "accent",
            });
          else if (soryBy === "name (reversed)")
            return y.name.localeCompare(x.name, "zh-Hans-CN", {
              sensitivity: "accent",
            });
          else if (soryBy === "modified at")
            return (
              new Date(x.modifiedAt).getTime() -
              new Date(y.modifiedAt).getTime()
            );
          else if (soryBy === "modified at (reversed)")
            return (
              new Date(y.modifiedAt).getTime() -
              new Date(x.modifiedAt).getTime()
            );
          else {
            soryBy satisfies never;
            return 0;
          }
        })}
      />
    </>
  );
};

const Root: FC = () => {
  const initialDocumentMetasPromise = loadDocumentMetasFromDB();
  return (
    <Suspense>
      <RootImpl initialDocumentMetasPromise={initialDocumentMetasPromise} />
    </Suspense>
  );
};

export default Root;
