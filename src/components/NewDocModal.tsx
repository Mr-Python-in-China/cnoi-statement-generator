import { App, Button, Modal } from "antd";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";

import { navigateToEditorWithDoc } from "@/router/editor/navigationState";
import { toImmerContent } from "@/utils/contestDataUtils";
import { exampleDocuments, loadExampleContent } from "@/utils/exampleDocuments";

import { createModal } from "./modalWrapper";

import "./NewDocModal.css";

const NewDocModal = createModal<void, void>(({ modalHandler }) => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [selectedExample, setSelectedExample] = useState<string | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(false);
  const createDocument = useCallback(
    async (selectedExample: string) => {
      setLoading(true);
      try {
        const content = await loadExampleContent(selectedExample);
        navigateToEditorWithDoc(
          navigate,
          {
            name: exampleDocuments[selectedExample].meta.title,
            templateId: exampleDocuments[selectedExample].meta.template,
            content: toImmerContent(content),
          },
          ["tmp", crypto.randomUUID()],
        );
      } catch (e) {
        message.error("新建文档失败");
        console.error("Failed to create new file", e);
        setLoading(false);
      }
    },
    [message, navigate],
  );
  return (
    <Modal
      open={modalHandler.visible}
      closable={!loading && { onClose: () => modalHandler.resolveHide() }}
      afterClose={modalHandler.remove}
      footer={
        <Button
          type="primary"
          disabled={!selectedExample || loading}
          onClick={async () =>
            selectedExample && !loading && createDocument(selectedExample)
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
      </div>
    </Modal>
  );
});

export default NewDocModal;
