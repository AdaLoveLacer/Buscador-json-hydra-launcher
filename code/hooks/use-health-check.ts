/**
 * BUG #5.3: useHealthCheck - Hook para monitoramento de saúde do backend
 *
 * Monitora a disponibilidade da API e exibe alertas em caso de problemas.
 */

import { useEffect, useState, useCallback, useRef } from 'react'

// Função helper para obter URL da API
function getApiUrl(): string {
  return typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
    : 'http://localhost:4000'
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown'
  lastCheck: Date | null
  error?: string
  components?: Record<string, any>
}

const DEFAULT_INTERVAL = 30000 // 30 segundos
const QUICK_RETRY_INTERVAL = 5000 // 5 segundos em caso de erro

export function useHealthCheck(
  interval: number = DEFAULT_INTERVAL,
  onStatusChange?: (status: HealthStatus) => void
) {
  const [health, setHealth] = useState<HealthStatus>({
    status: 'unknown',
    lastCheck: null,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const checkHealth = useCallback(async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      const newStatus: HealthStatus = {
        status: response.ok ? 'healthy' : 'unhealthy',
        lastCheck: new Date(),
      }

      if (!response.ok) {
        newStatus.error = `HTTP ${response.status}`
      }

      setHealth(newStatus)
      onStatusChange?.(newStatus)

      return response.ok
    } catch (error) {
      const newStatus: HealthStatus = {
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }

      setHealth(newStatus)
      onStatusChange?.(newStatus)

      return false
    }
  }, [onStatusChange])

  useEffect(() => {
    // Verificar imediatamente
    checkHealth().then((isHealthy) => {
      if (!isHealthy) {
        // Se não está saudável, usar intervalo mais curto
        timeoutRef.current = setTimeout(() => {
          intervalRef.current = setInterval(
            checkHealth,
            QUICK_RETRY_INTERVAL
          )
        }, QUICK_RETRY_INTERVAL)
      } else {
        // Se está saudável, usar intervalo normal
        intervalRef.current = setInterval(checkHealth, interval)
      }
    })

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [checkHealth, interval])

  return health
}

/**
 * Hook para verificar se o backend está pronto
 * Usa o endpoint /health/ready
 */
export function useReadinessProbe(
  onReady?: (ready: boolean) => void,
  pollInterval: number = 5000
) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    const checkReadiness = async () => {
      try {
        const apiUrl = getApiUrl()
        const response = await fetch(`${apiUrl}/health/ready`, {
          method: 'GET',
        })

        if (mounted) {
          const isReady = response.ok
          setReady(isReady)
          onReady?.(isReady)
        }
      } catch {
        if (mounted) {
          setReady(false)
          onReady?.(false)
        }
      }
    }

    checkReadiness()
    const interval = setInterval(checkReadiness, pollInterval)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [onReady, pollInterval])

  return ready
}

/**
 * Hook para liveness probe
 * Usa o endpoint /health/live
 */
export function useLivenessProbe(pollInterval: number = 60000) {
  const [alive, setAlive] = useState(true)

  useEffect(() => {
    let mounted = true

    const checkLiveness = async () => {
      try {
        const apiUrl = getApiUrl()
        const response = await fetch(`${apiUrl}/health/live`, {
          method: 'GET',
        })

        if (mounted) {
          setAlive(response.ok)
        }
      } catch {
        if (mounted) {
          setAlive(false)
        }
      }
    }

    checkLiveness()
    const interval = setInterval(checkLiveness, pollInterval)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [pollInterval])

  return alive
}
