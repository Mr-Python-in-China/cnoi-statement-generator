import type {
  ContestDataWithImages,
  StoredContestData,
  EditorImageData,
} from "@/types/contestData";
import configSchema from "../../typst-template/config-schema.json";
import Ajv from "ajv";

const DB_NAME = "cnoi-statement-generator";
const DB_VERSION = 1;
const CONFIG_STORE = "config";
const IMAGE_STORE = "images";

const ajv = new Ajv({ allErrors: true });
const validateSchema = ajv.compile(configSchema);

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create config store
      if (!db.objectStoreNames.contains(CONFIG_STORE)) {
        db.createObjectStore(CONFIG_STORE);
      }

      // Create image store with uuid as key
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE, { keyPath: "uuid" });
      }
    };
  });
}

/**
 * Save config to IndexedDB
 */
export async function saveConfigToDB(
  data: ContestDataWithImages
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(CONFIG_STORE, "readwrite");
  const store = transaction.objectStore(CONFIG_STORE);

  // Remove url field from images for storage
  const storedData: StoredContestData = {
    ...data,
    images: data.images.map(({ uuid, name }) => ({
      uuid,
      name,
    })),
  };

  store.put(storedData, "current");

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Load config from IndexedDB
 */
export async function loadConfigFromDB(): Promise<{
  data: StoredContestData;
  images: Map<string, Blob>; // uuid -> Blob
} | null> {
  const db = await openDB();
  const transaction = db.transaction([CONFIG_STORE, IMAGE_STORE], "readonly");
  const configStore = transaction.objectStore(CONFIG_STORE);
  const imageStore = transaction.objectStore(IMAGE_STORE);

  return new Promise((resolve, reject) => {
    const configRequest = configStore.get("current");

    configRequest.onsuccess = async () => {
      const storedData = configRequest.result as StoredContestData | undefined;

      if (!storedData) {
        db.close();
        resolve(null);
        return;
      }

      // Load all images
      const imageMap = new Map<string, Blob>();
      const imagePromises = (storedData.images || []).map(
        (img) =>
          new Promise<void>((resolveImg, rejectImg) => {
            const imgRequest = imageStore.get(img.uuid);
            imgRequest.onsuccess = () => {
              const imageData = imgRequest.result as EditorImageData | undefined;
              if (imageData) {
                imageMap.set(imageData.uuid, imageData.blob);
              }
              resolveImg();
            };
            imgRequest.onerror = () => rejectImg(imgRequest.error);
          })
      );

      try {
        await Promise.all(imagePromises);
        db.close();

        resolve({ data: storedData, images: imageMap });
      } catch (error) {
        db.close();
        reject(error);
      }
    };

    configRequest.onerror = () => {
      db.close();
      reject(configRequest.error);
    };
  });
}

/**
 * Save image to IndexedDB
 */
export async function saveImageToDB(uuid: string, blob: Blob): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(IMAGE_STORE, "readwrite");
  const store = transaction.objectStore(IMAGE_STORE);

  const imageData: EditorImageData = { uuid, blob };
  store.put(imageData);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Delete image from IndexedDB
 */
export async function deleteImageFromDB(uuid: string): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(IMAGE_STORE, "readwrite");
  const store = transaction.objectStore(IMAGE_STORE);

  store.delete(uuid);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Clear all data from IndexedDB
 */
export async function clearDB(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction([CONFIG_STORE, IMAGE_STORE], "readwrite");

  transaction.objectStore(CONFIG_STORE).clear();
  transaction.objectStore(IMAGE_STORE).clear();

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
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
      (err) => `${err.instancePath} ${err.message}`
    );
    return { valid: false, errors };
  }
  return { valid: true };
}

/**
 * Export configuration with images as base64
 */
export async function exportConfig(
  data: ContestDataWithImages
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
      "配置文件验证失败：" + (validation.errors?.join(", ") || "未知错误")
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
