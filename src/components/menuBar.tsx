import { type FC, type ReactNode, useEffect, useRef, useState } from "react";

import "./menuBar.css";

export type MenuItem = {
  key: string;
  label: ReactNode;
  onSelect?: () => void;
  children?: MenuItem[];
  disabled?: boolean;
  shortcut?: string;
};

export type MenuGroup = {
  key: string;
  label: ReactNode;
  items?: MenuItem[];
  onSelect?: () => void;
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

const normalizeShortcutKey = (key: string) => {
  const value = key.trim().toLowerCase();
  if (value === "esc") return "escape";
  if (value === "del") return "delete";
  if (value === "space") return " ";
  return value;
};

const parseShortcut = (shortcut: string) => {
  const parts = shortcut
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  const parsed = {
    key: "",
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
  };

  for (const part of parts) {
    const token = part.toLowerCase();
    if (token === "ctrl" || token === "control") {
      parsed.ctrl = true;
      continue;
    }
    if (token === "alt" || token === "option") {
      parsed.alt = true;
      continue;
    }
    if (token === "shift") {
      parsed.shift = true;
      continue;
    }
    if (token === "cmd" || token === "command" || token === "meta") {
      parsed.meta = true;
      continue;
    }
    parsed.key = normalizeShortcutKey(token);
  }

  if (!parsed.key) return null;
  return parsed;
};

const isShortcutMatch = (event: KeyboardEvent, shortcut: string) => {
  const parsed = parseShortcut(shortcut);
  if (!parsed) return false;
  const key = normalizeShortcutKey(event.key);
  if (key !== parsed.key) return false;
  return (
    event.ctrlKey === parsed.ctrl &&
    event.altKey === parsed.alt &&
    event.shiftKey === parsed.shift &&
    event.metaKey === parsed.meta
  );
};

const collectMenuItems = (groups: MenuGroup[]) => {
  const items: MenuItem[] = [];
  const walk = (list?: MenuItem[]) => {
    if (!list?.length) return;
    for (const item of list) {
      items.push(item);
      if (item.children?.length) walk(item.children);
    }
  };

  for (const group of groups) {
    walk(group.items);
  }
  return items;
};

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
              {item.shortcut ? (
                <span className="menu-item-shortcut">{item.shortcut}</span>
              ) : null}
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

  useEffect(() => {
    const items = collectMenuItems(menuGroup).filter(
      (item) => item.shortcut && item.onSelect && !item.children?.length,
    );
    if (!items.length) return;

    const handleKeydown = (event: KeyboardEvent) => {
      const match = items.find(
        (item) => item.shortcut && isShortcutMatch(event, item.shortcut),
      );
      if (!match || match.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      match.onSelect?.();
      setOpenRoot(null);
      setOpenPath([]);
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [menuGroup]);

  const handleRootClick = (group: MenuGroup) => {
    // If the root has no submenu, trigger its action directly.
    if (!group.items?.length) {
      group.onSelect?.();
      setOpenRoot(null);
      setOpenPath([]);
      return;
    }

    setOpenRoot((current) => {
      if (current === group.key) {
        setOpenPath([]);
        return null;
      }
      setOpenPath([group.key]);
      return group.key;
    });
  };

  const handleRootEnter = (group: MenuGroup) => {
    if (!openRoot || !group.items?.length) return;
    setOpenRoot(group.key);
    setOpenPath([group.key]);
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
          onMouseEnter={() => handleRootEnter(group)}
        >
          <button
            type="button"
            className="menu-trigger"
            onClick={() => handleRootClick(group)}
            aria-haspopup
            aria-expanded={openRoot === group.key}
          >
            <span>{group.label}</span>
          </button>
          {openRoot === group.key && group.items ? (
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
