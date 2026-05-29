import changeLogHTML from "/CHANGELOG.md";
import favicon from "/favicon.svg";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faInfo, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Select } from "antd";
import { Suspense, use, useState, type FC } from "react";
import { Link } from "react-router";
import { useImmer } from "use-immer";

import { useModal } from "@/components/modalWrapper";

import "./index.css";
import { VersionInfoModal } from "@/components/VersionInfoModal";
import type { DocumentMeta } from "@/types/document";
import { loadDocumentMetasFromDB } from "@/utils/indexedDB/browserStorage";

import DocumentGrid from "./documentGrid";
import NewDocModal from "./newDocModal";

const RootImpl: FC<{
  initialDocumentMetasPromise: Promise<DocumentMeta[]>;
}> = ({ initialDocumentMetasPromise }) => {
  const [documentMetas, updateDocumentMetas] = useImmer(
    use(initialDocumentMetasPromise),
  );
  const [sortBy, setSortBy] = useState<
    "name" | "name (reversed)" | "modified at" | "modified at (reversed)"
  >("modified at (reversed)");
  const [openNewDocModal, setOpenNewDocModal] = useState(false);
  const [versionInfo, versionInfoContextHolder] = useModal(VersionInfoModal);
  return (
    <>
      <NewDocModal
        open={openNewDocModal}
        onClose={() => setOpenNewDocModal(false)}
      />
      <header className="root-header">
        <Link to="/">
          <img src={favicon} alt="Favicon" className="favicon" />
          <h1 className="app-title">CNOI Statement Generator</h1>
        </Link>
        <Link
          to="https://github.com/Mr-Python-in-China/cnoi-statement-generator"
          target="_blank"
        >
          <FontAwesomeIcon icon={faGithub} />
        </Link>
      </header>
      <div className="root-container">
        <div className="root-main">
          <div className="root-button-group">
            <div>
              <Button
                type="primary"
                icon={<FontAwesomeIcon icon={faPlus} />}
                onClick={() => setOpenNewDocModal(true)}
              >
                新建文档
              </Button>
              <Button
                icon={<FontAwesomeIcon icon={faInfo} />}
                onClick={() => versionInfo.show()}
              >
                关于
              </Button>
            </div>
            {versionInfoContextHolder}
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
                    value: typeof sortBy;
                    label: string;
                  }>
                }
                value={sortBy}
                onChange={(value) => {
                  setSortBy(value);
                }}
              />
            </div>
          </div>
          <DocumentGrid
            updateDocumentMetas={updateDocumentMetas}
            documentMetas={Array.from(documentMetas).sort((x, y) => {
              if (sortBy === "name")
                return x.name.localeCompare(y.name, "zh-Hans-CN", {
                  sensitivity: "accent",
                });
              else if (sortBy === "name (reversed)")
                return y.name.localeCompare(x.name, "zh-Hans-CN", {
                  sensitivity: "accent",
                });
              else if (sortBy === "modified at")
                return (
                  new Date(x.modifiedAt).getTime() -
                  new Date(y.modifiedAt).getTime()
                );
              else if (sortBy === "modified at (reversed)")
                return (
                  new Date(y.modifiedAt).getTime() -
                  new Date(x.modifiedAt).getTime()
                );
              else {
                sortBy satisfies never;
                return 0;
              }
            })}
          />
        </div>
        <ChangeLog />
      </div>
    </>
  );
};

const ChangeLog = () => {
  return (
    <div className="root-changelog">
      <p>加 QQ 群（1012989587）关注项目最新动态。也可反馈问题或闲聊。</p>
      <h1>更新日志</h1>
      <article dangerouslySetInnerHTML={{ __html: changeLogHTML }} />
    </div>
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
