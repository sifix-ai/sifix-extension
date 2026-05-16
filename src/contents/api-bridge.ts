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

const DEFAULT_API = process.env.PLASMO_PUBLIC_DAPP_API_URL ?? "http://localhost:3000/api/v1"

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
  
  // Handle logo URL request
  if (event.data?.type === "SIFIX_REQUEST_LOGO_URL") {
    try {
      const logoUrl = chrome.runtime.getURL('assets/sifix-white.png')
      window.postMessage({ type: "SIFIX_LOGO_URL", url: logoUrl }, "*")
    } catch (err) {
      console.error("[SIFIX] Failed to get logo URL:", err)
    }
    return
  }
  
  if (event.data?.type !== "SIFIX_ANALYZE_TX") return

  const { requestId, tx } = event.data as { requestId: string; tx: TxRequest }

  try {
    // Check if protection is enabled and token exists
    const [enabled] = await Promise.all([
      isProtectionEnabled(),
    ])

    // Get token from storage
    const result = await chrome.storage.local.get(["sifix_token"])
    const token = result.sifix_token

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

    // Send to background service worker to avoid CORS
    console.log("[SIFIX Bridge] Sending to background for analysis...")
    
    const response = await chrome.runtime.sendMessage({
      type: "SIFIX_ANALYZE_TX_API",
      tx: {
        from: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value,
        method: tx.method,
        typedData: tx.typedData,
      },
    })

    console.log("[SIFIX Bridge] Analysis response from background:", response)

    if (!response) {
      console.error("[SIFIX Bridge] No response from background!")
      window.postMessage({
        type: "SIFIX_ANALYSIS_RESULT",
        requestId,
        result: {
          success: false,
          riskLevel: "UNKNOWN",
          riskScore: 0,
          confidence: 0,
          recommendation: "PROCEED",
          explanation: "No response from background service",
          detectedThreats: [],
          error: "no_response"
        },
      }, "*")
      return
    }

    // Send result back to MAIN world
    window.postMessage({
      type: "SIFIX_ANALYSIS_RESULT",
      requestId,
      result: response,
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
