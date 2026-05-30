import db from "./db";

export type RecentlyOpenedEntry = {
  path: string[];
  name: string;
  openedAt: Date;
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
  return rows.map((r) => ({
    path: r.pathKey.split("/").map((s: string) => decodeURIComponent(s)),
    name: r.name,
    openedAt: r.openedAt,
  }));
}

export async function deleteRecentlyOpened(path: string[]) {
  const pathKey = path.map(encodeURIComponent).join("/");
  try {
    await db.recently_opened.delete(pathKey);
  } catch (err) {
    // best-effort
    console.error("Failed to delete recently opened entry:", err);
  }
}
