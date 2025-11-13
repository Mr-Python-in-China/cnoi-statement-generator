import type {
  ContestDataWithImages,
  StoredContestData,
  EditorImageData,
} from "@/types/contestData";
import configSchema from "../../typst-template/config-schema.json";
import Ajv from "ajv";
import Dexie from "dexie";

const ajv = new Ajv({ allErrors: true });
const validateSchema = ajv.compile(configSchema);

/**
 * Dexie database schema
 */
class CnoiDatabase extends Dexie {
  // Using Table instead of EntityTable to support non-inlined keys
  config!: Dexie.Table<StoredContestData, string>;
  images!: Dexie.Table<EditorImageData, string>;

  constructor() {
    super("cnoi-statement-generator");
    this.version(1).stores({
      config: "", // Empty string means the key is not part of the object (out-of-line key)
      images: "uuid",
    });
  }
}

const db = new CnoiDatabase();

/**
 * Save config to IndexedDB
 */
export async function saveConfigToDB(
  data: ContestDataWithImages,
): Promise<void> {
  // Remove url field from images for storage
  const storedData: StoredContestData = {
    ...data,
    images: data.images.map(({ uuid, name }) => ({
      uuid,
      name,
    })),
  };

  await db.config.put(storedData, "current");
}

/**
 * Load config from IndexedDB
 */
export async function loadConfigFromDB(): Promise<{
  data: StoredContestData;
  images: Map<string, Blob>; // uuid -> Blob
} | null> {
  const storedData = await db.config.get("current");

  if (!storedData) {
    return null;
  }

  // Load all images
  const imageMap = new Map<string, Blob>();
  const imageUuids = (storedData.images || []).map((img) => img.uuid);

  if (imageUuids.length > 0) {
    const images = await db.images.bulkGet(imageUuids);
    images.forEach((imageData) => {
      if (imageData) {
        imageMap.set(imageData.uuid, imageData.blob);
      }
    });
  }

  return { data: storedData, images: imageMap };
}

/**
 * Save image to IndexedDB
 */
export async function saveImageToDB(uuid: string, blob: Blob): Promise<void> {
  await db.images.put({ uuid, blob });
}

/**
 * Delete image from IndexedDB
 */
export async function deleteImageFromDB(uuid: string): Promise<void> {
  await db.images.delete(uuid);
}

/**
 * Clear all data from IndexedDB
 */
export async function clearDB(): Promise<void> {
  await db.transaction("rw", [db.config, db.images], async () => {
    await db.config.clear();
    await db.images.clear();
  });
}

/**
 * Convert Blob to base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 to Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Validate contest data against schema
 */
export function validateContestData(data: unknown): {
  valid: boolean;
  errors?: string[];
} {
  const valid = validateSchema(data);
  if (!valid && validateSchema.errors) {
    const errors = validateSchema.errors.map(
      (err) => `${err.instancePath} ${err.message}`,
    );
    return { valid: false, errors };
  }
  return { valid: true };
}

/**
 * Export configuration with images as base64
 */
export async function exportConfig(
  data: ContestDataWithImages,
): Promise<string> {
  const imageData: {
    uuid: string;
    name: string;
    base64: string;
    mimeType: string;
  }[] = [];

  for (const img of data.images) {
    // Fetch blob from blob URL
    const response = await fetch(img.url);
    const blob = await response.blob();

    const base64 = await blobToBase64(blob);
    imageData.push({
      uuid: img.uuid,
      name: img.name,
      base64,
      mimeType: blob.type,
    });
  }

  const exportData = {
    ...data,
    images: imageData,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import configuration with base64 images
 */
export async function importConfig(json: string): Promise<{
  data: StoredContestData;
  images: Map<string, Blob>; // uuid -> Blob
}> {
  const importData = JSON.parse(json);

  // Validate structure
  const validation = validateContestData(importData);
  if (!validation.valid) {
    throw new Error(
      "配置文件验证失败：" + (validation.errors?.join(", ") || "未知错误"),
    );
  }

  // Extract images
  const images = new Map<string, Blob>();
  const imageData = importData.images || [];

  for (const img of imageData) {
    if (img.base64 && img.mimeType) {
      const blob = base64ToBlob(img.base64, img.mimeType);
      images.set(img.uuid, blob);
    }
  }

  // Return data structure without url field
  const data: StoredContestData = {
    ...importData,
    images: imageData.map((img: { uuid: string; name: string }) => ({
      uuid: img.uuid,
      name: img.name,
    })),
  };

  return { data, images };
}
