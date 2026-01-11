import type { DocumentMeta } from "@/types/document";
import { useState, type FC } from "react";
import type { Updater } from "use-immer";
import BlobImage from "@/components/BlobImage";
import { App, Button, Dropdown, Tooltip, Typography } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import "./documentGrid.css";
import {
  faCopy,
  faDownload,
  faEllipsis,
  faPenToSquare,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import {
  cloneDocumentToDB,
  deleteDocumentFromDB,
  loadDocumentFromDB,
  renameDocumentToDB,
  saveDocumentToDB,
} from "@/utils/indexedDBUtils";
import { exportDocument } from "@/utils/contestDataUtils";
import { Link } from "react-router";

const DocumentGrid: FC<{
  documentMetas: DocumentMeta[];
  updateDocumentMetas: Updater<DocumentMeta[]>;
}> = ({ documentMetas, updateDocumentMetas }) => {
  const { message } = App.useApp();
  const [editingTargetUUID, setEditingTargetUUID] = useState<
    string | undefined
  >(undefined);
  return (
    <div className="root-document-grid">
      {documentMetas.map((meta) => (
        <div key={meta.uuid}>
          <Link to={`/editor/${meta.uuid}`}>
            {meta.previewImage ? (
              <BlobImage
                blob={meta.previewImage}
                alt={`Document "${meta.name}" preview`}
              />
            ) : (
              <div
                style={{
                  // @ts-expect-error CSS variable
                  "--doc-preview-card-color-hue":
                    (parseInt(meta.uuid[meta.uuid.length - 1], 16) % 8) / 8 +
                    "turn",
                }}
              >
                <div>{meta.name}</div>
              </div>
            )}
            <Dropdown
              menu={{
                items: [
                  {
                    key: "copy",
                    label: "复制",
                    icon: <FontAwesomeIcon icon={faCopy} />,
                    onClick: async () => {
                      const newName = `${meta.name} 副本`;
                      try {
                        const newMeta = await cloneDocumentToDB(
                          meta.uuid,
                          newName,
                        );
                        updateDocumentMetas((draft) => {
                          draft.push(newMeta);
                        });
                        setEditingTargetUUID(newMeta.uuid);
                      } catch (e) {
                        message.error("复制文档失败");
                        console.error("Failed to clone document:", e);
                      }
                    },
                  },
                  {
                    key: "rename",
                    label: "重命名",
                    icon: <FontAwesomeIcon icon={faPenToSquare} />,
                    onClick: () => setEditingTargetUUID(meta.uuid),
                  },
                  {
                    key: "backup",
                    label: "备份",
                    icon: <FontAwesomeIcon icon={faDownload} />,
                    onClick: async () => {
                      try {
                        await exportDocument(
                          await loadDocumentFromDB(meta.uuid),
                        );
                        message.success("文档备份成功");
                      } catch (error) {
                        message.error("文档备份失败");
                        console.error("Error when exporting config.", error);
                      }
                    },
                  },
                  {
                    key: "delete",
                    label: "删除",
                    danger: true,
                    icon: <FontAwesomeIcon icon={faTrash} />,
                    onClick: async () => {
                      try {
                        const backup = await loadDocumentFromDB(meta.uuid);
                        await deleteDocumentFromDB(meta.uuid);
                        updateDocumentMetas((draft) => {
                          draft.splice(
                            draft.findIndex((m) => m.uuid === meta.uuid),
                            1,
                          );
                        });

                        const messageKey = crypto.randomUUID();
                        message.success({
                          key: messageKey,
                          content: (
                            <>
                              已删除
                              <Button
                                type="link"
                                onClick={() => {
                                  saveDocumentToDB(backup, true);
                                  updateDocumentMetas((draft) => {
                                    draft.push({
                                      uuid: backup.uuid,
                                      name: backup.name,
                                      templateId: backup.templateId,
                                      modifiedAt: backup.modifiedAt,
                                      previewImage: backup.previewImage,
                                    });
                                  });
                                  message.destroy(messageKey);
                                }}
                              >
                                撤销
                              </Button>
                            </>
                          ),
                          duration: 10,
                        });
                      } catch (e) {
                        message.error("删除文档失败");
                        console.error("Failed to delete document:", e);
                      }
                    },
                  },
                ],
              }}
              trigger={["click"]}
            >
              <Tooltip title="更多操作">
                <Button
                  type="default"
                  icon={<FontAwesomeIcon icon={faEllipsis} />}
                  onClick={(e) => e.preventDefault()}
                />
              </Tooltip>
            </Dropdown>
          </Link>
          <Typography.Text
            editable={{
              triggerType: ["text"],
              editing: editingTargetUUID === meta.uuid,
              onStart: () => setEditingTargetUUID(meta.uuid),
              onChange: async (s) => {
                if (s.length === 0) {
                  message.error("文档名不能为空");
                  return;
                }
                try {
                  await renameDocumentToDB(meta.uuid, s);
                  updateDocumentMetas((draft) => {
                    draft[draft.findIndex((m) => m.uuid === meta.uuid)].name =
                      s;
                  });
                } catch (e) {
                  message.error("重命名文档失败");
                  console.error("Failed to rename document:", e);
                }
                setEditingTargetUUID(undefined);
              },
              onCancel: () => setEditingTargetUUID(undefined),
            }}
          >
            {meta.name}
          </Typography.Text>
        </div>
      ))}
    </div>
  );
};

export default DocumentGrid;
