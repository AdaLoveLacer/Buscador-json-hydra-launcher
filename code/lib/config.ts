/**
 * Configuration file for API and environment settings
 * Centralizes all configuration constants used across the application
 */

/**
 * API Base URL - can be overridden via environment variables
 * - NEXT_PUBLIC_API_BASE for frontend (exposed to browser)
 * - Defaults to http://localhost:4000 for local development
 * - In production, set NEXT_PUBLIC_API_BASE=https://api.yourdomain.com
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

/**
 * Log level - controls verbosity of debug output
 * - 'debug': Show all debug logs (development)
 * - 'info': Show info and above (production)
 * - 'error': Show only errors
 */
export const LOG_LEVEL = (process.env.NEXT_PUBLIC_LOG_LEVEL || 'info') as
  | 'debug'
  | 'info'
  | 'error'

/**
 * Environment - Node environment
 */
export const NODE_ENV = process.env.NODE_ENV || 'development'

/**
 * Is development mode
 */
export const isDevelopment = NODE_ENV === 'development'

/**
 * Is production mode
 */
export const isProduction = NODE_ENV === 'production'

/**
 * API Timeouts (in milliseconds)
 */
export const API_TIMEOUTS = {
  fetch: 10000,      // 10 seconds for fetch operations
  upload: 30000,     // 30 seconds for file uploads
  download: 60000,   // 60 seconds for downloads
} as const

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  maxPersistentSize: 5000,     // LRU cache max size
  persistentCacheTTL: 3600000, // 1 hour in ms
  weakCacheGC: true,           // Allow garbage collection for WeakMap
} as const

/**
 * Upload configuration
 */
export const UPLOAD_CONFIG = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: ['application/json'],
} as const

/**
 * Pagination configuration
 */
export const PAGINATION_CONFIG = {
  defaultPageSize: 50,
  maxPageSize: 100,
} as const

/**
 * Feature flags
 */
export const FEATURES = {
  enableDebugLogs: isDevelopment,
  enableAsyncProcessing: true,
  enableWebWorkers: true,
  enableSynonymExpansion: true,
} as const

export default {
  API_BASE,
  LOG_LEVEL,
  NODE_ENV,
  isDevelopment,
  isProduction,
  API_TIMEOUTS,
  CACHE_CONFIG,
  UPLOAD_CONFIG,
  PAGINATION_CONFIG,
  FEATURES,
}
