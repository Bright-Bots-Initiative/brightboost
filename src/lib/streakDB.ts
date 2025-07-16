import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'brightboost';
const STORE_NAME = 'streak';
const QUEUE_KEY = 'pendingEvents';

export interface StreakEvent {
  completedAt: string;  // ISO-8601 timestamp
  moduleId: string;
}

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db: IDBPDatabase) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  },
});

// Cached streak data
export async function getCachedStreak() {
  const db = await dbPromise;
  return db.get(STORE_NAME, 'streak');
}

export async function setCachedStreak(streakData: any) {
  const db = await dbPromise;
  return db.put(STORE_NAME, streakData, 'streak');
}

export async function clearCachedStreak() {
  const db = await dbPromise;
  return db.delete(STORE_NAME, 'streak');
}

// Offline event queue
export async function getPendingEvents(): Promise<StreakEvent[]> {
  const db = await dbPromise;
  return (await db.get(STORE_NAME, QUEUE_KEY)) || [];
}

export async function addPendingEvent(event: StreakEvent) {
  const db = await dbPromise;
  const queue: StreakEvent[] = (await db.get(STORE_NAME, QUEUE_KEY)) || [];
  queue.push(event);
  await db.put(STORE_NAME, queue, QUEUE_KEY);
}

export async function clearPendingEvents() {
  const db = await dbPromise;
  await db.delete(STORE_NAME, QUEUE_KEY);
}
