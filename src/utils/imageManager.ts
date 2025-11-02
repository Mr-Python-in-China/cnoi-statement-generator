import type { Dispatch, SetStateAction } from "react";
import type { Updater } from "use-immer";
import type { ImmerContestData } from "@/types/contestData";
import { saveImageToDB, deleteImageFromDB } from "./indexedDBUtils";

/**
 * Add image to both IndexedDB and state
 */
export async function addImage(params: {
  file: File;
  setImageMapping: Dispatch<SetStateAction<Map<string, string>>>;
  updateContestData: Updater<ImmerContestData>;
}): Promise<{ uuid: string; blobUrl: string }> {
  const { file, setImageMapping, updateContestData } = params;

  // Generate UUID for the image
  const uuid = crypto.randomUUID();

  // Create blob URL for display
  const blobUrl = URL.createObjectURL(file);

  // Save to IndexedDB
  await saveImageToDB(uuid, file);

  // Update mappings
  setImageMapping((prev) => new Map(prev).set(uuid, blobUrl));

  // Update contest data
  updateContestData((x) => {
    x.images.push({
      uuid,
      name: file.name,
      url: blobUrl,
    });
  });

  return { uuid, blobUrl };
}

/**
 * Delete image from both IndexedDB and state
 */
export async function deleteImage(params: {
  uuid: string;
  setImageMapping: Dispatch<SetStateAction<Map<string, string>>>;
  updateContestData: Updater<ImmerContestData>;
}): Promise<void> {
  const {
    uuid,
    setImageMapping,
    updateContestData,
  } = params;

  // Delete from IndexedDB
  await deleteImageFromDB(uuid);

  // Remove from mapping
  setImageMapping((prev) => {
    const blobUrl = prev.get(uuid);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }

    const newMap = new Map(prev);
    newMap.delete(uuid);
    return newMap;
  });

  // Remove from contest data
  updateContestData((x) => {
    const index = x.images.findIndex((img) => img.uuid === uuid);
    if (index !== -1) {
      x.images.splice(index, 1);
    }
  });
}
