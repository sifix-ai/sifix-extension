/**
 * SIFIX TX Interceptor — MAIN world content script
 * Plasmo auto-registers this via chrome.scripting with world:"MAIN"
 *
 * Hooks window.ethereum.request() via Proxy to intercept transactions
 * and route them through SIFIX AI analysis (0G Compute + Storage).
 */

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  world: "MAIN",
  run_at: "document_start"
}

// ─── Types ──────────────────────────────────────────
interface TxRequest {
  from?: string
  to?: string
  data?: string
  value?: string
  method?: string
  typedData?: Record<string, any>
}

interface AnalysisResult {
  success: boolean
  riskLevel: string
  riskScore: number
  confidence: number
  recommendation: string
  explanation: string
  detectedThreats: string[]
  provider?: string
  storageHash?: string | null
  storageUrl?: string | null
  error?: string
}

const TX_METHODS = ["eth_sendTransaction", "eth_signTransaction", "eth_sendRawTransaction", "wallet_sendCalls"]
const SIGN_METHODS = [
  "personal_sign",
  "eth_sign",
  "eth_signTypedData",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
  "eth_getEncryptionPublicKey",
  "eth_decrypt",
]
// Note: intentionally not intercepting wallet/utility methods
// like balance or chain checks to avoid false simulations.

let bridgeReady = false

window.addEventListener("message", (event) => {
  if (event.source !== window) return
  if (event.data?.type === "SIFIX_BRIDGE_READY") {
    bridgeReady = true
  }
})

// ─── API Bridge (MAIN → ISOLATED → dApp) ────────────
function analyzeViaBridge(tx: TxRequest): Promise<AnalysisResult> {
  return new Promise((resolve) => {
    if (!bridgeReady) {
      resolve({
        success: false,
        riskLevel: "UNKNOWN",
        riskScore: 0,
        confidence: 0,
        recommendation: "PROCEED",
        explanation: "Bridge not ready. Reload the page and ensure the extension content script is active.",
        detectedThreats: [],
        error: "bridge_not_ready",
      })
      return
    }

    const requestId = "sifix_" + Date.now() + "_" + Math.random().toString(36).slice(2)

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SIFIX_ANALYSIS_RESULT" && event.data?.requestId === requestId) {
        window.removeEventListener("message", handler)
        resolve(event.data.result)
      }
    }
    window.addEventListener("message", handler)
    window.postMessage({ type: "SIFIX_ANALYZE_TX", requestId, tx }, "*")

    // Timeout 30s
    setTimeout(() => {
      window.removeEventListener("message", handler)
      resolve({
        success: false, riskLevel: "UNKNOWN", riskScore: 0, confidence: 0,
        recommendation: "PROCEED", explanation: "Analysis timed out", detectedThreats: [],
      })
    }, 30000)
  })
}

// ─── Loading Modal ──────────────────────────────────
function showLoading(): () => void {
  const el = document.createElement("div")
  el.id = "sifix-loading"
  el.style.cssText = "position:fixed;inset:0;background:rgba(5,8,12,0.82);backdrop-filter:blur(12px);z-index:2147483646;display:flex;align-items:center;justify-content:center;font-family:'Sora','Space Grotesk','Inter',ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif"
  el.innerHTML =
    '<style>' +
    '.sifix-load-card{background:linear-gradient(180deg,#0b0f14,#0f172a);border:1px solid rgba(148,163,184,0.18);border-radius:18px;padding:26px 28px;min-width:280px;text-align:center;color:#e2e8f0;box-shadow:0 24px 80px rgba(0,0,0,0.55)}' +
    '.sifix-spinner{width:42px;height:42px;border:3px solid rgba(148,163,184,0.25);border-top-color:#22d3ee;border-radius:50%;animation:sifixspin 0.8s linear infinite;margin:0 auto 12px}' +
    '.sifix-progress{height:6px;background:rgba(148,163,184,0.16);border-radius:999px;overflow:hidden;margin-top:12px}' +
    '.sifix-bar{height:100%;width:30%;background:linear-gradient(90deg,#22d3ee,#0ea5e9);animation:sifixbar 1.4s ease-in-out infinite}' +
    '@keyframes sifixspin{to{transform:rotate(360deg)}}' +
    '@keyframes sifixbar{0%{transform:translateX(-60%)}50%{transform:translateX(200%)}100%{transform:translateX(400%)}}' +
    '</style>' +
    '<div class="sifix-load-card">' +
    '<div class="sifix-spinner"></div>' +
    '<div style="font-size:15px;font-weight:600">Analyzing request...</div>' +
    '<div style="font-size:12px;color:#94a3b8;margin-top:6px">0G Security Agent running simulation</div>' +
    '<div class="sifix-progress"><div class="sifix-bar"></div></div>' +
    '</div>'
  document.documentElement.appendChild(el)
  return () => el.remove()
}

