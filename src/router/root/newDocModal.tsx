import { App, Button, Input, Modal } from "antd";
import { useCallback, useState, type FC } from "react";
import { useNavigate } from "react-router";

import { exampleDocuments, loadExampleContent } from "@/utils/exampleDocuments";
import {
  DocumentNameConflictError,
  createDocumentToDB,
} from "@/utils/indexedDB/browserStorage";

import "./newDocModal.css";

const NewDocModal: FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [selectedExample, setSelectedExample] = useState<string | undefined>(
    undefined,
  );
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const createDocument = useCallback(
    async (exampleName: string, filename: string) => {
      setLoading(true);
      try {
        const content = await loadExampleContent(exampleName);
        await createDocumentToDB({
          name: filename,
          templateId: exampleDocuments[exampleName].meta.template,
          content,
        });
        navigate(
          `/editor?file=${encodeURIComponent(`browser/${encodeURIComponent(filename)}`)}`,
        );
      } catch (e) {
        if (e instanceof DocumentNameConflictError) {
          message.error("文档名已存在");
        } else {
          message.error("创建文档失败");
          console.error(e);
        }
      } finally {
        setLoading(false);
      }
    },
    [message, navigate],
  );
  return (
    <Modal
      open={open}
      closable={{ onClose }}
      footer={
        <Button
          type="primary"
          disabled={!filename || !selectedExample || loading}
          onClick={() =>
            selectedExample &&
            filename &&
            !loading &&
            createDocument(selectedExample, filename)
          }
        >
          创建
        </Button>
      }
      className="new-doc-modal"
      style={{
        height: "100%",
        top: 0,
        margin: "0 auto",
        padding: 16,
        maxWidth: 1200,
      }}
      classNames={{
        body: "new-doc-modal-body",
      }}
      width="100%"
      title="选择示例模板"
    >
      <div>
        <div>
          {Object.entries(exampleDocuments)
            .sort(([namea], [nameb]) => namea.localeCompare(nameb))
            .map(([name, data]) => ({ name, ...data }))
            .map(({ name, meta, preview }) => (
              <div
                key={name}
                onClick={() => setSelectedExample(name)}
                className={name === selectedExample ? "selected" : ""}
                tabIndex={0}
              >
                <div>
                  <img src={preview} alt={meta.title} />
                </div>
                <span>{name}</span>
              </div>
            ))}
        </div>
      </div>
      <div>
        {selectedExample ? (
          <div>
            <h3>{exampleDocuments[selectedExample].meta.title}</h3>
            {exampleDocuments[selectedExample].meta.description}
          </div>
        ) : (
          <div>{/* TODO: 未选择模板时也写点东西 */}</div>
        )}
        <label className="filename-input-label">
          文件名
          <Input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
          />
        </label>
      </div>
    </Modal>
  );
};

export default NewDocModal;
