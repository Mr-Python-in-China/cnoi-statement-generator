import db from "./db";

export async function saveFsHandle(
  handle: FileSystemFileHandle,
): Promise<string[]> {
  const filename = handle.name;
  const handles = (await db.fs_handles.get(filename))?.handles;
  if (!handles) {
    await db.fs_handles.put({ filename, handles: [handle] });
    return ["0", filename];
  }
  const p = (
    await Promise.all(handles.map((h) => h.isSameEntry(handle)))
  ).findIndex((x) => x);
  if (p === -1) {
    await db.fs_handles.put({ filename, handles: [...handles, handle] });
    return [String(handles.length), filename];
  }
  return [String(p), filename];
}

export async function getFsHandle(
  path: string[],
): Promise<FileSystemFileHandle | undefined> {
  if (path.length !== 2) throw new Error("Invalid path");
  const [index, filename] = path;
  if (!/^\d+$/.test(index)) throw new Error("Invalid index");
  const handles = (await db.fs_handles.get(filename))?.handles;
  if (!handles) return undefined;
  const handle = handles[Number(index)];
  if (!handle) return undefined;
  return handle;
}
