/**
 * SIFIX API Bridge Content Script
 * Runs in ISOLATED world — has access to chrome.storage + fetch
 * Bridges MAIN world (tx-interceptor) ↔ dApp API
 *
 * Flow:
 *   tx-interceptor (MAIN) → postMessage("SIFIX_ANALYZE_TX")
 *   → this script (ISOLATED) → fetch dApp API with Bearer token
 *   → postMessage("SIFIX_ANALYSIS_RESULT") back to MAIN world
 */

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start",
  // No "world: MAIN" = runs in ISOLATED world with chrome API access
}

const DEFAULT_API = "http://localhost:3000/api/v1"

async function getApiBase(): Promise<string> {
  try {
    const result = await chrome.storage.local.get(["settings"])
    return result.settings?.dappApiUrl || DEFAULT_API
  } catch {
    return DEFAULT_API
  }
}

async function getToken(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(["sifix_token"])
    return result.sifix_token || null
  } catch {
    return null
  }
}

// Listen for analysis requests from MAIN world
window.addEventListener("message", async (event) => {
  if (event.source !== window) return
  if (event.data?.type !== "SIFIX_ANALYZE_TX") return

  const { requestId, tx } = event.data

  try {
    const [apiBase, token] = await Promise.all([getApiBase(), getToken()])

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const resp = await fetch(`${apiBase}/extension/analyze`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value,
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

// Signal to MAIN world that the bridge is ready.
try {
  window.postMessage({ type: "SIFIX_BRIDGE_READY" }, "*")
} catch {}
