import db from "./db";

export type RecentlyOpenedEntry = {
  path: string[];
  name: string;
  openedAt: Date;
  previewImage?: Blob;
};

// Record that a document at `path` with `name` was opened at now.
export async function recordRecentlyOpened(path: string[], name: string) {
  const pathKey = path.map(encodeURIComponent).join("/");
  await db.recently_opened.put({
    pathKey,
    name,
    openedAt: new Date(),
  });
}

// Fetch all recently opened entries (unsorted)
export async function getRecentlyOpened(): Promise<RecentlyOpenedEntry[]> {
  const rows = await db.recently_opened.toArray();
  return rows
    .map((r) => ({
      path: r.pathKey.split("/").map((s: string) => decodeURIComponent(s)),
      name: r.name,
      openedAt: r.openedAt,
      previewImage: r.previewImage,
    }))
    .sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime());
}

export async function deleteRecentlyOpened(path: string[]) {
  const pathKey = path.map(encodeURIComponent).join("/");
  await db.recently_opened.delete(pathKey);
}

export async function setRecentlyOpenedPreviewImage(
  path: string[],
  imageBlob: Blob,
) {
  const pathKey = path.map(encodeURIComponent).join("/");
  await db.recently_opened.update(pathKey, { previewImage: imageBlob });
}
