import { Button, Modal } from "antd";
import { type FC } from "react";
import {
  version as APP_VERSION,
  repository as REPOSITORY_URL,
} from "/package.json";
import { Link } from "react-router";

import "./VersionInfo.css";

export const VersionInfoModal: FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  return (
    <Modal
      title="关于"
      open={open}
      onCancel={onClose}
      footer={
        <Button type="primary" onClick={onClose}>
          确定
        </Button>
      }
      width={600}
    >
      <div className="version-info-layout">
        <img src="/favicon.svg" alt="icon" className="version-info-icon" />
        <div className="version-info-details">
          <strong>CNOI Statement Generator</strong>
          <div>这是一个开源项目，按照 AGPL 3.0 许可证发布。</div>
          <div>
            <strong>仓库：</strong>
            <Link to={REPOSITORY_URL.url}>{REPOSITORY_URL.url}</Link>
          </div>
          <br />
          <div>
            <strong>版本：</strong>
            {APP_VERSION}
          </div>
          <div>
            <strong>提交 ID：</strong>
            {GIT_COMMIT_INFO + (import.meta.env.DEV ? " (dev)" : "")}
          </div>
          <div>
            <strong>构建时间：</strong>
            {BUILD_TIME}
          </div>
          <br />
          <div>
            <strong>浏览器：</strong>
            {navigator.userAgent}
          </div>
          <div>
            <strong>语言：</strong>
            {navigator.language}
          </div>
        </div>
      </div>
    </Modal>
  );
};