function sifixBlockError(message: string): Error & { code: number; source: string } {
  const err = new Error(message) as Error & { code: number; source: string }
  err.code = 4900
  err.source = "sifix"
  return err
}

function showDecisionModal(method: string, tx: TxRequest): Promise<"analyze" | "allow" | "block"> {
  return new Promise((resolve) => {
    document.getElementById("sifix-decision")?.remove()
    const overlay = document.createElement("div")
    overlay.id = "sifix-decision"
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(5,8,12,0.86);backdrop-filter:blur(12px);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:'Sora','Space Grotesk','Inter',ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif"
    overlay.innerHTML = `<div style="background:linear-gradient(180deg,#0b0f14,#0f172a);border:1px solid rgba(148,163,184,0.18);border-radius:18px;padding:22px;max-width:460px;width:92%;color:#e2e8f0">
      <div style="font-size:18px;font-weight:650;color:#f8fafc">Transaction captured</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:4px">Choose action before forwarding request to wallet.</div>
      <div style="background:rgba(148,163,184,0.06);border:1px solid rgba(148,163,184,0.12);border-radius:12px;padding:12px;margin-top:12px">
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:6px 0"><span style="color:#94a3b8">Method</span><span style="font-family:monospace">${method}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:6px 0"><span style="color:#94a3b8">From</span><span style="font-family:monospace">${tx.from || "-"}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:6px 0"><span style="color:#94a3b8">To</span><span style="font-family:monospace">${tx.to || "-"}</span></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <button id="sifix-choice-analyze" style="padding:11px 14px;border-radius:12px;border:1px solid #0ea5e9;background:#0ea5e9;color:#04121b;flex:1;min-width:120px;font-weight:600;cursor:pointer">Analyze first</button>
        <button id="sifix-choice-allow" style="padding:11px 14px;border-radius:12px;border:1px solid #1f2a44;background:transparent;color:#cbd5e1;flex:1;min-width:120px;font-weight:600;cursor:pointer">Continue without analyze</button>
        <button id="sifix-choice-block" style="padding:11px 14px;border-radius:12px;border:1px solid #ef4444;background:#ef4444;color:#fff;flex:1;min-width:120px;font-weight:600;cursor:pointer">Block</button>
      </div>
    </div>`
    document.documentElement.appendChild(overlay)

    document.getElementById("sifix-choice-analyze")!.onclick = () => { overlay.remove(); resolve("analyze") }
    document.getElementById("sifix-choice-allow")!.onclick = () => { overlay.remove(); resolve("allow") }
    document.getElementById("sifix-choice-block")!.onclick = () => { overlay.remove(); resolve("block") }
  })
}

