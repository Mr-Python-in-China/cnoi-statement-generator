import type { Updater } from "use-immer";
import type { ImmerContestData } from "@/types/contestData";
import { saveImageToDB, deleteImageFromDB } from "./indexedDBUtils";

/**
 * Add image to both IndexedDB and state
 */
export async function addImage(params: {
  file: File;
  updateContestData: Updater<ImmerContestData>;
}): Promise<{ uuid: string; blobUrl: string }> {
  const { file, updateContestData } = params;

  // Generate UUID for the image
  const uuid = crypto.randomUUID();

  // Create blob URL for display
  const blobUrl = URL.createObjectURL(file);

  // Save to IndexedDB
  await saveImageToDB(uuid, file);

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
  updateContestData: Updater<ImmerContestData>;
}): Promise<void> {
  const { uuid, updateContestData } = params;

  // Delete from IndexedDB
  await deleteImageFromDB(uuid);

  // Remove from contest data and revoke blob URL
  updateContestData((x) => {
    const index = x.images.findIndex((img) => img.uuid === uuid);
    if (index !== -1) {
      // Revoke blob URL
      URL.revokeObjectURL(x.images[index].url);
      // Remove from array
      x.images.splice(index, 1);
    }
  });
}
