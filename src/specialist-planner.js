// Specialist Planner module – provides a safe stub for planAndQueue
// Stores temporary non‑sensitive UI state in IndexedDB as per owner UI decisions.

const DB_NAME = 'specialistPlanner';
const STORE_NAME = 'queue';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Stub implementation of the specialist planner API.
 * In a real system this would call a backend service to generate a plan
 * and then queue it for execution. Here we simply persist the request
 * locally so the UI can show that something was received.
 *
 * @param {Object} request – arbitrary JSON describing the planning request
 * @returns {Promise<Object>} – a placeholder response indicating success
 */
export async function planAndQueue(request) {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add(request);
    await tx.complete;
    return { ok: true, message: 'Request queued locally (stub).' };
  } catch (e) {
    console.error('Specialist planner error:', e);
    return { ok: false, error: e.message };
  }
}
