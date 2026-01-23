import {
  useEffect,
  useRef,
  type Dispatch,
  type FC,
  type SetStateAction,
} from "react";
import { useDeepCompareEffect } from "@reactuses/core";
import type { Updater } from "use-immer";
import {
  faChevronUp,
  faChevronDown,
  faXmark,
  faPlus,
  faBars,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Card, Switch, Button, Input, App } from "antd";
import { DndContext, MeasuringStrategy, useDndContext } from "@dnd-kit/core";
import {
  arrayMove,
  arraySwap,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import type { Content } from "../types";
import createNewProblem from "../createNewProblem";
import { removeProblemCallback } from "@/utils/contestDataUtils";

type ImmerContent = import("@/types/document").ImmerContent<Content>;

const ProblemItem: FC<{
  problemData: ImmerContent["problems"][number];
  index: number;
  problemCount: number;
  noiStyle: boolean;
  fileIO: boolean;
  usePretest: boolean;
  supportLanguages: ImmerContent["support_languages"];
  onClickMoveUp: () => void;
  onClickMoveDown: () => void;
  onClickDelete: () => void;
  updateProblemData: (
    cb: (x: ImmerContent["problems"][number]) => void,
  ) => void;
}> = ({
  problemData: problem,
  index,
  problemCount,
  noiStyle,
  fileIO,
  usePretest,
  supportLanguages,
  onClickMoveUp,
  onClickMoveDown,
  onClickDelete,
  updateProblemData,
}) => {
  const { listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: problem.uuid,
      animateLayoutChanges: (args) => !args.wasDragging,
    });
  const dragBarStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 154 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };
  function syncAdvancedFields(problem: ImmerContent["problems"][number]) {
    if (problem.advancedEditing) return;
    problem.dir = problem.exec = problem.name;
    problem.input = problem.name + ".in";
    problem.output = problem.name + ".out";
  }
  return (
    <Card
      title={
        <div className="contest-editor-config-problem-card-title">
          <div>第 {index + 1} 题</div>
          <div>
            <Switch
              checked={problem.advancedEditing ?? false}
              onChange={(x) =>
                updateProblemData((v) => {
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
          key="drag-handle"
          type="text"
          shape="circle"
          icon={<FontAwesomeIcon icon={faBars} />}
          {...listeners}
          aria-label="Drag handle"
          title="拖动排序题目"
          tabIndex={-1}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        />,
        <Button
          key="move-up"
          type="text"
          shape="circle"
          disabled={index === 0}
          icon={<FontAwesomeIcon icon={faChevronUp} />}
          onClick={() => onClickMoveUp()}
          title="向前移动题目"
        />,
        <Button
          key="move-down"
          type="text"
          shape="circle"
          disabled={index === problemCount - 1}
          icon={<FontAwesomeIcon icon={faChevronDown} />}
          onClick={() => onClickMoveDown()}
          title="向后移动题目"
        />,
        <Button
          key="delete"
          type="text"
          shape="circle"
          icon={<FontAwesomeIcon icon={faXmark} />}
          onClick={() => onClickDelete()}
          title="删除题目"
        />,
      ]}
      className={"contest-editor-config-problem"}
      ref={setNodeRef}
      style={dragBarStyle}
    >
      <div>
        <label>
          <div>题目英文名称</div>
          <Input
            name={`problem ${index} name`}
            value={problem.name}
            onChange={(e) =>
              updateProblemData((x) => {
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
              updateProblemData((x) => (x.title = e.target.value))
            }
          />
        </label>
        <label>
          <div>题目类型</div>
          <Input
            name={`problem ${index} type`}
            value={problem.type}
            onChange={(e) =>
              updateProblemData((x) => (x.type = e.target.value))
            }
          />
        </label>
      </div>
      {problem.advancedEditing && noiStyle && (
        <div>
          <label>
            <div>目录</div>
            <Input
              name={`problem ${index} directory`}
              value={problem.dir}
              onChange={(e) =>
                updateProblemData((x) => (x.dir = e.target.value))
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
                updateProblemData((x) => (x.exec = e.target.value))
              }
              className="contest-editor-config-monoinput"
            />
          </label>
        </div>
      )}
      {problem.advancedEditing && fileIO && (
        <div>
          <label>
            <div>输入文件名</div>
            <Input
              name={`problem ${index} input file`}
              value={problem.input}
              onChange={(e) =>
                updateProblemData((x) => (x.input = e.target.value))
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
                updateProblemData((x) => (x.output = e.target.value))
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
              updateProblemData((x) => (x.time_limit = e.target.value))
            }
          />
        </label>
        <label>
          <div>空间限制</div>
          <Input
            name={`problem ${index} memory limit`}
            value={problem.memory_limit}
            onChange={(e) =>
              updateProblemData((x) => (x.memory_limit = e.target.value))
            }
          />
        </label>
      </div>
      <div>
        <label>
          <div>{noiStyle ? "测试点" : "子任务"}数目</div>
          <Input
            name={`problem ${index} test case count`}
            value={problem.testcase}
            onChange={(e) =>
              updateProblemData((x) => (x.testcase = e.target.value))
            }
          />
        </label>
        {noiStyle && (
          <label>
            <div>测试点是否等分</div>
            <Input
              name={`problem ${index} testcase point equally`}
              value={problem.point_equal}
              onChange={(e) =>
                updateProblemData((x) => (x.point_equal = e.target.value))
              }
            />
          </label>
        )}
        {usePretest && (
          <label>
            <div>预测试点数目</div>
            <Input
              name={`problem ${index} pre-testcase count`}
              value={problem.pretestcase}
              onChange={(e) =>
                updateProblemData((x) => (x.pretestcase = e.target.value))
              }
            />
          </label>
        )}
      </div>
      <div className="contest-editor-config-problem-languages">
        {problem.submit_filename.map((filename, findex) => (
          <label key={supportLanguages[findex].uuid}>
            <div>{supportLanguages[findex].name} 提交文件名</div>
            <Input
              name={`problem ${index} language ${findex} file name`}
              value={filename}
              onChange={(e) =>
                updateProblemData(
                  (x) => (x.submit_filename[findex] = e.target.value),
                )
              }
              className="contest-editor-config-monoinput"
            />
          </label>
        ))}
      </div>
    </Card>
  );
};

// https://github.com/clauderic/dnd-kit/discussions/1157#discussioncomment-6230665
const Remeasure: FC<{ items: unknown[] }> = ({ items }) => {
  const context = useDndContext();
  const contextRef = useRef(context);
  useEffect(() => {
    contextRef.current = context;
  }, [context]);
  useDeepCompareEffect(() => {
    contextRef.current.measureDroppableContainers([
      ...contextRef.current.droppableContainers.keys(),
    ]);
  }, [items]);
  return null;
};

const ProblemList: FC<{
  content: ImmerContent;
  updateContent: Updater<ImmerContent>;
  setPanel: Dispatch<SetStateAction<string>>;
}> = ({ content, updateContent, setPanel }) => {
  const { modal } = App.useApp();
  function updateProblemData(
    index: number,
    cb: (x: ImmerContent["problems"][number]) => void,
  ) {
    updateContent((x) => {
      cb(x.problems[index]);
    });
  }
  const problemKeyList = content.problems.map((x) => x.uuid);
  const removeProblem = removeProblemCallback<Content>(
    modal,
    setPanel,
    updateContent,
  );
  return (
    <div className="contest-editor-config-label contest-editor-config-problem">
      <div>题目信息</div>
      <div>
        <DndContext
          onDragEnd={(e) => {
            const { active, over } = e;
            if (!over) return;
            if (active.id !== over.id) {
              const oldIndex = content.problems.findIndex(
                  (x) => x.uuid === active.id,
                ),
                newIndex = content.problems.findIndex(
                  (x) => x.uuid === over.id,
                );
              updateContent((x) => {
                x.problems = arrayMove(x.problems, oldIndex, newIndex);
              });
            }
          }}
          modifiers={[restrictToVerticalAxis]}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        >
          <Remeasure items={problemKeyList} />
          <SortableContext
            items={problemKeyList}
            strategy={verticalListSortingStrategy}
          >
            {content.problems.map((problem, index) => (
              <ProblemItem
                key={problem.uuid}
                problemData={problem}
                index={index}
                problemCount={content.problems.length}
                noiStyle={content.noi_style}
                fileIO={content.file_io}
                usePretest={content.use_pretest}
                supportLanguages={content.support_languages}
                onClickMoveUp={() =>
                  updateContent((x) => {
                    x.problems = arraySwap(x.problems, index, index - 1);
                  })
                }
                onClickMoveDown={() =>
                  updateContent((x) => {
                    x.problems = arraySwap(x.problems, index, index + 1);
                  })
                }
                onClickDelete={() => removeProblem(problem.uuid)}
                updateProblemData={(cb) => updateProblemData(index, cb)}
              />
            ))}
          </SortableContext>
        </DndContext>
        <Button
          type="dashed"
          icon={<FontAwesomeIcon icon={faPlus} />}
          onClick={() =>
            updateContent((x) => {
              x.problems.push(createNewProblem(x));
            })
          }
        >
          添加题目
        </Button>
      </div>
    </div>
  );
};

export default ProblemList;
