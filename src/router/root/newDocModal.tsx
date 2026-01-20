import { Button, Form, Input, Modal } from "antd";
import { useId, useState, type FC } from "react";
import exampleDocuments from "@/utils/exampleDocuments";

import "./newDocModal.css";

const NewDocModal: FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const [selectedExample, setSelectedExample] = useState<string | undefined>(
    undefined,
  );
  const [filename, setFilename] = useState("");
  const filenameInputId = useId();
  return (
    <Modal
      open={open}
      closable={{ onClose }}
      footer={
        <Button type="primary" disabled={!filename || !selectedExample}>
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
        <div>
          <Form.Item label="文件名" layout="vertical" name={filenameInputId}>
            <Input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
            />
          </Form.Item>
        </div>
      </div>
    </Modal>
  );
};

export default NewDocModal;
