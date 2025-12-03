import { openDB, type IDBPDatabase } from "idb"
import type { GogData } from "./types"
import { createLogger } from "./logger"

const log = createLogger('url-cache')

const DB_NAME = "url-cache-db"
const STORE_NAME = "url-data"
const DB_VERSION = 1

interface CachedData {
  url: string
  data: GogData
  timestamp: number
}

const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

let dbPromise: Promise<IDBPDatabase> | null = null

export async function initUrlCache() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "url" })
          store.createIndex("timestamp", "timestamp")
        }
      },
    })
  }
  return dbPromise
}

export async function getCachedUrl(url: string): Promise<GogData | null> {
  try {
    const db = await initUrlCache()
    const data = (await db.get(STORE_NAME, url)) as CachedData | undefined

    if (!data) return null

    // Check if cache expired
    if (Date.now() - data.timestamp > CACHE_EXPIRY) {
      await db.delete(STORE_NAME, url)
      return null
    }

    return data.data
  } catch (error) {
    log.warn('ACCESS-FAILED', error)
    return null
  }
}

export async function cacheUrlData(url: string, data: GogData): Promise<void> {
  try {
    const db = await initUrlCache()
    const cacheEntry: CachedData = {
      url,
      data,
      timestamp: Date.now(),
    }
    await db.put(STORE_NAME, cacheEntry)
  } catch (error) {
    log.warn('SAVE-FAILED', error)
  }
}

export async function clearExpiredCache(): Promise<void> {
  try {
    const db = await initUrlCache()
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    const expiryTime = Date.now() - CACHE_EXPIRY

    let cursor = await store.openCursor()
    while (cursor) {
      if (cursor.value.timestamp < expiryTime) {
        await cursor.delete()
      }
      cursor = await cursor.continue()
    }
  } catch (error) {
    log.warn('CLEAR-EXPIRED-FAILED', error)
  }
}