// ─── Risk Modal ─────────────────────────────────────
function showRiskModal(method: string, tx: TxRequest, analysis: AnalysisResult): Promise<boolean> {
  return new Promise((resolve) => {
    document.getElementById("sifix-modal")?.remove()

    const isDanger = analysis.riskScore >= 60
    const isWarn = analysis.riskScore >= 40 && analysis.riskScore < 60
    const accent = isDanger ? "#ef4444" : isWarn ? "#f59e0b" : "#22c55e"
    const bg = isDanger ? "linear-gradient(135deg,#1a0a0a,#2d1010)" : isWarn ? "linear-gradient(135deg,#1a1a0a,#2d2a10)" : "linear-gradient(135deg,#0a1a0a,#102d10)"
    const icon = isDanger ? "\uD83D\uDED1" : isWarn ? "\u26A0\uFE0F" : "\u2705"
    const title = isDanger ? "High Risk Transaction!" : isWarn ? "Proceed with Caution" : "Transaction Looks Safe"
    const valEth = tx.value ? (parseInt(tx.value, 16) / 1e18).toFixed(6) : ""
    const providerTag = analysis.provider === "0g-compute" ? '<span style="background:rgba(78,205,196,0.15);color:#4ecdc4;padding:4px 8px;border-radius:12px;font-size:10px">0G Compute</span>' : ""
    const threatsHtml = (analysis.detectedThreats?.length)
      ? '<div style="margin-top:10px;border-top:1px solid rgba(255,255,255,0.06);padding-top:10px"><div style="color:#ef4444;font-size:12px;font-weight:600;margin-bottom:6px">Threats:</div>' + analysis.detectedThreats.map((t) => '<div style="color:#fca5a5;font-size:12px;margin:3px 0">&bull; ' + t + '</div>').join("") + '</div>'
      : ""
    const storageHtml = analysis.storageHash
      ? '<div style="background:rgba(78,205,196,0.08);border:1px solid rgba(78,205,196,0.2);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:12px"><span style="color:#4ecdc4;font-weight:600">&#x1F517; 0G Storage Proof</span></div>'
      : ""

    const overlay = document.createElement("div")
    overlay.id = "sifix-modal"
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(5,8,12,0.86);backdrop-filter:blur(12px);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:'Sora','Space Grotesk','Inter',ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif"
    overlay.innerHTML = `
      <style>
        .sifix-card{background:linear-gradient(180deg,#0b0f14 0%,#0f172a 100%);border:1px solid rgba(148,163,184,0.18);border-radius:18px;padding:22px;max-width:460px;width:92%;box-shadow:0 24px 80px rgba(0,0,0,0.55);color:#e2e8f0}
        .sifix-title{font-size:18px;font-weight:650;color:#f8fafc;margin:0}
        .sifix-sub{font-size:12px;color:#94a3b8;margin-top:2px}
        .sifix-pill{font-size:11px;padding:4px 10px;border-radius:999px;background:${accent}1A;color:${accent};border:1px solid ${accent}55}
        .sifix-panel{background:rgba(148,163,184,0.06);border:1px solid rgba(148,163,184,0.12);border-radius:12px;padding:12px;margin-top:12px}
        .sifix-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(148,163,184,0.12);font-size:12px}
        .sifix-row:last-child{border-bottom:none}
        .sifix-label{color:#94a3b8}
        .sifix-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:11px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e2e8f0}
        .sifix-actions{display:flex;gap:10px;margin-top:14px}
        .sifix-btn{padding:12px 16px;border-radius:12px;border:1px solid #1f2a44;font-weight:600;font-size:13px;cursor:pointer;flex:1}
        .sifix-btn-primary{background:${accent};border-color:${accent};color:#0b0f14}
        .sifix-btn-ghost{background:transparent;color:#cbd5e1}
        .sifix-footer{margin-top:12px;font-size:10px;color:#64748b;text-align:center}
      </style>
      <div class="sifix-card">
        <div style="text-align:center;margin-bottom:10px">
          <div style="width:40px;height:40px;margin:0 auto 8px;border-radius:12px;background:rgba(148,163,184,0.14);display:flex;align-items:center;justify-content:center;color:${accent};font-weight:700">${icon}</div>
          <div class="sifix-title">${title}</div>
          <div class="sifix-sub">Risk assessment complete</div>
          <div style="display:flex;justify-content:center;gap:8px;margin-top:8px">
            <span class="sifix-pill">${analysis.riskLevel} · ${analysis.riskScore}/100</span>
            ${providerTag}
          </div>
        </div>
        <div class="sifix-panel">
          <div class="sifix-row"><span class="sifix-label">From</span><span class="sifix-mono">${tx.from || "-"}</span></div>
          <div class="sifix-row"><span class="sifix-label">To</span><span class="sifix-mono">${tx.to || "-"}</span></div>
          ${valEth ? `<div class="sifix-row"><span class="sifix-label">Value</span><span class="sifix-mono">${valEth} ETH</span></div>` : ""}
          <div class="sifix-row"><span class="sifix-label">Method</span><span class="sifix-mono">${method}</span></div>
        </div>
        <div class="sifix-panel">
          <div style="font-size:12px;line-height:1.6;color:#cbd5e1">${analysis.explanation || "No analysis available."}</div>
          ${threatsHtml}
        </div>
        ${storageHtml}
        <div class="sifix-actions">
          <button id="sifix-cancel" class="sifix-btn sifix-btn-ghost">${isDanger ? "Block" : "Cancel"}</button>
          <button id="sifix-proceed" class="sifix-btn sifix-btn-primary">${isDanger ? "Proceed Anyway" : "Proceed"}</button>
        </div>
        <div class="sifix-footer">Protected by SIFIX x 0G Security Agent</div>
      </div>`
    document.documentElement.appendChild(overlay)

    document.getElementById("sifix-cancel")!.onclick = () => { overlay.remove(); resolve(false) }
    document.getElementById("sifix-proceed")!.onclick = () => { overlay.remove(); resolve(true) }
  })
}

