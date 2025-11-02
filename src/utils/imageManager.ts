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

  // Convert File to Blob
  const blob = new Blob([file], { type: file.type });

  // Create blob URL for display
  const blobUrl = URL.createObjectURL(blob);

  // Save to IndexedDB
  await saveImageToDB(uuid, file.name, blob);

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
  imageMapping: Map<string, string>;
  setImageMapping: Dispatch<SetStateAction<Map<string, string>>>;
  updateContestData: Updater<ImmerContestData>;
  contestData: ImmerContestData;
}): Promise<void> {
  const {
    uuid,
    imageMapping,
    setImageMapping,
    updateContestData,
    contestData,
  } = params;

  // Delete from IndexedDB
  await deleteImageFromDB(uuid);

  // Revoke blob URL
  const blobUrl = imageMapping.get(uuid);
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
  }

  // Remove from mapping
  setImageMapping((prev) => {
    const newMap = new Map(prev);
    newMap.delete(uuid);
    return newMap;
  });

  // Remove from contest data
  const index = contestData.images.findIndex((img) => img.uuid === uuid);
  if (index !== -1) {
    updateContestData((x) => {
      x.images.splice(index, 1);
    });
  }
}
