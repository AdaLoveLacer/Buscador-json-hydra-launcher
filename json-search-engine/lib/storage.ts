// IndexedDB storage para arquivos JSON grandes

const DB_NAME = "JsonSearchDB"
const STORE_NAME = "files"
const DB_VERSION = 1

let db: IDBDatabase | null = null

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }
  })
}

export async function saveFiles(files: any[]): Promise<void> {
  const database = await initDB()
  const transaction = database.transaction(STORE_NAME, "readwrite")
  const store = transaction.objectStore(STORE_NAME)

  // Limpar dados antigos
  await new Promise((resolve, reject) => {
    const clearRequest = store.clear()
    clearRequest.onsuccess = () => resolve(null)
    clearRequest.onerror = () => reject(clearRequest.error)
  })

  // Salvar novos dados
  for (const file of files) {
    await new Promise((resolve, reject) => {
      const request = store.add(file)
      request.onsuccess = () => resolve(null)
      request.onerror = () => reject(request.error)
    })
  }
}

export async function loadFiles(): Promise<any[]> {
  const database = await initDB()
  const transaction = database.transaction(STORE_NAME, "readonly")
  const store = transaction.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteFile(id: string): Promise<void> {
  const database = await initDB()
  const transaction = database.transaction(STORE_NAME, "readwrite")
  const store = transaction.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getStorageInfo(): Promise<{ used: number; quota: number }> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return { used: 0, quota: 0 }
  }

  try {
    const estimate = await navigator.storage.estimate()
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
    }
  } catch {
    return { used: 0, quota: 0 }
  }
}
