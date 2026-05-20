import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { Table, type TableColumnsType } from "antd";
import type { TableRef } from "antd/es/table";

import "./ExplorerPage.css";

export type ExplorerItem = {
  key: string;
  name?: string;
  icon?: ReactNode;
  createdAt?: Date;
  modifiedAt?: Date;
  type: "file" | "folder";
};

export type ExplorerPageProps = {
  items: ExplorerItem[];
  onSelect: (key: string) => void;
  onOpenFolder: (key: string) => void;
  emptyText?: ReactNode;
  setFileItems: (items: ExplorerItem[]) => void;
  onConfirm: (key: string) => void;
};

const formatDate = (value?: Date) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
};

const ExplorerPage: FC<ExplorerPageProps> = ({
  items,
  onSelect,
  onOpenFolder,
  emptyText = "暂无文件资源",
  setFileItems,
  onConfirm,
}) => {
  const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined);
  const tableRef = useRef<TableRef>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const itemKeys = useMemo(() => items.map((item) => item.key), [items]);
  const selectedIndex = useMemo(
    () => (selectedKey ? itemKeys.indexOf(selectedKey) : -1),
    [itemKeys, selectedKey],
  );

  const columns = useMemo<TableColumnsType<ExplorerItem>>(
    () => [
      {
        key: "icon",
        width: 32,
        render: (_value, item) => item.icon,
      },
      {
        title: "名称",
        dataIndex: "name",
        key: "name",
        ellipsis: true,
        render: (_value, item) => item.name ?? item.key,
      },
      {
        title: "类型",
        dataIndex: "type",
        key: "type",
        width: 120,
        render: (value: ExplorerItem["type"]) =>
          value === "folder" ? "文件夹" : "文件",
      },
      {
        title: "修改时间",
        dataIndex: "modifiedAt",
        key: "modifiedAt",
        width: 180,
        render: (value?: Date) => formatDate(value),
      },
      {
        title: "创建时间",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 180,
        render: (value?: Date) => formatDate(value),
      },
    ],
    [],
  );

  useLayoutEffect(() => setFileItems(items), [items, setFileItems]);

  const handleRowActivate = (item: ExplorerItem) => {
    if (item.type === "folder") {
      onOpenFolder(item.key);
      return;
    }
    setSelectedKey(item.key);
    onSelect(item.key);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (items.length === 0) return;
    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "Home" ||
      event.key === "End" ||
      event.key === "Enter"
    ) {
      event.preventDefault();
    }

    if (event.key === "ArrowDown") {
      const nextIndex = Math.min(items.length - 1, selectedIndex + 1);
      setSelectedKey(items[nextIndex]?.key);
      return;
    }
    if (event.key === "ArrowUp") {
      const nextIndex = Math.max(0, selectedIndex - 1);
      setSelectedKey(items[nextIndex]?.key);
      return;
    }
    if (event.key === "Home") {
      setSelectedKey(items[0]?.key);
      return;
    }
    if (event.key === "End") {
      setSelectedKey(items[items.length - 1]?.key);
      return;
    }
    if (event.key === "Enter") {
      if (selectedKey) onConfirm(selectedKey);
    }
  };

  useEffect(
    () => {
      sectionRef.current?.focus();
      setSelectedKey(itemKeys[0]);
    },
    // oxlint-disable-next-line eslint-plugin-react-hooks/exhaustive-deps
    [itemKeys.map(encodeURIComponent).join(",")],
  );

  return (
    <section
      className="explorer-page"
      aria-label="文件资源管理器"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      ref={sectionRef}
    >
      <Table
        ref={tableRef}
        className="explorer-table"
        size="small"
        rowKey="key"
        columns={columns}
        dataSource={items}
        pagination={false}
        rowClassName={(item) =>
          item.key === selectedKey ? "explorer-table-row-selected" : ""
        }
        rowHoverable={false}
        locale={{ emptyText }}
        onRow={(item) => ({
          onClick: () => handleRowActivate(item),
        })}
      />
    </section>
  );
};

export default ExplorerPage;
