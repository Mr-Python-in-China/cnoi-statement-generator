import type { DocumentMeta } from "@/types/document";
import { useState, type FC } from "react";
import type { Updater } from "use-immer";
import { App, Button, Dropdown, Tooltip, Typography } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
  DocumentNameConflictError,
  loadDocumentMetaFromDB,
} from "@/utils/indexedDB/browserStorage";
import { exportDocument } from "@/utils/contestDataUtils";
import { Link } from "react-router";

import "./documentGrid.css";

const DocumentGrid: FC<{
  documentMetas: DocumentMeta[];
  updateDocumentMetas: Updater<DocumentMeta[]>;
}> = ({ documentMetas, updateDocumentMetas }) => {
  const { message } = App.useApp();
  const [editingTargetName, setEditingTargetName] = useState<
    string | undefined
  >(undefined);

  return (
    <div className="root-document-grid">
      {documentMetas.map((meta) => (
        <div key={meta.name}>
          <Link
            to={`/editor?file=${encodeURIComponent(`browser/${encodeURIComponent(meta.name)}`)}`}
          >
            {/*{meta.previewImage ? (
              <BlobImage
                blob={meta.previewImage}
                alt={`Document "${meta.name}" preview`}
              />
            ) : */}
            <div
              style={{
                // @ts-expect-error CSS variable
                "--doc-preview-card-color-hue": 0.625 + "turn",
              }}
            >
              <div>{meta.name}</div>
            </div>
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
                          meta.name,
                          newName,
                        );
                        updateDocumentMetas((draft) => {
                          draft.push(newMeta);
                        });
                        setEditingTargetName(newMeta.name);
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
                    onClick: () => setEditingTargetName(meta.name),
                  },
                  {
                    key: "backup",
                    label: "备份",
                    icon: <FontAwesomeIcon icon={faDownload} />,
                    onClick: async () => {
                      try {
                        await exportDocument(
                          await loadDocumentFromDB(meta.name),
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
                        const backup = await loadDocumentFromDB(meta.name);
                        const backupMeta = await loadDocumentMetaFromDB(
                          meta.name,
                        );
                        await deleteDocumentFromDB(meta.name);
                        updateDocumentMetas((draft) => {
                          draft.splice(
                            draft.findIndex((m) => m.name === meta.name),
                            1,
                          );
                        });

                        const messageKey = crypto.randomUUID();
                        message.success({
                          key: messageKey,
                          content: (
                            <>
                              已删除{" "}
                              <Typography.Link
                                onClick={() => {
                                  saveDocumentToDB(
                                    backup,
                                    backupMeta.modifiedAt,
                                  );
                                  updateDocumentMetas((draft) => {
                                    draft.push({
                                      name: backup.name,
                                      templateId: backup.templateId,
                                      modifiedAt: backupMeta.modifiedAt,
                                    });
                                  });
                                  message.destroy(messageKey);
                                }}
                              >
                                撤销
                              </Typography.Link>
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
                onClick: (e) => e.domEvent.preventDefault(),
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
              editing: editingTargetName === meta.name,
              onStart: () => setEditingTargetName(meta.name),
              onChange: async (s) => {
                if (s.length === 0) {
                  message.error("文档名不能为空");
                  return;
                }
                try {
                  const renamedMeta = await renameDocumentToDB(meta.name, s);
                  updateDocumentMetas((draft) => {
                    const index = draft.findIndex((m) => m.name === meta.name);
                    if (index !== -1) draft[index] = renamedMeta;
                  });
                } catch (e) {
                  if (e instanceof DocumentNameConflictError) {
                    message.error("文档名已存在");
                  } else {
                    message.error("重命名文档失败");
                    console.error("Failed to rename document:", e);
                  }
                } finally {
                  setEditingTargetName(undefined);
                }
              },
              onCancel: () => setEditingTargetName(undefined),
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
