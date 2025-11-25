// js/imageStore.js
// Handles large binary assets (Images) using IndexedDB.
// Prevents localStorage quota exceeded errors.

const DB_NAME = "hestia-db";
const STORE_NAME = "images";
const DB_VERSION = 1;

let dbPromise = null;

// Open DB Singleton
function getDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };

        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
    return dbPromise;
}

/**
 * Save a Blob/File to IndexedDB
 * @param {Blob|File} blob
 * @returns {Promise<string>} The unique Image ID (e.g. "img_12345")
 */
export async function saveImage(blob) {
    const db = await getDB();
    const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.add({ id, blob });

        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Retrieve an image Blob URL by ID
 * @param {string} id
 * @returns {Promise<string|null>} ObjectURL (blob:...) or null
 */
export async function getImageUrl(id) {
    if (!id || !id.startsWith("img_")) return null;

    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            const result = request.result;
            if (result && result.blob) {
                // Create a temporary URL for the session
                resolve(URL.createObjectURL(result.blob));
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Delete an image by ID
 * @param {string} id
 */
export async function deleteImage(id) {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
}