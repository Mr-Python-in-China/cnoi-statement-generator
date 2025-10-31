import type { ImmerContestData } from "@/types/contestData";

const STORAGE_KEY_PREFIX = "cnoi_history_";
const HISTORY_LIST_KEY = "cnoi_history_list";
const CURRENT_HISTORY_KEY = "cnoi_current_history";

export interface HistoryMetadata {
  id: string;
  timestamp: number;
  title: string;
}

/**
 * Get list of all saved histories
 */
export function getHistoryList(): HistoryMetadata[] {
  try {
    const list = localStorage.getItem(HISTORY_LIST_KEY);
    if (!list) return [];
    return JSON.parse(list) as HistoryMetadata[];
  } catch (error) {
    console.error("Error reading history list:", error);
    return [];
  }
}

/**
 * Save contest data to history
 */
export function saveHistory(
  data: ImmerContestData,
  id?: string
): HistoryMetadata {
  const historyId = id || crypto.randomUUID();
  const metadata: HistoryMetadata = {
    id: historyId,
    timestamp: Date.now(),
    title: data.title || "未命名比赛",
  };

  try {
    // Save the contest data
    const dataToSave = {
      ...data,
      // Don't save image URLs as they're blob URLs and won't persist
      images: data.images.map((img) => ({
        name: img.name,
        url: "", // Clear blob URLs
      })),
    };
    localStorage.setItem(
      STORAGE_KEY_PREFIX + historyId,
      JSON.stringify(dataToSave)
    );

    // Update history list
    let historyList = getHistoryList();
    const existingIndex = historyList.findIndex((h) => h.id === historyId);
    if (existingIndex >= 0) {
      historyList[existingIndex] = metadata;
    } else {
      historyList.push(metadata);
    }
    // Keep only the last 20 histories
    if (historyList.length > 20) {
      const removed = historyList.slice(0, historyList.length - 20);
      removed.forEach((h) => {
        localStorage.removeItem(STORAGE_KEY_PREFIX + h.id);
      });
      historyList = historyList.slice(-20);
    }
    localStorage.setItem(HISTORY_LIST_KEY, JSON.stringify(historyList));

    // Mark as current history
    localStorage.setItem(CURRENT_HISTORY_KEY, historyId);

    return metadata;
  } catch (error) {
    console.error("Error saving history:", error);
    throw error;
  }
}

/**
 * Load contest data from history
 */
export function loadHistory(id: string): ImmerContestData | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PREFIX + id);
    if (!data) return null;
    return JSON.parse(data) as ImmerContestData;
  } catch (error) {
    console.error("Error loading history:", error);
    return null;
  }
}

/**
 * Delete a history entry
 */
export function deleteHistory(id: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + id);
    const historyList = getHistoryList();
    const filtered = historyList.filter((h) => h.id !== id);
    localStorage.setItem(HISTORY_LIST_KEY, JSON.stringify(filtered));

    // Clear current history if it was deleted
    if (localStorage.getItem(CURRENT_HISTORY_KEY) === id) {
      localStorage.removeItem(CURRENT_HISTORY_KEY);
    }
  } catch (error) {
    console.error("Error deleting history:", error);
  }
}

/**
 * Get the current history ID
 */
export function getCurrentHistoryId(): string | null {
  return localStorage.getItem(CURRENT_HISTORY_KEY);
}

/**
 * Auto-save the current contest data
 */
export function autoSave(data: ImmerContestData): void {
  const currentId = getCurrentHistoryId();
  saveHistory(data, currentId || undefined);
}