// ─── Proxy Injection ────────────────────────────────
function injectProxy(original: any): boolean {
  try {
    const proxied = new Proxy(original, {
      get(target: any, prop: string | symbol) {
        if (prop === "request") {
          return async function (args: { method: string; params?: any[] }) {
            const { method, params = [] } = args
            const isTx = TX_METHODS.includes(method)
            const isSign = SIGN_METHODS.includes(method)
            if (isTx || isSign) {
              console.log("[SIFIX] Intercepted:", method)
              let tx: TxRequest
              if (isTx) {
                tx = params[0] || {}
              } else if (method === "personal_sign") {
                tx = { from: params[1], data: params[0], method }
              } else if (method === "eth_sign") {
                tx = { from: params[0], data: params[1], method }
              } else if (method === "eth_signTypedData" || method === "eth_signTypedData_v3" || method === "eth_signTypedData_v4") {
                tx = { from: params[0], data: JSON.stringify(params[1]), typedData: params[1], method }
              } else if (method === "eth_getEncryptionPublicKey" || method === "eth_decrypt") {
                tx = { from: params[0], method }
              } else {
                tx = { method }
              }
              try {
                const choice = await showDecisionModal(method, tx)
                console.log("[SIFIX] Decision:", choice)

                if (choice === "block") {
                  throw sifixBlockError("Transaction blocked by SIFIX user decision")
                }

                if (choice === "analyze") {
                  const hideLoading = showLoading()
                  const analysis = await analyzeViaBridge(tx)
                  hideLoading()

                  if (!analysis.success || analysis.error) {
                    throw sifixBlockError(`Analysis unavailable (${analysis.error || "unknown_error"}). Request blocked.`)
                  }

                  const proceed = await showRiskModal(method, tx, analysis)
                  if (!proceed) {
                    throw sifixBlockError("Transaction blocked by SIFIX Security Agent")
                  }
                }
              } catch (err: any) {
                if (err?.code === 4900 || err?.source === "sifix") throw err
                console.error("[SIFIX] Interceptor error (blocked):", err?.message || err)
                throw sifixBlockError("SIFIX interceptor error. Request blocked.")
              }
            }

            return target.request(args)
          }
        }

        const value = target[prop]
        return typeof value === "function" ? value.bind(target) : value
      },
    })

    // Replace window.ethereum — but make it re-definable
    // so MetaMask can still set its initial provider
    Object.defineProperty(window, "ethereum", {
      get() { return proxied },
      set(newProvider: any) {
        // If someone sets a NEW provider object (MetaMask re-inject),
        // re-wrap it with our proxy
        console.log("[SIFIX] Provider re-set detected, re-wrapping...")
        injectProxy(newProvider)
      },
      configurable: true,
      enumerable: true,
    })

    console.log("[SIFIX] Transaction interceptor active ✅")
    return true
  } catch (e) {
    console.warn("[SIFIX] Proxy injection failed:", e)
    return false
  }
}

// ─── Wait for window.ethereum ───────────────────────
// MetaMask injects ethereum asynchronously.
// We watch for it via:
// 1. Check if already available
// 2. Listen for 'ethereum#initialized' event (MetaMask's own event)
// 3. Poll every 200ms for up to 30s

function startIntercepting() {
  if (window.ethereum) {
    injectProxy(window.ethereum)
    return
  }

  // MetaMask fires this event when it injects the provider
  window.addEventListener("ethereum#initialized", () => {
    if (window.ethereum) {
      injectProxy(window.ethereum)
    }
  }, { once: true })

  // Fallback: poll for 30 seconds
  let tries = 0
  const interval = setInterval(() => {
    if (window.ethereum) {
      clearInterval(interval)
      injectProxy(window.ethereum)
    }
    tries++
    if (tries > 150) { // 30s
      clearInterval(interval)
      console.log("[SIFIX] No wallet found after 30s")
    }
  }, 200)
}

startIntercepting()
