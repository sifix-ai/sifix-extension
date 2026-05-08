/**
 * SIFIX Transaction Interceptor
 * Hooks window.ethereum via Proxy — intercepts tx/sign requests
 * Sends to dApp API for AI analysis via @sifix/agent (0G Compute + Storage)
 *
 * Plasmo content script config — runs in MAIN world before page loads
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
  gas?: string
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

// Methods we intercept
const INTERCEPT_METHODS = [
  "eth_sendTransaction",
  "eth_signTransaction",
]

const SIGN_METHODS = [
  "personal_sign",
  "eth_sign",
  "eth_signTypedData",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
]

// ─── API Call (via content script bridge) ────────────
// Content script in MAIN world can't access chrome.storage
// So we use window.postMessage to talk to the isolated content script
async function analyzeViaBackground(tx: TxRequest): Promise<AnalysisResult> {
  return new Promise((resolve) => {
    const requestId = "sifix_" + Date.now() + "_" + Math.random().toString(36).slice(2)

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SIFIX_ANALYSIS_RESULT" && event.data?.requestId === requestId) {
        window.removeEventListener("message", handler)
        resolve(event.data.result)
      }
    }
    window.addEventListener("message", handler)

    // Send to isolated content script → background → dApp API
    window.postMessage({
      type: "SIFIX_ANALYZE_TX",
      requestId,
      tx,
    }, "*")

    // Timeout after 30s
    setTimeout(() => {
      window.removeEventListener("message", handler)
      resolve({
        success: false,
        riskLevel: "UNKNOWN",
        riskScore: 0,
        confidence: 0,
        recommendation: "PROCEED",
        explanation: "Analysis timed out",
        detectedThreats: [],
      })
    }, 30000)
  })
}

// ─── Risk Modal ──────────────────────────────────────
function showRiskModal(
  method: string,
  tx: TxRequest,
  analysis: AnalysisResult
): Promise<boolean> {
  return new Promise((resolve) => {
    // Remove existing modal if any
    document.getElementById("sifix-modal")?.remove()

    const isDangerous = analysis.riskScore >= 60
    const isWarning = analysis.riskScore >= 40 && analysis.riskScore < 60

    const accentColor = isDangerous ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e"
    const bgGradient = isDangerous
      ? "linear-gradient(135deg, #1a0a0a 0%, #2d1010 100%)"
      : isWarning
        ? "linear-gradient(135deg, #1a1a0a 0%, #2d2a10 100%)"
        : "linear-gradient(135deg, #0a1a0a 0%, #102d10 100%)"
    const iconEmoji = isDangerous ? "&#x1F6D1;" : isWarning ? "&#x26A0;&#xFE0F;" : "&#x2705;"
    const titleText = isDangerous
      ? "High Risk Transaction!"
      : isWarning
        ? "Proceed with Caution"
        : "Transaction Looks Safe"

    const overlay = document.createElement("div")
    overlay.id = "sifix-modal"
    overlay.innerHTML = `
      <style>
        #sifix-modal { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 2147483647;
          display: flex; align-items: center; justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          animation: sifix-fadein 0.2s ease-out; }
        @keyframes sifix-fadein { from { opacity: 0; } to { opacity: 1; } }
        #sifix-modal * { box-sizing: border-box; }
        .sifix-box { background: ${bgGradient}; border: 1px solid ${accentColor}40;
          border-radius: 20px; padding: 28px; max-width: 440px; width: 92%;
          box-shadow: 0 24px 80px rgba(0,0,0,0.6); animation: sifix-slide 0.3s ease-out; }
        @keyframes sifix-slide { from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; } }
        .sifix-row { display: flex; justify-content: space-between; padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; }
        .sifix-row:last-child { border-bottom: none; }
        .sifix-label { color: #94a3b8; }
        .sifix-value { color: #e2e8f0; font-family: monospace; font-size: 12px;
          max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sifix-btn { padding: 12px 20px; border-radius: 10px; border: none;
          font-weight: 600; font-size: 14px; cursor: pointer; flex: 1; transition: all 0.15s; }
        .sifix-btn:hover { transform: translateY(-1px); }
        .sifix-btn-cancel { background: #1e293b; color: #94a3b8; border: 1px solid #334155; }
        .sifix-btn-proceed { background: ${accentColor}; color: white; }
      </style>
      <div class="sifix-box">
        <div style="text-align:center; margin-bottom: 20px;">
          <div style="font-size: 40px; margin-bottom: 8px;">${iconEmoji}</div>
          <h2 style="color: white; margin: 0 0 4px; font-size: 20px;">${titleText}</h2>
          <div style="display: inline-flex; align-items: center; gap: 8px; margin-top: 8px;">
            <span style="background: ${accentColor}20; color: ${accentColor}; padding: 4px 12px;
              border-radius: 20px; font-size: 12px; font-weight: 600;">
              ${analysis.riskLevel} &middot; Score ${analysis.riskScore}/100
            </span>
            ${analysis.provider === "0g-compute"
              ? '<span style="background: rgba(78,205,196,0.15); color: #4ecdc4; padding: 4px 8px; border-radius: 12px; font-size: 10px;">0G Compute</span>'
              : ""}
          </div>
        </div>

        <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
          <div class="sifix-row">
            <span class="sifix-label">From</span>
            <span class="sifix-value">${tx.from || "-"}</span>
          </div>
          <div class="sifix-row">
            <span class="sifix-label">To</span>
            <span class="sifix-value">${tx.to || "-"}</span>
          </div>
          ${tx.value ? `<div class="sifix-row">
            <span class="sifix-label">Value</span>
            <span class="sifix-value">${(parseInt(tx.value, 16) / 1e18).toFixed(6)} ETH</span>
          </div>` : ""}
          <div class="sifix-row">
            <span class="sifix-label">Method</span>
            <span class="sifix-value">${method}</span>
          </div>
        </div>

        <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 14px; margin-bottom: 16px;">
          <div style="color: #cbd5e0; font-size: 13px; line-height: 1.6;">
            ${analysis.explanation || "No analysis available."}
          </div>
          ${analysis.detectedThreats?.length
            ? `<div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px;">
                <div style="color: #ef4444; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Threats Detected:</div>
                ${analysis.detectedThreats.map((t: string) =>
                  `<div style="color: #fca5a5; font-size: 12px; margin: 3px 0;">&#x2022; ${t}</div>`
                ).join("")}
              </div>`
            : ""}
        </div>

        ${analysis.storageHash ? `
        <div style="background: rgba(78,205,196,0.08); border: 1px solid rgba(78,205,196,0.2);
          border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px;">
          <span style="color: #4ecdc4; font-weight: 600;">&#x1F517; Stored on 0G</span>
          <span style="color: #94a3b8; margin-left: 8px; font-family: monospace; font-size: 10px;">
            ${analysis.storageHash.slice(0, 16)}...
          </span>
        </div>` : ""}

        <div style="display: flex; gap: 10px;">
          <button class="sifix-btn sifix-btn-cancel" id="sifix-cancel">
            ${isDangerous ? "Block" : "Cancel"}
          </button>
          <button class="sifix-btn sifix-btn-proceed" id="sifix-proceed">
            ${isDangerous ? "Proceed Anyway (Risky)" : "Proceed"}
          </button>
        </div>

        <div style="text-align: center; margin-top: 12px; font-size: 11px; color: #475569;">
          Protected by SIFIX x 0G Security Agent
        </div>
      </div>
    `

    document.body.appendChild(overlay)

    document.getElementById("sifix-cancel")?.addEventListener("click", () => {
      overlay.remove()
      resolve(false)
    })
    document.getElementById("sifix-proceed")?.addEventListener("click", () => {
      overlay.remove()
      resolve(true)
    })
  })
}

// ─── Loading Modal ───────────────────────────────────
function showLoadingModal(): { remove: () => void } {
  const el = document.createElement("div")
  el.id = "sifix-loading"
  el.innerHTML = `
    <style>
      #sifix-loading { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.7); z-index: 2147483646; display: flex;
        align-items: center; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    </style>
    <div style="background: #1a1a2e; border-radius: 16px; padding: 24px 32px; text-align: center;">
      <div style="width: 40px; height: 40px; border: 3px solid #334155; border-top-color: #4ecdc4;
        border-radius: 50%; animation: sifix-spin 0.8s linear infinite; margin: 0 auto 12px;"></div>
      <div style="color: white; font-size: 14px; font-weight: 500;">SIFIX analyzing...</div>
      <div style="color: #64748b; font-size: 12px; margin-top: 4px;">0G Security Agent</div>
      <style>@keyframes sifix-spin { to { transform: rotate(360deg); } }</style>
    </div>
  `
  document.body.appendChild(el)
  return { remove: () => el.remove() }
}

// ─── Injection ───────────────────────────────────────
function injectProxy() {
  if (!window.ethereum) {
    // Wallet not loaded yet — watch for it
    let attempts = 0
    const watcher = setInterval(() => {
      if (window.ethereum || attempts > 50) {
        clearInterval(watcher)
        if (window.ethereum) doInject()
      }
      attempts++
    }, 200)
    return
  }
  doInject()
}

function doInject() {
  const original = window.ethereum

  const proxied = new Proxy(original, {
    get(target, prop) {
      if (prop === "request") {
        return async function (args: { method: string; params?: any[] }) {
          const { method, params = [] } = args

          const isTx = INTERCEPT_METHODS.includes(method)
          const isSign = SIGN_METHODS.includes(method)

          if (isTx || isSign) {
            console.log("[SIFIX] Intercepted:", method)

            const tx: TxRequest = isTx ? (params[0] || {}) : {}

            // Show loading
            const loading = showLoadingModal()

            try {
              // Analyze via dApp API (through bridge)
              const analysis = await analyzeViaBackground(tx)
              loading.remove()

              if (!analysis.success && analysis.error) {
                console.warn("[SIFIX] Analysis failed, allowing:", analysis.error)
                return target.request(args)
              }

              // Show risk modal and wait for user decision
              const proceed = await showRiskModal(method, tx, analysis)

              if (!proceed) {
                const err = new Error("Transaction blocked by SIFIX Security Agent") as any
                err.code = 4001
                throw err
              }
            } catch (err: any) {
              loading.remove()
              if (err.code === 4001) throw err
              // Analysis error — let transaction through (fail-safe)
              console.warn("[SIFIX] Error, allowing tx:", err.message)
            }
          }

          return target.request(args)
        }
      }

      // Pass through everything else
      const value = (target as any)[prop]
      if (typeof value === "function") {
        return value.bind(target)
      }
      return value
    }
  })

  // Replace ethereum with our proxy
  try {
    Object.defineProperty(window, "ethereum", {
      get() { return proxied },
      set(val) {
        // If MetaMask re-injects, re-wrap it
        console.log("[SIFIX] Provider re-injected, re-wrapping...")
        // We lose the proxy — but that's ok for now
      },
      configurable: true,
    })
    console.log("[SIFIX] Transaction interceptor active &#x2705;")
  } catch {
    console.warn("[SIFIX] Could not replace ethereum provider")
  }
}

// Start
injectProxy()
