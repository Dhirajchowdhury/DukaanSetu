import { openDB } from 'idb';

const DB_NAME = 'DukaanSetuOffline';
const DB_VERSION = 1;

let dbPromise;

async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('orders')) {
          db.createObjectStore('orders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pending_actions')) {
          db.createObjectStore('pending_actions', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

// ── Generic CRUD ──
export async function cacheAll(store, items) {
  const db = await getDB();
  const tx = db.transaction(store, 'readwrite');
  await Promise.all(items.map(item => tx.store.put(item)));
  await tx.done;
}

export async function getCached(store, id) {
  const db = await getDB();
  return db.get(store, id);
}

export async function getAllCached(store) {
  const db = await getDB();
  return db.getAll(store);
}

export async function clearStore(store) {
  const db = await getDB();
  return db.clear(store);
}

// ── Pending actions (queue) ──
export async function queueAction(action) {
  const db = await getDB();
  return db.add('pending_actions', {
    ...action,
    createdAt: Date.now(),
    synced: false,
  });
}

export async function getPendingActions() {
  const db = await getDB();
  return db.getAll('pending_actions');
}

export async function removePendingAction(id) {
  const db = await getDB();
  return db.delete('pending_actions', id);
}

export async function clearSyncedActions() {
  const db = await getDB();
  const all = await db.getAll('pending_actions');
  const tx = db.transaction('pending_actions', 'readwrite');
  await Promise.all(
    all.filter(a => a.synced).map(a => tx.store.delete(a.id))
  );
  await tx.done;
}

// ── Sync pending actions to server ──
export async function syncPending() {
  const pending = await getPendingActions();
  for (const action of pending) {
    try {
      const res = await fetch(action.url, {
        method: action.method,
        headers: { 'Content-Type': 'application/json', ...action.headers },
        body: action.body ? JSON.stringify(action.body) : undefined,
      });
      if (res.ok) {
        await removePendingAction(action.id);
      }
    } catch (err) {
      console.warn('Sync failed for action:', action.id, err.message);
    }
  }
}
