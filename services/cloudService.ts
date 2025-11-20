
import { FeedPost } from '../types';

const DB_NAME = 'RaiWaveAudioDB';
const STORE_NAME = 'tracks';
const DB_VERSION = 1;

// In-memory fallback for restricted environments
let memoryStore: FeedPost[] = [];

const isIndexedDBAvailable = () => {
    try {
        return 'indexedDB' in window && window.indexedDB !== null;
    } catch (e) {
        return false;
    }
};

// Initialize DB
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        try {
            if (!isIndexedDBAvailable()) {
                reject(new Error("IndexedDB access restricted"));
                return;
            }
            
            const request = window.indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                resolve((event.target as IDBOpenDBRequest).result);
            };

            request.onerror = (event) => {
                reject((event.target as IDBOpenDBRequest).error);
            };
        } catch (e) {
            reject(e);
        }
    });
};

export const saveTrackToCloud = async (track: FeedPost): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(track);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (e) {
                reject(e);
            }
        });
    } catch (e) {
        console.warn("IndexedDB unavailable, falling back to memory:", e);
        const idx = memoryStore.findIndex(t => t.id === track.id);
        if (idx >= 0) {
            memoryStore[idx] = track;
        } else {
            memoryStore.push(track);
        }
    }
};

export const getCloudTracks = async (): Promise<FeedPost[]> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();

                request.onsuccess = () => {
                    const res = (request.result as FeedPost[]).sort((a, b) => 
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    );
                    resolve(res);
                };
                request.onerror = () => reject(request.error);
            } catch (e) {
                reject(e);
            }
        });
    } catch (e) {
        console.warn("IndexedDB unavailable, using memory store:", e);
        return [...memoryStore].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }
};
