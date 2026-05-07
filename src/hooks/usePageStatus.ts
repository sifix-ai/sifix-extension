import { useState, useEffect } from "react"
import type { SafetyLevel } from "../types"
import { MSG } from "../constants"

interface PageStatus {
  safety: SafetyLevel
  reason: string
  domain: string
}

export function usePageStatus() {
  const [status, setStatus] = useState<PageStatus>({
    safety: "unknown",
    reason: "",
    domain: "",
  })

  useEffect(() => {
    async function load() {
      try {
        const resp = await chrome.runtime.sendMessage({ type: MSG.GET_PAGE_STATUS })
        if (resp?.data) {
          setStatus(resp.data)
        }
      } catch (e) {
        console.error("Failed to get page status:", e)
      }
    }
    load()
  }, [])

  return status
}
