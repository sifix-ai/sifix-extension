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

const TX_METHODS = ["eth_sendTransaction", "eth_signTransaction"]
const SIGN_METHODS = ["personal_sign", "eth_sign", "eth_signTypedData", "eth_signTypedData_v3", "eth_signTypedData_v4"]

// ─── API Bridge (MAIN → ISOLATED → dApp) ────────────
function analyzeViaBridge(tx: TxRequest): Promise<AnalysisResult> {
  return new Promise((resolve) => {
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
  el.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:2147483646;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"
  el.innerHTML = '<div style="background:#1a1a2e;border-radius:16px;padding:24px 32px;text-align:center"><div style="width:40px;height:40px;border:3px solid #334155;border-top-color:#4ecdc4;border-radius:50%;animation:sifixspin 0.8s linear infinite;margin:0 auto 12px"></div><div style="color:white;font-size:14px;font-weight:500">SIFIX analyzing...</div><div style="color:#64748b;font-size:12px;margin-top:4px">0G Security Agent</div></div><style>@keyframes sifixspin{to{transform:rotate(360deg)}}</style>'
  document.documentElement.appendChild(el)
  return () => el.remove()
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
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"
    overlay.innerHTML = `
      <div style="background:${bg};border:1px solid ${accent}40;border-radius:20px;padding:28px;max-width:440px;width:92%;box-shadow:0 24px 80px rgba(0,0,0,0.6)">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:40px;margin-bottom:8px">${icon}</div>
          <h2 style="color:white;margin:0 0 4px;font-size:20px">${title}</h2>
          <div style="display:inline-flex;align-items:center;gap:8px;margin-top:8px">
            <span style="background:${accent}20;color:${accent};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">${analysis.riskLevel} · Score ${analysis.riskScore}/100</span>
            ${providerTag}
          </div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:12px;margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px"><span style="color:#94a3b8">From</span><span style="color:#e2e8f0;font-family:monospace;font-size:12px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tx.from || "-"}</span></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px"><span style="color:#94a3b8">To</span><span style="color:#e2e8f0;font-family:monospace;font-size:12px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tx.to || "-"}</span></div>
          ${valEth ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px"><span style="color:#94a3b8">Value</span><span style="color:#e2e8f0;font-family:monospace;font-size:12px">${valEth} ETH</span></div>` : ""}
          <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px"><span style="color:#94a3b8">Method</span><span style="color:#e2e8f0;font-family:monospace;font-size:12px">${method}</span></div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:14px;margin-bottom:16px">
          <div style="color:#cbd5e0;font-size:13px;line-height:1.6">${analysis.explanation || "No analysis available."}</div>
          ${threatsHtml}
        </div>
        ${storageHtml}
        <div style="display:flex;gap:10px">
          <button id="sifix-cancel" style="padding:12px 20px;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#94a3b8;font-weight:600;font-size:14px;cursor:pointer;flex:1">${isDanger ? "Block" : "Cancel"}</button>
          <button id="sifix-proceed" style="padding:12px 20px;border-radius:10px;border:none;background:${accent};color:white;font-weight:600;font-size:14px;cursor:pointer;flex:1">${isDanger ? "Proceed Anyway (Risky)" : "Proceed"}</button>
        </div>
        <div style="text-align:center;margin-top:12px;font-size:11px;color:#475569">Protected by SIFIX x 0G Security Agent</div>
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
              const tx: TxRequest = isTx ? (params[0] || {}) : {}
              const hideLoading = showLoading()

              try {
                const analysis = await analyzeViaBridge(tx)
                hideLoading()

                if (!analysis.success && analysis.error) {
                  console.warn("[SIFIX] Analysis failed, allowing:", analysis.error)
                  return target.request(args)
                }

                const proceed = await showRiskModal(method, tx, analysis)
                if (!proceed) {
                  const err: any = new Error("Transaction blocked by SIFIX Security Agent")
                  err.code = 4001
                  throw err
                }
              } catch (err: any) {
                hideLoading()
                if (err.code === 4001) throw err
                console.warn("[SIFIX] Error, allowing tx:", err.message)
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
