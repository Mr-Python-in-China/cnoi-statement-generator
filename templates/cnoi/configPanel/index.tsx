import { Button, DatePicker, Input, Switch, Tooltip } from "antd";
import { useEffect, useRef, useState, type FC } from "react";
import dayjs from "dayjs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleQuestion,
  faPlus,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import "./index.css";
import ProblemList from "./problemList";
import type { Content, DateArr } from "../types";
import type { ConfigPanelFC } from "@/types/templates";
import LocalImageManager from "@/components/LocalImageManager";

const QuestionMarkToolTip: FC<{ children: string }> = ({ children }) => (
  <sup>
    <Tooltip title={children}>
      <FontAwesomeIcon icon={faCircleQuestion} color="gray" />
    </Tooltip>
  </sup>
);

const ConfigPanel: ConfigPanelFC<Content> = ({
  content,
  updateContent,
  setPanel,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [width, setWidth] = useState(220);
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
    cb: (x: Content["support_languages"][number]) => void,
  ) {
    updateContent((x) => {
      cb(x.support_languages[index]);
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
          value={content.title}
          onChange={(x) =>
            updateContent((v) => {
              v.title = x.target.value;
            })
          }
        />
      </label>
      <label>
        <div>副标题</div>
        <Input
          name="subtitle"
          value={content.subtitle}
          onChange={(e) =>
            updateContent((x) => {
              x.subtitle = e.target.value;
            })
          }
        />
      </label>
      <label>
        <div>场次</div>
        <Input
          name="dayname"
          value={content.dayname}
          onChange={(e) =>
            updateContent((x) => {
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
            dateArrToDayJs(content.date.start),
            dateArrToDayJs(content.date.end),
          ]}
          onChange={(e) =>
            updateContent((x) => {
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
              value={content.noi_style}
              onChange={(v) =>
                updateContent((x) => {
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
              value={content.file_io}
              onChange={(v) =>
                updateContent((x) => {
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
              value={content.use_pretest}
              onChange={(v) =>
                updateContent((x) => {
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
          {content.support_languages.map((lang, index) => (
            <div key={lang.uuid}>
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
              {content.support_languages.length > 1 && (
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
                      updateContent((x) => {
                        const i = x.support_languages.findIndex(
                          (v) => v.uuid === lang.uuid,
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
              updateContent((x) => {
                const newLang: Content["support_languages"][number] = {
                  uuid: crypto.randomUUID(),
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
          content,
          updateContent,
          setPanel,
          panelWidth: width,
        }}
      />
      <LocalImageManager {...{ content, updateContent }} />
    </form>
  );
};

export default ConfigPanel;
