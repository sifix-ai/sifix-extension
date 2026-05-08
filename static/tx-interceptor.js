/**
 * SIFIX TX Interceptor — MAIN world script
 * 
 * Injected via chrome.scripting.executeScript from background worker
 * at webNavigation.onBeforeNavigate / onCommitted (BEFORE any page scripts)
 * 
 * Hooks window.ethereum.request() via Proxy.
 * Shows SIFIX popup with [Simulate & Analyze] / [Proceed to Wallet] buttons.
 */

(function () {
  "use strict"

  // Don't double-inject
  if ((window as any).__SIFIX_INTERCEPTOR_ACTIVE) return
  ;(window as any).__SIFIX_INTERCEPTOR_ACTIVE = true

  var TX_METHODS = ["eth_sendTransaction", "eth_signTransaction"]
  var SIGN_METHODS = ["personal_sign", "eth_sign", "eth_signTypedData", "eth_signTypedData_v3", "eth_signTypedData_v4"]

  // ─── API Bridge (MAIN → ISOLATED content script → dApp API) ────
  function analyzeTx(tx) {
    return new Promise(function (resolve) {
      var id = "sifix_" + Date.now() + "_" + Math.random().toString(36).slice(2)
      var handler = function (e) {
        if (e.data && e.data.type === "SIFIX_ANALYSIS_RESULT" && e.data.requestId === id) {
          window.removeEventListener("message", handler)
          resolve(e.data.result)
        }
      }
      window.addEventListener("message", handler)
      window.postMessage({ type: "SIFIX_ANALYZE_TX", requestId: id, tx: tx }, "*")
      setTimeout(function () {
        window.removeEventListener("message", handler)
        resolve({ success: false, riskLevel: "UNKNOWN", riskScore: 0, confidence: 0, recommendation: "PROCEED", explanation: "Analysis timed out", detectedThreats: [] })
      }, 30000)
    })
  }

  // ─── Show initial interception popup ────────────────────
  function showInterceptPopup(method, tx) {
    return new Promise(function (resolve) {
      // Remove existing
      var old = document.getElementById("sifix-popup")
      if (old) old.remove()

      var isTx = TX_METHODS.indexOf(method) !== -1
      var valEth = tx.value ? (parseInt(tx.value, 16) / 1e18).toFixed(6) : null

      var overlay = document.createElement("div")
      overlay.id = "sifix-popup"
      overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"
      overlay.innerHTML =
        '<div style="background:linear-gradient(135deg,#0f172a,#1e293b);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:28px;max-width:420px;width:92%;box-shadow:0 24px 80px rgba(0,0,0,0.6)">' +
          '<div style="text-align:center;margin-bottom:20px">' +
            '<div style="width:56px;height:56px;margin:0 auto 12px;background:linear-gradient(135deg,#ff6b6b,#4ecdc4);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px">&#x1F6E1;</div>' +
            '<h2 style="color:white;margin:0 0 4px;font-size:20px">SIFIX Security Check</h2>' +
            '<p style="color:#94a3b8;margin:0;font-size:13px">' + (isTx ? "Transaction Detected" : "Signature Request") + '</p>' +
          '</div>' +

          '<div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:12px;margin-bottom:20px">' +
            (tx.to ? '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px"><span style="color:#94a3b8">To</span><span style="color:#e2e8f0;font-family:monospace;font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + tx.to + '</span></div>' : '') +
            (valEth ? '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px"><span style="color:#94a3b8">Value</span><span style="color:#e2e8f0;font-family:monospace;font-size:13px">' + valEth + ' ETH</span></div>' : '') +
            (tx.from ? '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px"><span style="color:#94a3b8">From</span><span style="color:#e2e8f0;font-family:monospace;font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + tx.from + '</span></div>' : '') +
            '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px"><span style="color:#94a3b8">Method</span><span style="color:#e2e8f0;font-family:monospace;font-size:12px">' + method + '</span></div>' +
          '</div>' +

          '<div style="background:rgba(255,107,107,0.08);border:1px solid rgba(255,107,107,0.15);border-radius:12px;padding:14px;margin-bottom:20px;font-size:13px;color:#fca5a5;line-height:1.5">' +
            'This transaction has not been analyzed yet. Run AI simulation to check for risks before sending to your wallet.' +
          '</div>' +

          '<div style="display:flex;flex-direction:column;gap:10px">' +
            '<button id="sifix-analyze" style="padding:14px 20px;border-radius:12px;border:none;background:linear-gradient(135deg,#ff6b6b,#4ecdc4);color:white;font-weight:600;font-size:15px;cursor:pointer;width:100%;display:flex;align-items:center;justify-content:center;gap:8px">' +
              '&#x1F9EA; Simulate &amp; Analyze' +
            '</button>' +
            '<button id="sifix-proceed" style="padding:12px 20px;border-radius:12px;border:1px solid #334155;background:transparent;color:#94a3b8;font-weight:500;font-size:14px;cursor:pointer;width:100%">' +
              'Proceed to Wallet (Skip Analysis)' +
            '</button>' +
            '<button id="sifix-cancel" style="padding:10px 20px;border-radius:10px;border:none;background:transparent;color:#64748b;font-weight:500;font-size:13px;cursor:pointer;width:100%">' +
              'Cancel Transaction' +
            '</button>' +
          '</div>' +

          '<div style="text-align:center;margin-top:14px;font-size:11px;color:#475569">Powered by 0G Compute + Storage</div>' +
        '</div>'

      document.documentElement.appendChild(overlay)

      document.getElementById("sifix-analyze").onclick = function () {
        overlay.remove()
        resolve("analyze")
      }
      document.getElementById("sifix-proceed").onclick = function () {
        overlay.remove()
        resolve("proceed")
      }
      document.getElementById("sifix-cancel").onclick = function () {
        overlay.remove()
        resolve("cancel")
      }
    })
  }

  // ─── Show loading ──────────────────────────────────────
  function showLoading() {
    var el = document.createElement("div")
    el.id = "sifix-loading"
    el.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"
    el.innerHTML =
      '<div style="background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:20px;padding:32px;text-align:center">' +
        '<div style="width:48px;height:48px;border:4px solid #334155;border-top-color:#4ecdc4;border-radius:50%;animation:sifixspin 0.8s linear infinite;margin:0 auto 16px"></div>' +
        '<div style="color:white;font-size:16px;font-weight:600;margin-bottom:4px">Analyzing Transaction...</div>' +
        '<div style="color:#64748b;font-size:13px">0G Security Agent is checking for risks</div>' +
        '<style>@keyframes sifixspin{to{transform:rotate(360deg)}}</style>' +
      '</div>'
    document.documentElement.appendChild(el)
    return function () { el.remove() }
  }

  // ─── Show analysis result ──────────────────────────────
  function showResult(method, tx, analysis) {
    return new Promise(function (resolve) {
      document.getElementById("sifix-popup") && document.getElementById("sifix-popup").remove()

      var isDanger = analysis.riskScore >= 60
      var isWarn = analysis.riskScore >= 40 && analysis.riskScore < 60
      var accent = isDanger ? "#ef4444" : isWarn ? "#f59e0b" : "#22c55e"
      var icon = isDanger ? "\uD83D\uDED1" : isWarn ? "\u26A0\uFE0F" : "\u2705"
      var title = isDanger ? "High Risk Detected!" : isWarn ? "Caution Advised" : "Transaction Looks Safe"
      var providerTag = analysis.provider === "0g-compute" ? '<span style="background:rgba(78,205,196,0.15);color:#4ecdc4;padding:4px 8px;border-radius:12px;font-size:10px">0G Compute</span>' : ""
      var threatsHtml = analysis.detectedThreats && analysis.detectedThreats.length
        ? '<div style="margin-top:12px;border-top:1px solid rgba(255,255,255,0.06);padding-top:12px"><div style="color:#ef4444;font-size:12px;font-weight:600;margin-bottom:8px">Threats Detected:</div>' + analysis.detectedThreats.map(function(t){ return '<div style="color:#fca5a5;font-size:12px;margin:4px 0">&bull; ' + t + '</div>' }).join("") + '</div>'
        : ""
      var storageHtml = analysis.storageHash
        ? '<div style="background:rgba(78,205,196,0.08);border:1px solid rgba(78,205,196,0.2);border-radius:10px;padding:12px;margin-bottom:16px"><span style="color:#4ecdc4;font-weight:600;font-size:13px">&#x1F517; Evidence stored on 0G Storage</span><div style="color:#64748b;font-size:11px;margin-top:4px;font-family:monospace">' + analysis.storageHash.slice(0, 24) + '...</div></div>'
        : ""

      var overlay = document.createElement("div")
      overlay.id = "sifix-popup"
      overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"
      overlay.innerHTML =
        '<div style="background:linear-gradient(135deg,#0f172a,#1e293b);border:1px solid ' + accent + '30;border-radius:20px;padding:28px;max-width:420px;width:92%;box-shadow:0 24px 80px rgba(0,0,0,0.6)">' +
          '<div style="text-align:center;margin-bottom:20px">' +
            '<div style="font-size:44px;margin-bottom:8px">' + icon + '</div>' +
            '<h2 style="color:white;margin:0 0 6px;font-size:20px">' + title + '</h2>' +
            '<div style="display:inline-flex;align-items:center;gap:8px">' +
              '<span style="background:' + accent + '20;color:' + accent + ';padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">' + analysis.riskLevel + ' · Score ' + analysis.riskScore + '/100</span>' +
              providerTag +
            '</div>' +
          '</div>' +

          '<div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:14px;margin-bottom:16px">' +
            '<div style="color:#cbd5e0;font-size:13px;line-height:1.6">' + (analysis.explanation || "Analysis complete.") + '</div>' +
            threatsHtml +
          '</div>' +

          storageHtml +

          '<div style="display:flex;gap:10px">' +
            '<button id="sifix-cancel2" style="padding:12px;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#94a3b8;font-weight:600;font-size:14px;cursor:pointer;flex:1">' + (isDanger ? 'Block' : 'Cancel') + '</button>' +
            '<button id="sifix-proceed2" style="padding:12px;border-radius:10px;border:none;background:' + accent + ';color:white;font-weight:600;font-size:14px;cursor:pointer;flex:1">' + (isDanger ? 'Proceed Anyway' : 'Send to Wallet') + '</button>' +
          '</div>' +
          '<div style="text-align:center;margin-top:12px;font-size:11px;color:#475569">Protected by SIFIX x 0G Security Agent</div>' +
        '</div>'

      document.documentElement.appendChild(overlay)

      document.getElementById("sifix-cancel2").onclick = function () { overlay.remove(); resolve(false) }
      document.getElementById("sifix-proceed2").onclick = function () { overlay.remove(); resolve(true) }
    })
  }

  // ─── Proxy Injection ──────────────────────────────────
  function injectProxy(original) {
    try {
      var proxied = new Proxy(original, {
        get: function (target, prop) {
          if (prop === "request") {
            return async function (args) {
              var method = args.method
              var params = args.params || []
              var isTx = TX_METHODS.indexOf(method) !== -1
              var isSign = SIGN_METHODS.indexOf(method) !== -1

              if (isTx || isSign) {
                console.log("[SIFIX] ⚡ Intercepted:", method, params)

                var tx = isTx ? (params[0] || {}) : {}

                // Step 1: Show intercept popup — user chooses action
                var action = await showInterceptPopup(method, tx)

                if (action === "cancel") {
                  var err = new Error("Transaction cancelled by user")
                  err.code = 4001
                  throw err
                }

                if (action === "analyze") {
                  // Step 2: Run analysis
                  var hideLoading = showLoading()
                  try {
                    var analysis = await analyzeTx(tx)
                    hideLoading()

                    // Step 3: Show result — user decides
                    var proceed = await showResult(method, tx, analysis)
                    if (!proceed) {
                      var err2 = new Error("Transaction blocked by SIFIX")
                      err2.code = 4001
                      throw err2
                    }
                  } catch (e) {
                    hideLoading()
                    if (e.code === 4001) throw e
                    console.warn("[SIFIX] Analysis error:", e.message)
                  }
                }

                // action === "proceed" → just fall through to original
                console.log("[SIFIX] ✅ Passing to wallet")
              }

              return target.request(args)
            }
          }

          var value = target[prop]
          return typeof value === "function" ? value.bind(target) : value
        }
      })

      Object.defineProperty(window, "ethereum", {
        get: function () { return proxied },
        set: function (newVal) {
          console.log("[SIFIX] Provider re-injected, re-wrapping...")
          injectProxy(newVal)
        },
        configurable: true,
        enumerable: true,
      })

      console.log("[SIFIX] ✅ Transaction interceptor active")
      return true
    } catch (e) {
      console.warn("[SIFIX] Proxy inject failed:", e)
      return false
    }
  }

  // ─── Wait for ethereum ────────────────────────────────
  function waitForEthereum() {
    if (window.ethereum) {
      injectProxy(window.ethereum)
      return
    }

    // MetaMask fires this when ready
    window.addEventListener("ethereum#initialized", function () {
      if (window.ethereum) injectProxy(window.ethereum)
    }, { once: true })

    // Fallback poll
    var tries = 0
    var poll = setInterval(function () {
      if (window.ethereum) {
        clearInterval(poll)
        injectProxy(window.ethereum)
      }
      if (++tries > 150) clearInterval(poll) // 30s
    }, 200)
  }

  waitForEthereum()
})()
