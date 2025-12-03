import { set, get, del } from "idb-keyval"
import { createLogger } from "./logger"

const log = createLogger('idb')

export async function storeBlob(data: any): Promise<string> {
  const key = `gog-data-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  try {
    await set(key, data)
    return key
  } catch (e) {
    log.error('STORE-BLOB-FAILED', e)
    throw e
  }
}

export async function getBlob(key: string): Promise<any | null> {
  try {
    return await get(key)
  } catch (e) {
    log.error('GET-BLOB-FAILED', e)
    return null
  }
}

export async function deleteBlob(key: string): Promise<void> {
  try {
    await del(key)
  } catch (e) {
    log.error('DELETE-BLOB-FAILED', e)
  }
}
