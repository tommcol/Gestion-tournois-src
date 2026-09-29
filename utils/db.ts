
import { openDB, IDBPDatabase } from 'idb';
import { TournamentState } from '../types';

const DB_NAME = 'tournament_db';
const STORE_NAME = 'tournament_state';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
};

export const saveTournamentState = async (state: TournamentState) => {
  const db = await getDB();
  await db.put(STORE_NAME, state, 'current');
};

export const loadTournamentState = async (): Promise<TournamentState | null> => {
  const db = await getDB();
  return await db.get(STORE_NAME, 'current');
};

export const clearTournamentState = async () => {
  const db = await getDB();
  await db.delete(STORE_NAME, 'current');
};
