import {
  Button,
  Card,
  DatePicker,
  Input,
  Switch,
  Tooltip,
  App,
  Upload,
  Image,
} from "antd";
import {
  useEffect,
  useRef,
  useState,
  type FC,
  type Dispatch,
  type SetStateAction,
} from "react";
import { type Updater } from "use-immer";
import type { DateArr, ImmerContestData } from "@/types/contestData";
import dayjs from "dayjs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleQuestion,
  faInbox,
  faPenToSquare,
  faPlus,
  faTrashCan,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { addImage, deleteImage } from "@/utils/imageManager";

import "./index.css";
import { faMarkdown } from "@fortawesome/free-brands-svg-icons";
import ProblemList from "./problemList";

const QuestionMarkToolTip: FC<{ children: string }> = ({ children }) => (
  <sup>
    <Tooltip title={children}>
      <FontAwesomeIcon icon={faCircleQuestion} color="gray" />
    </Tooltip>
  </sup>
);

const ConfigPanel: FC<{
  contestData: ImmerContestData;
  updateContestData: Updater<ImmerContestData>;
  setPanel: Dispatch<SetStateAction<string>>;
}> = ({ contestData, updateContestData, setPanel }) => {
  const { message } = App.useApp();
  const formRef = useRef<HTMLFormElement>(null);
  const [width, setWidth] = useState(220);
  const [imageEditModeId, setImageEditModeId] = useState<number | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!formRef.current) return;
    const form = formRef.current;
    const ro = new ResizeObserver(() => setWidth(form.clientWidth));
    ro.observe(form);
    return () => ro.disconnect();
  }, []);

  function dateArrToDayJs(date: DateArr) {
    return dayjs()
      .year(date[0])
      .month(date[1] - 1)
      .date(date[2])
      .hour(date[3])
      .minute(date[4])
      .second(date[5]);
  }
  function dayJsToDateArr(date: dayjs.Dayjs): DateArr {
    return [
      date.year(),
      date.month() + 1,
      date.date(),
      date.hour(),
      date.minute(),
      date.second(),
    ];
  }
  function updateLang(
    index: number,
    cb: (x: ImmerContestData["support_languages"][number]) => void,
  ) {
    updateContestData((x) => {
      cb(x.support_languages[index]);
    });
  }
  function updateImages(
    index: number,
    cb: (x: ImmerContestData["images"][number]) => void,
  ) {
    updateContestData((x) => {
      cb(x.images[index]);
    });
  }
  return (
    <form
      className={
        "contest-editor-config" +
        (width <= 300
          ? " width-leq-300"
          : width <= 400
            ? " width-ge-300-leq-400"
            : "")
      }
      ref={formRef}
    >
      <label>
        <div>标题</div>
        <Input
          name="title"
          value={contestData.title}
          onChange={(x) =>
            updateContestData((v) => {
              v.title = x.target.value;
            })
          }
        />
      </label>
      <label>
        <div>副标题</div>
        <Input
          name="subtitle"
          value={contestData.subtitle}
          onChange={(e) =>
            updateContestData((x) => {
              x.subtitle = e.target.value;
            })
          }
        />
      </label>
      <label>
        <div>场次</div>
        <Input
          name="dayname"
          value={contestData.dayname}
          onChange={(e) =>
            updateContestData((x) => {
              x.dayname = e.target.value;
            })
          }
        />
      </label>
      <label>
        <div>日期</div>
        <DatePicker.RangePicker
          showTime
          name="date"
          value={[
            dateArrToDayJs(contestData.date.start),
            dateArrToDayJs(contestData.date.end),
          ]}
          onChange={(e) =>
            updateContestData((x) => {
              if (e?.[0]) x.date.start = dayJsToDateArr(e[0]);
              if (e?.[1]) x.date.end = dayJsToDateArr(e[1]);
            })
          }
        />
      </label>
      <div className="contest-editor-config-switches">
        <label>
          <div>
            NOI 风格
            <QuestionMarkToolTip>
              题目按照通过的测试点给分，选手需要按要求建立子文件夹与源程序文件
            </QuestionMarkToolTip>
          </div>
          <div>
            <Switch
              value={contestData.noi_style}
              onChange={(v) =>
                updateContestData((x) => {
                  x.noi_style = v;
                })
              }
            />
          </div>
        </label>
        <label>
          <div>
            文件 IO
            <QuestionMarkToolTip>
              选手需要从文件而非标准输入输出读写数据
            </QuestionMarkToolTip>
          </div>
          <div>
            <Switch
              value={contestData.file_io}
              onChange={(v) =>
                updateContestData((x) => {
                  x.file_io = v;
                })
              }
            />
          </div>
        </label>
        <label>
          <div>启用 Pretest</div>
          <div>
            <Switch
              value={contestData.use_pretest}
              onChange={(v) =>
                updateContestData((x) => {
                  x.use_pretest = v;
                })
              }
            />
          </div>
        </label>
      </div>
      <div className="contest-editor-config-languages contest-editor-config-label">
        <div>编程语言</div>
        <div>
          {contestData.support_languages.map((lang, index) => (
            <div key={lang.key}>
              <label>
                <div>名称</div>
                <Input
                  value={lang.name}
                  name={`language ${index} name`}
                  onChange={(e) =>
                    updateLang(index, (x) => {
                      x.name = e.target.value;
                    })
                  }
                />
              </label>
              <label>
                <div>编译选项</div>
                <Input
                  className="contest-editor-config-monoinput"
                  name={`language ${index} compile options`}
                  value={lang.compile_options}
                  onChange={(e) =>
                    updateLang(index, (x) => {
                      x.compile_options = e.target.value;
                    })
                  }
                />
              </label>
              {contestData.support_languages.length > 1 && (
                <div className="contest-editor-config-label">
                  <div
                    style={{
                      visibility: "hidden",
                      width: 0,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    删除该语言
                  </div>
                  <Button
                    type="text"
                    shape="circle"
                    icon={<FontAwesomeIcon icon={faXmark} />}
                    onClick={() =>
                      updateContestData((x) => {
                        const i = x.support_languages.findIndex(
                          (v) => v.key === lang.key,
                        );
                        if (i === -1)
                          throw new Error("Target language not found");
                        x.support_languages.splice(i, 1);
                        for (const p of x.problems)
                          p.submit_filename.splice(i, 1);
                      })
                    }
                  />
                </div>
              )}
            </div>
          ))}
          <Button
            type="dashed"
            onClick={() =>
              updateContestData((x) => {
                const newLang = {
                  key: crypto.randomUUID(),
                  name: `Lang${x.support_languages.length + 1}`,
                  compile_options: `Lang ${
                    x.support_languages.length + 1
                  } Compile Options`,
                };
                for (const p of x.problems)
                  if (!(newLang.name in p.submit_filename))
                    p.submit_filename.push(
                      p.name + `.lang${x.support_languages.length + 1}`,
                    );
                x.support_languages.push(newLang);
              })
            }
            icon={<FontAwesomeIcon icon={faPlus} />}
          >
            添加语言
          </Button>
        </div>
      </div>
      <ProblemList
        {...{
          contestData,
          updateContestData,
          setPanel,
          panelWidth: width,
        }}
      />
      <div className="contest-editor-config-label contest-editor-config-image">
        <div>本地图片</div>
        <div>
          {contestData.images.map((img, index) => {
            return (
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
                      onChange={(e) =>
                        updateImages(index, (x) => {
                          x.name = e.target.value;
                        })
                      }
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
                      const imageToDelete = contestData.images[index];
                      await deleteImage({
                        uuid: imageToDelete.uuid,
                        updateContestData,
                      });
                    }}
                  />
                </div>
              </Card>
            );
          })}
          <Upload.Dragger
            name="add image"
            beforeUpload={(file) => {
              if (
                ![
                  "image/png",
                  "image/jpeg",
                  "image/gif",
                  "image/svg+xml",
                ].includes(file.type)
              ) {
                message.error("不支持该图片类型。");
                return Upload.LIST_IGNORE;
              }
              return true;
            }}
            customRequest={async (options) => {
              const file = options.file;
              if (!(file instanceof File)) throw new Error("Invalid file");

              await addImage({
                file,
                updateContestData,
              });
            }}
            showUploadList={false}
            accept=".png,.jpeg,.gif,.svg,image/png,image/jpeg,image/gif,image/svg+xml"
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
    </form>
  );
};

export default ConfigPanel;
