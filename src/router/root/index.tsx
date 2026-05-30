import changeLogHTML from "/CHANGELOG.md";
import favicon from "/favicon.svg";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import {
  faFolderOpen,
  faInfo,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "antd";
import { Suspense, use, type FC } from "react";
import { Link, useNavigate } from "react-router";

import ExplorerModal from "@/components/ExplorerModal";
import { useModal } from "@/components/modalWrapper";
import { VersionInfoModal } from "@/components/VersionInfoModal";
import { toImmerContent } from "@/utils/contestDataUtils";
import {
  getRecentlyOpened,
  type RecentlyOpenedEntry,
} from "@/utils/indexedDB/recentlyOpened";

import NewDocModal from "../../components/NewDocModal";
import { navigateToEditorWithDoc } from "../editor/navigationState";
import DocumentGrid from "./documentGrid";

import "./index.css";

const RootImpl: FC<{
  initialRecentlyOpenedPromise: Promise<RecentlyOpenedEntry[]>;
}> = ({ initialRecentlyOpenedPromise }) => {
  const recentlyOpened = use(initialRecentlyOpenedPromise);

  const navigate = useNavigate();

  const [newDocModal, newDocModalContextHolder] = useModal(NewDocModal);
  const [explorerModal, explorerModalContextHolder] = useModal(ExplorerModal);
  const [versionInfo, versionInfoContextHolder] = useModal(VersionInfoModal);

  return (
    <>
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
                onClick={() => newDocModal.show()}
              >
                新建文档
              </Button>
              <Button
                icon={<FontAwesomeIcon icon={faFolderOpen} />}
                onClick={() =>
                  explorerModal.show({ mode: "open" }).then((v) => {
                    if (v.state !== "success") return;
                    navigateToEditorWithDoc(
                      navigate,
                      {
                        ...v.doc,
                        content: toImmerContent(v.doc.content),
                      },
                      v.path,
                    );
                  })
                }
              >
                打开文档
              </Button>
              <Button
                icon={<FontAwesomeIcon icon={faInfo} />}
                onClick={() => versionInfo.show()}
              >
                关于
              </Button>
            </div>
          </div>
          <div>
            <h2>最近打开</h2>
            <DocumentGrid recentlyOpened={recentlyOpened} />
          </div>
        </div>
        <ChangeLog />
      </div>
      {newDocModalContextHolder}
      {explorerModalContextHolder}
      {versionInfoContextHolder}
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
  const initialRecentlyOpenedPromise = getRecentlyOpened();
  return (
    <Suspense>
      <RootImpl initialRecentlyOpenedPromise={initialRecentlyOpenedPromise} />
    </Suspense>
  );
};

export default Root;
