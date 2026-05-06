/**
 * Transaction Interceptor
 * Intercepts wallet transactions and prompts user for simulation
 */

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  world: "MAIN",
  run_at: "document_start"
}

interface TransactionRequest {
  from?: string
  to?: string
  data?: string
  value?: string
  gas?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  nonce?: string
}

interface InterceptionResult {
  action: "proceed" | "simulate" | "block"
  txHash?: string
  simulationResult?: any
}

// Store original provider
let originalProvider: any = null

/**
 * Show interactive popup for user decision
 */
async function showInterceptionPopup(
  method: string,
  params: any[]
): Promise<InterceptionResult> {
  return new Promise((resolve) => {
    // Create popup overlay
    const overlay = document.createElement("div")
    overlay.id = "sifix-tx-popup"
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `

    // Create popup content
    const popup = document.createElement("div")
    popup.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #0f3460;
      border-radius: 24px;
      padding: 32px;
      max-width: 480px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.3s ease-out;
    `

    // Transaction details
    const txDetails = method === "eth_sendTransaction" ? params[0] : {}
    const isSignature = method.includes("sign")

    popup.innerHTML = `
      <style>
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .sifix-btn {
          padding: 14px 24px;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
        }
        .sifix-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }
        .sifix-btn-trust {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .sifix-btn-simulate {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }
        .sifix-detail {
          background: rgba(255, 255, 255, 0.05);
          padding: 12px 16px;
          border-radius: 8px;
          margin: 8px 0;
          font-size: 13px;
          color: #a0aec0;
          word-break: break-all;
        }
      </style>

      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 64px; height: 64px; margin: 0 auto 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px;">
          🛡️
        </div>
        <h2 style="color: white; margin: 0 0 8px 0; font-size: 24px;">SIFIX Security Check</h2>
        <p style="color: #a0aec0; margin: 0; font-size: 14px;">
          ${isSignature ? "Signature Request Detected" : "Transaction Detected"}
        </p>
      </div>

      <div style="margin-bottom: 24px;">
        <div style="color: #e2e8f0; font-size: 13px; font-weight: 600; margin-bottom: 8px;">METHOD</div>
        <div class="sifix-detail">${method}</div>

        ${
          txDetails.to
            ? `
          <div style="color: #e2e8f0; font-size: 13px; font-weight: 600; margin: 16px 0 8px 0;">TO</div>
          <div class="sifix-detail">${txDetails.to}</div>
        `
            : ""
        }

        ${
          txDetails.value
            ? `
          <div style="color: #e2e8f0; font-size: 13px; font-weight: 600; margin: 16px 0 8px 0;">VALUE</div>
          <div class="sifix-detail">${parseInt(txDetails.value, 16) / 1e18} ETH</div>
        `
            : ""
        }

        ${
          txDetails.data && txDetails.data !== "0x"
            ? `
          <div style="color: #e2e8f0; font-size: 13px; font-weight: 600; margin: 16px 0 8px 0;">DATA</div>
          <div class="sifix-detail">${txDetails.data.slice(0, 66)}${txDetails.data.length > 66 ? "..." : ""}</div>
        `
            : ""
        }
      </div>

      <div style="background: rgba(245, 87, 108, 0.1); border: 1px solid rgba(245, 87, 108, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <div style="color: #f5576c; font-weight: 600; margin-bottom: 8px; font-size: 14px;">⚠️ Choose Your Action</div>
        <div style="color: #cbd5e0; font-size: 13px; line-height: 1.6;">
          <strong>Trust & Proceed:</strong> Execute immediately without simulation<br>
          <strong>Simulate First:</strong> Run AI-powered security analysis before executing
        </div>
      </div>

      <div style="display: flex; gap: 12px;">
        <button class="sifix-btn sifix-btn-trust" id="sifix-trust">
          ⚡ Trust & Proceed
        </button>
        <button class="sifix-btn sifix-btn-simulate" id="sifix-simulate">
          🧪 Simulate First
        </button>
      </div>
    `

    overlay.appendChild(popup)
    document.body.appendChild(overlay)

    // Handle button clicks
    const trustBtn = document.getElementById("sifix-trust")
    const simulateBtn = document.getElementById("sifix-simulate")

    trustBtn?.addEventListener("click", () => {
      document.body.removeChild(overlay)
      resolve({ action: "proceed" })
    })

    simulateBtn?.addEventListener("click", async () => {
      // Update popup to show loading
      popup.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="width: 64px; height: 64px; margin: 0 auto 24px; border: 4px solid rgba(102, 126, 234, 0.2); border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <h3 style="color: white; margin: 0 0 12px 0;">Running Simulation...</h3>
          <p style="color: #a0aec0; margin: 0; font-size: 14px;">AI is analyzing transaction safety</p>
        </div>
        <style>
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      `

      try {
        // Send to background for simulation
        const response = await chrome.runtime.sendMessage({
          type: "SIMULATE_TRANSACTION",
          payload: { method, params }
        })

        // Show simulation result
        const riskColor =
          response.risk === "CRITICAL"
            ? "#f5576c"
            : response.risk === "HIGH"
              ? "#f093fb"
              : response.risk === "MEDIUM"
                ? "#feca57"
                : "#48dbfb"

        popup.innerHTML = `
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 64px; height: 64px; margin: 0 auto 16px; background: ${riskColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px;">
              ${response.risk === "SAFE" || response.risk === "LOW" ? "✅" : "⚠️"}
            </div>
            <h2 style="color: white; margin: 0 0 8px 0;">Simulation Complete</h2>
            <div style="display: inline-block; padding: 6px 16px; background: ${riskColor}; border-radius: 20px; color: white; font-weight: 600; font-size: 13px;">
              ${response.risk} RISK
            </div>
          </div>

          <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <div style="color: #e2e8f0; font-weight: 600; margin-bottom: 12px;">AI Analysis</div>
            <div style="color: #cbd5e0; font-size: 14px; line-height: 1.6;">
              ${response.analysis || "Transaction appears safe to execute."}
            </div>
          </div>

          ${
            response.warnings && response.warnings.length > 0
              ? `
            <div style="background: rgba(245, 87, 108, 0.1); border: 1px solid rgba(245, 87, 108, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <div style="color: #f5576c; font-weight: 600; margin-bottom: 12px;">⚠️ Warnings</div>
              ${response.warnings.map((w: string) => `<div style="color: #cbd5e0; font-size: 13px; margin: 8px 0;">• ${w}</div>`).join("")}
            </div>
          `
              : ""
          }

          <div style="display: flex; gap: 12px;">
            <button class="sifix-btn" style="background: #2d3748; color: white;" id="sifix-cancel">
              ❌ Cancel
            </button>
            <button class="sifix-btn sifix-btn-trust" id="sifix-proceed">
              ✅ Proceed Anyway
            </button>
          </div>
        `

        const cancelBtn = document.getElementById("sifix-cancel")
        const proceedBtn = document.getElementById("sifix-proceed")

        cancelBtn?.addEventListener("click", () => {
          document.body.removeChild(overlay)
          resolve({ action: "block" })
        })

        proceedBtn?.addEventListener("click", () => {
          document.body.removeChild(overlay)
          resolve({
            action: "proceed",
            simulationResult: response
          })
        })
      } catch (error) {
        console.error("Simulation failed:", error)
        document.body.removeChild(overlay)
        resolve({ action: "proceed" }) // Fallback to proceed on error
      }
    })
  })
}

/**
 * Inject proxy into window.ethereum
 */
function injectProxy() {
  if (!window.ethereum) {
    console.log("[SIFIX] No ethereum provider found")
    return
  }

  // Store original provider
  originalProvider = window.ethereum

  // Create proxy
  const proxiedProvider = new Proxy(originalProvider, {
    get(target, prop) {
      // Intercept request method
      if (prop === "request") {
        return async function (args: { method: string; params?: any[] }) {
          const { method, params = [] } = args

          // Methods to intercept
          const interceptMethods = [
            "eth_sendTransaction",
            "eth_signTransaction",
            "personal_sign",
            "eth_sign",
            "eth_signTypedData",
            "eth_signTypedData_v3",
            "eth_signTypedData_v4"
          ]

          if (interceptMethods.includes(method)) {
            console.log(`[SIFIX] Intercepted: ${method}`, params)

            // Show popup and get user decision
            const result = await showInterceptionPopup(method, params)

            if (result.action === "block") {
              throw new Error("Transaction cancelled by user")
            }

            // If user chose to proceed, call original method
            return target.request(args)
          }

          // For non-intercepted methods, pass through
          return target.request(args)
        }
      }

      // Pass through other properties
      return target[prop]
    }
  })

  // Replace window.ethereum with proxy
  Object.defineProperty(window, "ethereum", {
    get() {
      return proxiedProvider
    },
    set() {
      console.warn("[SIFIX] Attempt to override ethereum provider blocked")
    },
    configurable: false
  })

  console.log("[SIFIX] Transaction interceptor injected ✅")
}

// Inject immediately
injectProxy()
