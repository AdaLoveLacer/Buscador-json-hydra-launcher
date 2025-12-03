"use client"

import { useEffect } from "react"
import { createLogger } from "@/lib/logger"

const log = createLogger('root-redirect')

export default function RootRedirectClient() {
  useEffect(() => {
    try {
      window.location.replace("/pt-BR")
    } catch (e) {
      log.error('REDIRECT-FAILED', e)
    }
  }, [])

  return null
}
