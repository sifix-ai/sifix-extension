/**
 * SIFIX API Bridge Content Script
 * Runs in ISOLATED world — has access to chrome.storage + fetch
 * Bridges MAIN world (tx-interceptor) ↔ dApp API
 *
 * Flow:
 *   tx-interceptor (MAIN) → postMessage("SIFIX_ANALYZE_TX")
 *   → this script (ISOLATED) → check token + protection enabled
 *   → if enabled: fetch dApp API with Bearer token
 *   → postMessage("SIFIX_ANALYSIS_RESULT") back to MAIN world
 */

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start",
  // No "world: MAIN" = runs in ISOLATED world with chrome API access
}

import { getApiBase, getToken } from "../lib/api"

const DEFAULT_API = "http://localhost:3000/api/v1"

interface TxRequest {
  from?: string
  to?: string
  data?: string
  value?: string
  method?: string
  typedData?: Record<string, any>
}

async function getApiBaseSafe(): Promise<string> {
  try {
    return await getApiBase()
  } catch {
    return DEFAULT_API
  }
}

async function getTokenSafe(): Promise<string | null> {
  try {
    return await getToken()
  } catch {
    return null
  }
}

async function isProtectionEnabled(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(["sifixProtectionEnabled"])
    // Default to true if not set (first install)
    return typeof result.sifixProtectionEnabled === "boolean" ? result.sifixProtectionEnabled : true
  } catch {
    return true
  }
}

// Listen for analysis requests from MAIN world
window.addEventListener("message", async (event) => {
  if (event.source !== window) return
  if (event.data?.type !== "SIFIX_ANALYZE_TX") return

  const { requestId, tx } = event.data as { requestId: string; tx: TxRequest }

  try {
    // Check if protection is enabled and token exists
    const [apiBase, token, enabled] = await Promise.all([
      getApiBaseSafe(),
      getTokenSafe(),
      isProtectionEnabled(),
    ])

    if (!enabled || !token) {
      // Protection disabled or not authenticated — let tx through without analysis
      window.postMessage({
        type: "SIFIX_ANALYSIS_RESULT",
        requestId,
        result: {
          success: false,
          riskLevel: "UNKNOWN",
          riskScore: 0,
          confidence: 0,
          recommendation: "PROCEED",
          explanation: !token ? "Not authenticated. Activate via dApp." : "Protection paused by user.",
          detectedThreats: [],
          error: !token ? "no_token" : "protection_disabled",
        },
      }, "*")
      return
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const resp = await fetch(`${apiBase}/analyze`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value,
        method: tx.method,
        typedData: tx.typedData,
      }),
    })

    const result = await resp.json()

    // Send result back to MAIN world
    window.postMessage({
      type: "SIFIX_ANALYSIS_RESULT",
      requestId,
      result,
    }, "*")
  } catch (err: any) {
    window.postMessage({
      type: "SIFIX_ANALYSIS_RESULT",
      requestId,
      result: {
        success: false,
        riskLevel: "UNKNOWN",
        riskScore: 0,
        confidence: 0,
        recommendation: "PROCEED",
        explanation: "Analysis failed: " + (err.message || "Unknown error"),
        detectedThreats: [],
        error: err.message,
      },
    }, "*")
  }
})

// Signal to MAIN world that the bridge is ready
try {
  window.postMessage({ type: "SIFIX_BRIDGE_READY" }, "*")
} catch {}
