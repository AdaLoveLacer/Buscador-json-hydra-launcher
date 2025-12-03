/**
 * Logger module for controlled console output
 * - DEBUG level: Only in development (NODE_ENV = 'development')
 * - WARN level: Only in development (NODE_ENV = 'development')
 * - ERROR level: Always (development and production)
 *
 * Usage:
 * import { logger } from './logger'
 *
 * logger.debug('LABEL', { data: 'value' })  // Only in dev
 * logger.warn('LABEL', { warning: 'message' }) // Only in dev
 * logger.error('LABEL', error) // Always
 */

const DEBUG = typeof window === 'undefined' 
  ? process.env.NODE_ENV === 'development'
  : process.env.NODE_ENV === 'development'

/**
 * Determine if we're in development mode
 */
export function isDevelopment(): boolean {
  return DEBUG
}

/**
 * Determine if we're in production mode
 */
export function isProduction(): boolean {
  return !DEBUG
}

/**
 * Logger object with methods for different log levels
 */
export const logger = {
  /**
   * Debug level - only logged in development
   * @param label - Label for the debug message (e.g., 'SEARCH-FILTER', 'CACHE-HIT')
   * @param data - Data to log (objects, primitives, etc.)
   */
  debug: (label: string, data?: any): void => {
    if (DEBUG) {
      if (data === undefined) {
        console.log(`[${label}]`)
      } else {
        console.log(`[${label}]`, data)
      }
    }
  },

  /**
   * Warning level - only logged in development
   * @param label - Label for the warning message (e.g., 'FETCH-TIMEOUT', 'INVALID-DATA')
   * @param data - Data to log (objects, primitives, etc.)
   */
  warn: (label: string, data?: any): void => {
    if (DEBUG) {
      if (data === undefined) {
        console.warn(`[${label}]`)
      } else {
        console.warn(`[${label}]`, data)
      }
    }
  },

  /**
   * Error level - always logged (both development and production)
   * @param label - Label for the error message (e.g., 'JSON-PARSE-ERROR', 'NETWORK-ERROR')
   * @param error - Error object or message
   */
  error: (label: string, error?: any): void => {
    if (error === undefined) {
      console.error(`[${label}]`)
    } else if (error instanceof Error) {
      console.error(`[${label}]`, error.message, error.stack)
    } else {
      console.error(`[${label}]`, error)
    }
  },

  /**
   * Info level - logged only in development
   * @param label - Label for the info message
   * @param data - Data to log
   */
  info: (label: string, data?: any): void => {
    if (DEBUG) {
      if (data === undefined) {
        console.info(`[${label}]`)
      } else {
        console.info(`[${label}]`, data)
      }
    }
  },

  /**
   * Performance timing helper
   * @param label - Label for the operation
   * @returns Function to call when operation completes (logs duration)
   */
  time: (label: string): (() => void) => {
    const start = performance.now()
    return () => {
      const end = performance.now()
      const duration = (end - start).toFixed(2)
      logger.debug(`${label}-TIMING`, `${duration}ms`)
    }
  },

  /**
   * Table logging (for development debugging complex structures)
   * @param label - Label for the table
   * @param data - Array of objects to display as table
   */
  table: (label: string, data: any[]): void => {
    if (DEBUG && console.table) {
      console.group(`[${label}]`)
      console.table(data)
      console.groupEnd()
    }
  },

  /**
   * Group related logs together
   * @param label - Group label
   * @param fn - Function containing logger calls
   */
  group: (label: string, fn: () => void): void => {
    if (DEBUG) {
      console.group(`[${label}]`)
      fn()
      console.groupEnd()
    }
  },
}

/**
 * Convenience function to create a scoped logger for a module
 * @param moduleName - Name of the module (e.g., 'search', 'cache', 'api')
 * @returns Logger with module prefix
 */
export function createLogger(moduleName: string) {
  const prefix = moduleName.toUpperCase()

  return {
    debug: (label: string, data?: any) => logger.debug(`${prefix}-${label}`, data),
    warn: (label: string, data?: any) => logger.warn(`${prefix}-${label}`, data),
    error: (label: string, error?: any) => logger.error(`${prefix}-${label}`, error),
    info: (label: string, data?: any) => logger.info(`${prefix}-${label}`, data),
    time: (label: string) => logger.time(`${prefix}-${label}`),
    table: (label: string, data: any[]) => logger.table(`${prefix}-${label}`, data),
    group: (label: string, fn: () => void) => logger.group(`${prefix}-${label}`, fn),
  }
}

/**
 * Example usage in other files:
 *
 * import { createLogger } from './logger'
 * const log = createLogger('search')
 *
 * log.debug('FILTER-START', { query, mode })
 * log.debug('FILTER-END', { resultCount })
 * log.warn('TIMEOUT', { url, ms: 10000 })
 * log.error('PARSE-ERROR', error)
 */
