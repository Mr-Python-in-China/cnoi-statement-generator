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
  faChevronDown,
  faChevronUp,
  faCircleQuestion,
  faInbox,
  faPenToSquare,
  faPlus,
  faTrashCan,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { newProblem, removeProblemCallback } from "@/utils/contestDataUtils";
import { addImage, deleteImage } from "@/utils/imageManager";

import "./configPanel.css";
import { faMarkdown } from "@fortawesome/free-brands-svg-icons";

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
  const { modal, message } = App.useApp();
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
  function updateProblemData(
    index: number,
    cb: (x: ImmerContestData["problems"][number]) => void,
  ) {
    updateContestData((x) => {
      cb(x.problems[index]);
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
  const removeProblem = removeProblemCallback(
    modal,
    setPanel,
    updateContestData,
  );
  function syncAdvancedFields(problem: ImmerContestData["problems"][number]) {
    if (problem.advancedEditing) return;
    problem.dir = problem.exec = problem.name;
    problem.input = problem.name + ".in";
    problem.output = problem.name + ".out";
  }
  return (
    <form className="contest-editor-config" ref={formRef}>
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
      <div
        className={
          "contest-editor-config-switches" +
          (width <= 300 ? " contest-editor-config-switches-narrow" : "")
        }
      >
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
      <div className="contest-editor-config-label contest-editor-config-problem">
        <div>题目信息</div>
        <div>
          {contestData.problems.map((problem, index) => (
            <Card
              key={problem.key}
              title={
                <div className="contest-editor-config-problem-card-title">
                  <div>第 {index + 1} 题</div>
                  <div>
                    <Switch
                      checked={problem.advancedEditing ?? false}
                      onChange={(x) =>
                        updateProblemData(index, (v) => {
                          v.advancedEditing = x;
                          syncAdvancedFields(v);
                        })
                      }
                    />
                    高级编辑
                  </div>
                </div>
              }
              extra={[
                <Button
                  key="move-up"
                  type="text"
                  shape="circle"
                  disabled={index === 0}
                  icon={<FontAwesomeIcon icon={faChevronUp} />}
                  onClick={() =>
                    updateContestData((x) => {
                      [x.problems[index - 1], x.problems[index]] = [
                        x.problems[index],
                        x.problems[index - 1],
                      ];
                    })
                  }
                />,
                <Button
                  key="move-down"
                  type="text"
                  shape="circle"
                  disabled={index === contestData.problems.length - 1}
                  icon={<FontAwesomeIcon icon={faChevronDown} />}
                  onClick={() =>
                    updateContestData((x) => {
                      [x.problems[index + 1], x.problems[index]] = [
                        x.problems[index],
                        x.problems[index + 1],
                      ];
                    })
                  }
                />,
                <Button
                  key="delete"
                  type="text"
                  shape="circle"
                  icon={<FontAwesomeIcon icon={faXmark} />}
                  onClick={() => removeProblem(problem.key)}
                />,
              ]}
              className={
                "contest-editor-config-problem" +
                (width <= 400 ? " contest-editor-config-problem-narrow" : "")
              }
            >
              <div>
                <label>
                  <div>题目英文名称</div>
                  <Input
                    name={`problem ${index} name`}
                    value={problem.name}
                    onChange={(e) =>
                      updateProblemData(index, (x) => {
                        x.name = e.target.value;
                        syncAdvancedFields(x);
                      })
                    }
                  />
                </label>
                <label>
                  <div>题目中文名称</div>
                  <Input
                    name={`problem ${index} title`}
                    value={problem.title}
                    onChange={(e) =>
                      updateProblemData(
                        index,
                        (x) => (x.title = e.target.value),
                      )
                    }
                  />
                </label>
                <label>
                  <div>题目类型</div>
                  <Input
                    name={`problem ${index} type`}
                    value={problem.type}
                    onChange={(e) =>
                      updateProblemData(index, (x) => (x.type = e.target.value))
                    }
                  />
                </label>
              </div>
              {problem.advancedEditing && contestData.noi_style && (
                <div>
                  <label>
                    <div>目录</div>
                    <Input
                      name={`problem ${index} directory`}
                      value={problem.dir}
                      onChange={(e) =>
                        updateProblemData(
                          index,
                          (x) => (x.dir = e.target.value),
                        )
                      }
                      className="contest-editor-config-monoinput"
                    />
                  </label>
                  <label>
                    <div>可执行文件名</div>
                    <Input
                      name={`problem ${index} executable`}
                      value={problem.exec}
                      onChange={(e) =>
                        updateProblemData(
                          index,
                          (x) => (x.exec = e.target.value),
                        )
                      }
                      className="contest-editor-config-monoinput"
                    />
                  </label>
                </div>
              )}
              {problem.advancedEditing && contestData.file_io && (
                <div>
                  <label>
                    <div>输入文件名</div>
                    <Input
                      name={`problem ${index} input file`}
                      value={problem.input}
                      onChange={(e) =>
                        updateProblemData(
                          index,
                          (x) => (x.input = e.target.value),
                        )
                      }
                      className="contest-editor-config-monoinput"
                    />
                  </label>
                  <label>
                    <div>输出文件名</div>
                    <Input
                      name={`problem ${index} output file`}
                      value={problem.output}
                      onChange={(e) =>
                        updateProblemData(
                          index,
                          (x) => (x.output = e.target.value),
                        )
                      }
                      className="contest-editor-config-monoinput"
                    />
                  </label>
                </div>
              )}
              <div>
                <label>
                  <div>时间限制</div>
                  <Input
                    name={`problem ${index} time limit`}
                    value={problem.time_limit}
                    onChange={(e) =>
                      updateProblemData(
                        index,
                        (x) => (x.time_limit = e.target.value),
                      )
                    }
                  />
                </label>
                <label>
                  <div>空间限制</div>
                  <Input
                    name={`problem ${index} memory limit`}
                    value={problem.memory_limit}
                    onChange={(e) =>
                      updateProblemData(
                        index,
                        (x) => (x.memory_limit = e.target.value),
                      )
                    }
                  />
                </label>
              </div>
              <div>
                <label>
                  <div>{contestData.noi_style ? "测试点" : "子任务"}数目</div>
                  <Input
                    name={`problem ${index} test case count`}
                    value={problem.testcase}
                    onChange={(e) =>
                      updateProblemData(
                        index,
                        (x) => (x.testcase = e.target.value),
                      )
                    }
                  />
                </label>
                {contestData.noi_style && (
                  <label>
                    <div>测试点是否等分</div>
                    <Input
                      name={`problem ${index} testcase point equally`}
                      value={problem.point_equal}
                      onChange={(e) =>
                        updateProblemData(
                          index,
                          (x) => (x.point_equal = e.target.value),
                        )
                      }
                    />
                  </label>
                )}
                {contestData.use_pretest && (
                  <label>
                    <div>预测试点数目</div>
                    <Input
                      name={`problem ${index} pre-testcase count`}
                      value={problem.pretestcase}
                      onChange={(e) =>
                        updateProblemData(
                          index,
                          (x) => (x.pretestcase = e.target.value),
                        )
                      }
                    />
                  </label>
                )}
              </div>
              <div className="contest-editor-config-problem-languages">
                {problem.submit_filename.map((filename, findex) => (
                  <label key={contestData.support_languages[findex].key}>
                    <div>
                      {contestData.support_languages[findex].name} 提交文件名
                    </div>
                    <Input
                      name={`problem ${index} language ${findex} file name`}
                      value={filename}
                      onChange={(e) =>
                        updateProblemData(
                          index,
                          (x) => (x.submit_filename[findex] = e.target.value),
                        )
                      }
                      className="contest-editor-config-monoinput"
                    />
                  </label>
                ))}
              </div>
            </Card>
          ))}
          <Button
            type="dashed"
            icon={<FontAwesomeIcon icon={faPlus} />}
            onClick={() =>
              updateContestData((x) => {
                x.problems.push(newProblem(x));
              })
            }
          >
            添加题目
          </Button>
        </div>
      </div>
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
