import { type FC, useEffect, useRef, useState } from "react";

import "./menuBar.css";

export type MenuItem = {
  key: string;
  label: string;
  onSelect?: () => void;
  children?: MenuItem[];
  disabled?: boolean;
};

export type MenuGroup = {
  key: string;
  label: string;
  items: MenuItem[];
};

type MenuListProps = {
  items: MenuItem[];
  path: string[];
  openPath: string[];
  onItemEnter: (path: string[]) => void;
  onItemSelect: (item: MenuItem, path: string[]) => void;
};

const isPathOpen = (candidate: string[], openPath: string[]) =>
  candidate.every((key, idx) => openPath[idx] === key);

const MenuList: FC<MenuListProps> = ({
  items,
  path,
  openPath,
  onItemEnter,
  onItemSelect,
}) => {
  return (
    <ul className="menu-list" data-level={path.length - 1}>
      {items.map((item) => {
        const nextPath = [...path, item.key];
        const submenuOpen =
          item.children?.length && isPathOpen(nextPath, openPath);
        return (
          <li
            key={item.key}
            className={`menu-item${submenuOpen ? " active" : ""}${item.disabled ? " disabled" : ""}`}
            onMouseEnter={() => {
              if (item.disabled) return;
              onItemEnter(nextPath);
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (item.disabled) return;
              onItemSelect(item, nextPath);
            }}
          >
            <div className="menu-item-main">
              <span className="menu-item-label">{item.label}</span>
            </div>
            {item.children?.length ? (
              <span className="menu-item-arrow">&gt;</span>
            ) : null}
            {item.children && submenuOpen ? (
              <MenuList
                items={item.children}
                path={nextPath}
                openPath={openPath}
                onItemEnter={onItemEnter}
                onItemSelect={onItemSelect}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

const MenuBar: FC<{ menuGroup: MenuGroup[] }> = ({ menuGroup }) => {
  const [openRoot, setOpenRoot] = useState<string | null>(null);
  const [openPath, setOpenPath] = useState<string[]>([]);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openRoot) setOpenPath([]);
  }, [openRoot]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!barRef.current) return;
      if (!barRef.current.contains(event.target as Node)) {
        setOpenRoot(null);
        setOpenPath([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRootClick = (key: string) => {
    setOpenRoot((current) => {
      if (current === key) {
        setOpenPath([]);
        return null;
      }
      setOpenPath([key]);
      return key;
    });
  };

  const handleRootEnter = (key: string) => {
    if (!openRoot) return;
    setOpenRoot(key);
    setOpenPath([key]);
  };

  const handleItemEnter = (path: string[]) => {
    if (!openRoot) return;
    setOpenPath(path);
  };

  const handleItemSelect = (item: MenuItem, path: string[]) => {
    if (item.children?.length) {
      setOpenPath(path);
      return;
    }
    item.onSelect?.();
    setOpenRoot(null);
    setOpenPath([]);
  };

  return (
    <div className="menu-bar" ref={barRef} role="menubar">
      {menuGroup.map((group) => (
        <div
          key={group.key}
          className={`menu-root${openRoot === group.key ? " active" : ""}`}
          onMouseEnter={() => handleRootEnter(group.key)}
        >
          <button
            type="button"
            className="menu-trigger"
            onClick={() => handleRootClick(group.key)}
            aria-haspopup
            aria-expanded={openRoot === group.key}
          >
            <span>{group.label}</span>
          </button>
          {openRoot === group.key ? (
            <MenuList
              items={group.items}
              path={[group.key]}
              openPath={openPath}
              onItemEnter={handleItemEnter}
              onItemSelect={handleItemSelect}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default MenuBar;
