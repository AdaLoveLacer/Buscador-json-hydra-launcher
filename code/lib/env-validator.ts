/**
 * BUG #5.2: Environment Variables Validator (Frontend)
 *
 * Valida variáveis de ambiente do lado do cliente durante inicialização.
 * Garante que a aplicação tem todas as variáveis necessárias para funcionar.
 *
 * Uso:
 *   import { validateEnv, getEnv } from '@/lib/env-validator'
 *   
 *   if (!validateEnv()) {
 *     throw new Error('Environment validation failed')
 *   }
 *   
 *   const apiUrl = getEnv('NEXT_PUBLIC_API_URL')
 */

interface EnvConfig {
  key: string
  required: boolean
  default?: string
  validator?: (value: string) => boolean
}

const ENV_CONFIG: EnvConfig[] = [
  {
    key: 'NEXT_PUBLIC_API_URL',
    required: true,
    validator: (v) => v.startsWith('http://') || v.startsWith('https://'),
  },
  {
    key: 'NEXT_PUBLIC_LOG_LEVEL',
    required: false,
    default: 'info',
    validator: (v) => ['debug', 'info', 'warn', 'error'].includes(v),
  },
  {
    key: 'NODE_ENV',
    required: false,
    default: 'development',
    validator: (v) => ['development', 'production', 'test'].includes(v),
  },
]

let validated = false
let errors: string[] = []
let warnings: string[] = []

/**
 * Valida todas as variáveis de ambiente necessárias
 */
export function validateEnv(): boolean {
  if (validated) {
    return errors.length === 0
  }

  errors = []
  warnings = []

  for (const config of ENV_CONFIG) {
    const value = process.env[config.key] ?? config.default

    if (!value && config.required) {
      errors.push(`Required environment variable missing: ${config.key}`)
      continue
    }

    if (value && config.validator && !config.validator(value)) {
      errors.push(`Invalid value for ${config.key}: ${value}`)
      continue
    }

    if (!value && config.default) {
      warnings.push(`${config.key} not set, using default: ${config.default}`)
    }
  }

  validated = true

  if (errors.length > 0 || warnings.length > 0) {
    printValidationStatus()
  }

  return errors.length === 0
}

/**
 * Obtém valor de variável de ambiente
 */
export function getEnv(key: string, defaultValue?: string): string {
  if (!validated) {
    console.warn(`Environment not validated yet. Call validateEnv() first.`)
  }

  const value = process.env[key]

  if (!value && defaultValue) {
    return defaultValue
  }

  if (!value) {
    console.warn(`Environment variable not found: ${key}`)
    return ''
  }

  return value
}

/**
 * Obtém URL da API
 */
export function getApiUrl(): string {
  return getEnv('NEXT_PUBLIC_API_URL', 'http://localhost:4000')
}

/**
 * Obtém nível de log
 */
export function getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
  const level = getEnv('NEXT_PUBLIC_LOG_LEVEL', 'info')
  return (level as any) || 'info'
}

/**
 * Obtém ambiente (development/production)
 */
export function isProduction(): boolean {
  const env = getEnv('NODE_ENV', 'development')
  return env === 'production'
}

/**
 * Imprime status de validação
 */
function printValidationStatus(): void {
  const style = {
    success: 'color: #22c55e; font-weight: bold',
    error: 'color: #ef4444; font-weight: bold',
    warning: 'color: #eab308; font-weight: bold',
    info: 'color: #3b82f6',
  }

  console.group('%c🔍 Environment Validation', style.info)

  if (errors.length > 0) {
    console.group('%c❌ Errors', style.error)
    errors.forEach((err) => console.error(err))
    console.groupEnd()
  }

  if (warnings.length > 0) {
    console.group('%c⚠️  Warnings', style.warning)
    warnings.forEach((warn) => console.warn(warn))
    console.groupEnd()
  }

  if (errors.length === 0 && warnings.length > 0) {
    console.log('%c✓ Validation passed with warnings', style.success)
  } else if (errors.length === 0) {
    console.log('%c✓ Validation passed', style.success)
  }

  console.groupEnd()
}

/**
 * Hook para validar ambiente em componentes React
 */
export function useEnvValidation(): { valid: boolean; errors: string[] } {
  const valid = validateEnv()
  return { valid, errors }
}

// Validar automaticamente na importação em desenvolvimento
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    if (!validateEnv()) {
      console.error('⚠️  Environment validation failed in development mode')
    }
  }, 0)
}
