import { App, Button, Card, Image, Input, Upload } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMarkdown } from "@fortawesome/free-brands-svg-icons";
import {
  faInbox,
  faPenToSquare,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import type { ContentBase, ImmerContent } from "@/types/document";
import type { Updater } from "use-immer";
import type { Draft } from "immer";
import { eraseImageByIndex, pushBackImage } from "@/utils/imageUpdater";

import "./LocalImageManager.css";

type LocalImageManagerProps<Content extends ContentBase = ContentBase> = {
  content: ImmerContent<Content>;
  updateContent: Updater<ImmerContent<Content>>;
  label?: string;
};

const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/svg+xml",
  "image/webp",
] as const;

const ACCEPT_IMAGE_TYPES =
  ".png,.jpeg,.jpg,.gif,.svg,.webp,image/png,image/jpeg,image/gif,image/svg+xml,image/webp";

export default function LocalImageManager<
  Content extends ContentBase = ContentBase,
>({
  content,
  updateContent,
  label = "本地图片",
}: LocalImageManagerProps<Content>) {
  const { message } = App.useApp();
  const [imageEditModeId, setImageEditModeId] = useState<number | undefined>(
    undefined,
  );

  function updateImageName(index: number, name: string) {
    updateContent((x) => {
      // Keep type inference aligned with use-immer's generic draft behavior.
      // @ts-expect-error typescript cannot infer Draft<ImmerContent<Content>> correctly
      (x.images as Draft<ImmerContent<Content>["images"]>)[index].name = name;
    });
  }

  return (
    <div className="contest-editor-config-label contest-editor-config-image">
      <div>{label}</div>
      <div className="contest-editor-config-image-grid">
        {content.images.map((img, index) => (
          <Card
            key={img.uuid}
            classNames={{ body: "contest-editor-config-image-card" }}
          >
            <Image src={img.url} alt={img.name} height={150} />
            <div>
              {imageEditModeId !== index ? (
                <>
                  <div>{img.name}</div>
                  <Button
                    type="text"
                    icon={<FontAwesomeIcon icon={faPenToSquare} />}
                    onClick={() => setImageEditModeId(index)}
                  />
                </>
              ) : (
                <Input
                  name="edit image name"
                  value={img.name}
                  autoFocus
                  onChange={(e) => updateImageName(index, e.target.value)}
                  onBlur={() => setImageEditModeId(undefined)}
                />
              )}
            </div>
            <div>
              <Button
                type="text"
                icon={<FontAwesomeIcon icon={faMarkdown} />}
                onClick={() =>
                  navigator.clipboard
                    .writeText(`![${img.name}](asset://${img.uuid})`)
                    .then(
                      () => message.success("复制成功"),
                      (e) => {
                        console.error("Error when copy.", e);
                        message.error(
                          "复制失败：" +
                            (e instanceof Error ? e.message : String(e)),
                        );
                      },
                    )
                }
              />
              <Button
                type="text"
                icon={<FontAwesomeIcon icon={faTrashCan} />}
                onClick={async () => {
                  eraseImageByIndex(index, updateContent);
                }}
              />
            </div>
          </Card>
        ))}
        <Upload.Dragger
          name="add image"
          beforeUpload={(file) => {
            if (
              !SUPPORTED_IMAGE_TYPES.includes(
                file.type as (typeof SUPPORTED_IMAGE_TYPES)[number],
              )
            ) {
              message.error("不支持该图片类型。");
              return Upload.LIST_IGNORE;
            }
            return true;
          }}
          customRequest={async (options) => {
            const file = options.file;
            if (!(file instanceof File)) throw new Error("Invalid file");
            pushBackImage(
              { name: file.name, uuid: crypto.randomUUID(), blob: file },
              updateContent,
            );
          }}
          showUploadList={false}
          accept={ACCEPT_IMAGE_TYPES}
          multiple
          maxCount={0}
        >
          <FontAwesomeIcon icon={faInbox} size="3x" />
          <div>点击或拖拽上传</div>
          <div className="contest-editor-config-upload-hint">
            目前支持格式 PNG/JPEG/GIF/SVG
          </div>
        </Upload.Dragger>
      </div>
    </div>
  );
}
