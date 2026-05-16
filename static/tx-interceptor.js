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
  if (window.__SIFIX_INTERCEPTOR_ACTIVE) return
  window.__SIFIX_INTERCEPTOR_ACTIVE = true

  var TX_METHODS = ["eth_sendTransaction", "eth_signTransaction", "eth_sendRawTransaction", "wallet_sendCalls"]
  var SIGN_METHODS = [
    "personal_sign",
    "eth_sign",
    "eth_signTypedData",
    "eth_signTypedData_v3",
    "eth_signTypedData_v4",
    "eth_getEncryptionPublicKey",
    "eth_decrypt"
  ]
  var bridgeReady = false
  var logoUrl = "" // Will be set via message from content script

  window.addEventListener("message", function (event) {
    if (event.source !== window) return
    if (event.data && event.data.type === "SIFIX_BRIDGE_READY") {
      bridgeReady = true
    }
    if (event.data && event.data.type === "SIFIX_LOGO_URL") {
      logoUrl = event.data.url
    }
  })

  // Request logo URL from content script
  window.postMessage({ type: "SIFIX_REQUEST_LOGO_URL" }, "*")

  // ─── API Bridge (MAIN → ISOLATED content script → dApp API) ────
  function analyzeTx(tx) {
    return new Promise(function (resolve) {
      if (!bridgeReady) {
        console.log("[SIFIX] Bridge not ready!")
        resolve({ success: false, riskLevel: "UNKNOWN", riskScore: 0, confidence: 0, recommendation: "PROCEED", explanation: "Bridge not ready. Reload the page and ensure the extension content script is active.", detectedThreats: [], error: "bridge_not_ready" })
        return
      }

      var id = "sifix_" + Date.now() + "_" + Math.random().toString(36).slice(2)
      console.log("[SIFIX] Sending analysis request with ID:", id)
      
      var handler = function (e) {
        if (e.data && e.data.type === "SIFIX_ANALYSIS_RESULT") {
          console.log("[SIFIX] Received SIFIX_ANALYSIS_RESULT:", e.data.requestId, "expected:", id)
          if (e.data.requestId === id) {
            console.log("[SIFIX] Request ID matches! Resolving with result")
            window.removeEventListener("message", handler)
            resolve(e.data.result)
          }
        }
      }
      window.addEventListener("message", handler)
      window.postMessage({ type: "SIFIX_ANALYZE_TX", requestId: id, tx: tx }, "*")
      
      setTimeout(function () {
        console.log("[SIFIX] Analysis timeout after 30s for request:", id)
        window.removeEventListener("message", handler)
        resolve({ success: false, riskLevel: "UNKNOWN", riskScore: 0, confidence: 0, recommendation: "PROCEED", explanation: "Analysis timed out", detectedThreats: [], error: "timeout" })
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

      var toRow = tx.to
        ? '<div class="sifix-row"><span class="sifix-label">To</span><span class="sifix-mono">' + tx.to + '</span></div>'
        : ""
      var valueRow = valEth
        ? '<div class="sifix-row"><span class="sifix-label">Value</span><span class="sifix-mono">' + valEth + ' ETH</span></div>'
        : ""
      var fromRow = tx.from
        ? '<div class="sifix-row"><span class="sifix-label">From</span><span class="sifix-mono">' + tx.from + '</span></div>'
        : ""

      var overlay = document.createElement("div")
      overlay.id = "sifix-popup"
      overlay.style.cssText = "position:fixed;inset:0;background:rgba(5,8,12,0.84);backdrop-filter:blur(12px);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:'Sora','Space Grotesk','Inter',ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif"
      overlay.innerHTML =
        '<style>' +
        '.sifix-card{background:linear-gradient(180deg,#0b0f14 0%,#0f172a 100%);border:1px solid rgba(148,163,184,0.18);border-radius:18px;padding:22px;max-width:460px;width:92%;box-shadow:0 24px 80px rgba(0,0,0,0.55);color:#e2e8f0}' +
        '.sifix-brand{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}' +
        '.sifix-logo{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;overflow:hidden}' +
        '.sifix-logo img{width:100%;height:100%;object-fit:contain}' +
        '.sifix-title{font-size:18px;font-weight:650;color:#f8fafc}' +
        '.sifix-sub{font-size:12px;color:#94a3b8;margin-top:2px}' +
        '.sifix-chip{font-size:11px;padding:4px 8px;border-radius:999px;background:rgba(34,211,238,0.12);color:#22d3ee;border:1px solid rgba(34,211,238,0.35)}' +
        '.sifix-panel{background:rgba(148,163,184,0.06);border:1px solid rgba(148,163,184,0.12);border-radius:12px;padding:10px 12px;margin-top:12px}' +
        '.sifix-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(148,163,184,0.12);font-size:12px}' +
        '.sifix-row:last-child{border-bottom:none}' +
        '.sifix-label{color:#94a3b8}' +
        '.sifix-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:11px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e2e8f0}' +
        '.sifix-alert{margin-top:14px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.28);border-radius:12px;padding:12px;font-size:12px;color:#fecaca;line-height:1.5}' +
        '.sifix-actions{display:flex;flex-direction:column;gap:10px;margin-top:16px}' +
        '.sifix-btn{padding:12px 16px;border-radius:12px;border:1px solid transparent;font-weight:600;font-size:13px;cursor:pointer;width:100%}' +
        '.sifix-btn-primary{background:linear-gradient(135deg,#22d3ee,#0ea5e9);color:#03121a}' +
        '.sifix-btn-ghost{background:transparent;border-color:#1f2a44;color:#cbd5e1}' +
        '.sifix-btn-text{background:transparent;border:none;color:#64748b;font-weight:500}' +
        '.sifix-footer{margin-top:12px;font-size:10px;color:#64748b;text-align:center}' +
        '</style>' +
        '<div class="sifix-card">' +
        '<div class="sifix-brand">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
        '<div class="sifix-logo">' + (logoUrl ? '<img src="' + logoUrl + '" alt="SIFIX" />' : '<div style="width:40px;height:40px;background:linear-gradient(135deg,#22d3ee,#0ea5e9);border-radius:12px"></div>') + '</div>' +
        '<div>' +
        '<div class="sifix-title">SIFIX Security Check</div>' +
        '<div class="sifix-sub">' + (isTx ? "Transaction detected" : "Signature request") + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="sifix-chip">Pre-flight</div>' +
        '</div>' +

        '<div class="sifix-panel">' +
        toRow +
        valueRow +
        fromRow +
        '<div class="sifix-row"><span class="sifix-label">Method</span><span class="sifix-mono">' + method + '</span></div>' +
        '</div>' +

        '<div class="sifix-alert">This request has not been analyzed. Run AI simulation to check risks before passing it to your wallet.</div>' +

        '<div class="sifix-actions">' +
        '<button id="sifix-analyze" class="sifix-btn sifix-btn-primary">Simulate &amp; Analyze</button>' +
        '<button id="sifix-proceed" class="sifix-btn sifix-btn-ghost">Proceed to Wallet (Skip Analysis)</button>' +
        '<button id="sifix-cancel" class="sifix-btn sifix-btn-text">Cancel Request</button>' +
        '</div>' +

        '<div class="sifix-footer">Powered by 0G Compute + Storage</div>' +
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
    el.style.cssText = "position:fixed;inset:0;background:rgba(5,8,12,0.82);backdrop-filter:blur(12px);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:'Sora','Space Grotesk','Inter',ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif"
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
    return function () { el.remove() }
  }

  // ─── Show error modal ──────────────────────────────
  function showError(title, message, details) {
    return new Promise(function (resolve) {
      document.getElementById("sifix-popup") && document.getElementById("sifix-popup").remove()

      var overlay = document.createElement("div")
      overlay.id = "sifix-popup"
      overlay.style.cssText = "position:fixed;inset:0;background:rgba(5,8,12,0.86);backdrop-filter:blur(12px);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:'Sora','Space Grotesk','Inter',ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif"
      overlay.innerHTML =
        '<style>' +
        '.sifix-card{background:linear-gradient(180deg,#0b0f14 0%,#0f172a 100%);border:1px solid rgba(239,68,68,0.3);border-radius:18px;padding:22px;max-width:460px;width:92%;box-shadow:0 24px 80px rgba(0,0,0,0.55);color:#e2e8f0}' +
        '.sifix-title{font-size:18px;font-weight:650;color:#f8fafc;margin:0}' +
        '.sifix-sub{font-size:12px;color:#94a3b8;margin-top:2px}' +
        '.sifix-panel{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:12px;margin-top:12px}' +
        '.sifix-actions{display:flex;gap:10px;margin-top:14px}' +
        '.sifix-btn{padding:12px 16px;border-radius:12px;border:1px solid #1f2a44;font-weight:600;font-size:13px;cursor:pointer;flex:1}' +
        '.sifix-btn-primary{background:#ef4444;border-color:#ef4444;color:#fff}' +
        '.sifix-btn-ghost{background:transparent;color:#cbd5e1}' +
        '.sifix-footer{margin-top:12px;font-size:10px;color:#64748b;text-align:center}' +
        '</style>' +
        '<div class="sifix-card">' +
        '<div style="text-align:center;margin-bottom:10px">' +
        '<div style="width:48px;height:48px;margin:0 auto 8px;border-radius:12px;padding:8px;background:rgba(239,68,68,0.14);display:flex;align-items:center;justify-content:center">' +
        '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
        '</div>' +
        '<div class="sifix-title">' + title + '</div>' +
        '<div class="sifix-sub">Analysis could not be completed</div>' +
        '</div>' +

        '<div class="sifix-panel">' +
        '<div style="font-size:12px;line-height:1.6;color:#fca5a5">' + message + '</div>' +
        (details ? '<div style="font-size:11px;color:#64748b;margin-top:8px;font-family:monospace">' + details + '</div>' : '') +
        '</div>' +

        '<div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:10px;padding:10px;margin-top:12px">' +
        '<div style="color:#fbbf24;font-size:11px;line-height:1.5">⚠️ You can proceed without analysis, but this is not recommended. The transaction has not been verified for safety.</div>' +
        '</div>' +

        '<div class="sifix-actions">' +
        '<button id="sifix-cancel-err" class="sifix-btn sifix-btn-ghost">Cancel Transaction</button>' +
        '<button id="sifix-proceed-err" class="sifix-btn sifix-btn-primary">Proceed Anyway</button>' +
        '</div>' +
        '<div class="sifix-footer">Protected by SIFIX x 0G Security Agent</div>' +
        '</div>'

      document.documentElement.appendChild(overlay)
      console.log("[SIFIX] Error modal displayed")

      document.getElementById("sifix-cancel-err").onclick = function () { 
        console.log("[SIFIX] User cancelled after error")
        overlay.remove(); 
        resolve(false) 
      }
      document.getElementById("sifix-proceed-err").onclick = function () { 
        console.log("[SIFIX] User proceeded despite error")
        overlay.remove(); 
        resolve(true) 
      }
    })
  }

  // ─── Show analysis result ──────────────────────────────
  function showResult(method, tx, analysis) {
    console.log("[SIFIX] showResult called with:", { method, tx, analysis })
    return new Promise(function (resolve) {
      document.getElementById("sifix-popup") && document.getElementById("sifix-popup").remove()

      var isDanger = analysis.riskScore >= 60
      var isWarn = analysis.riskScore >= 40 && analysis.riskScore < 60
      var accent = isDanger ? "#ef4444" : isWarn ? "#f59e0b" : "#22c55e"
      var title = isDanger ? "High Risk Detected!" : isWarn ? "Caution Advised" : "Transaction Looks Safe"
      var providerTag = analysis.provider === "0g-compute" ? '<span style="background:rgba(78,205,196,0.15);color:#4ecdc4;padding:4px 8px;border-radius:12px;font-size:10px">0G Compute</span>' : ""
      var threatsHtml = analysis.detectedThreats && analysis.detectedThreats.length
        ? '<div style="margin-top:12px;border-top:1px solid rgba(255,255,255,0.06);padding-top:12px"><div style="color:#ef4444;font-size:12px;font-weight:600;margin-bottom:8px">Threats Detected:</div>' + analysis.detectedThreats.map(function (t) { return '<div style="color:#fca5a5;font-size:12px;margin:4px 0">&bull; ' + t + '</div>' }).join("") + '</div>'
        : ""
      var storageHtml = analysis.storageHash
        ? '<div style="background:rgba(78,205,196,0.08);border:1px solid rgba(78,205,196,0.2);border-radius:10px;padding:12px;margin-bottom:16px"><span style="color:#4ecdc4;font-weight:600;font-size:13px">&#x1F517; Evidence stored on 0G Storage</span><div style="color:#64748b;font-size:11px;margin-top:4px;font-family:monospace">' + analysis.storageHash.slice(0, 24) + '...</div></div>'
        : ""

      console.log("[SIFIX] Modal data:", { isDanger, isWarn, accent, title, threatsCount: analysis.detectedThreats?.length })

      console.log("[SIFIX] Modal data:", { isDanger, isWarn, accent, title, threatsCount: analysis.detectedThreats?.length })

      // Use logoUrl from global variable (set via message from api-bridge)
      var logoSrc = logoUrl || ""

      var overlay = document.createElement("div")
      overlay.id = "sifix-popup"
      overlay.style.cssText = "position:fixed;inset:0;background:rgba(5,8,12,0.86);backdrop-filter:blur(12px);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:'Sora','Space Grotesk','Inter',ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif"
      overlay.innerHTML =
        '<style>' +
        '.sifix-card{background:linear-gradient(180deg,#0b0f14 0%,#0f172a 100%);border:1px solid rgba(148,163,184,0.18);border-radius:18px;padding:22px;max-width:460px;width:92%;box-shadow:0 24px 80px rgba(0,0,0,0.55);color:#e2e8f0}' +
        '.sifix-title{font-size:18px;font-weight:650;color:#f8fafc;margin:0}' +
        '.sifix-sub{font-size:12px;color:#94a3b8;margin-top:2px}' +
        '.sifix-pill{font-size:11px;padding:4px 10px;border-radius:999px;background:' + accent + '1A;color:' + accent + ';border:1px solid ' + accent + '55}' +
        '.sifix-panel{background:rgba(148,163,184,0.06);border:1px solid rgba(148,163,184,0.12);border-radius:12px;padding:12px;margin-top:12px}' +
        '.sifix-actions{display:flex;gap:10px;margin-top:14px}' +
        '.sifix-btn{padding:12px 16px;border-radius:12px;border:1px solid #1f2a44;font-weight:600;font-size:13px;cursor:pointer;flex:1}' +
        '.sifix-btn-primary{background:' + accent + ';border-color:' + accent + ';color:#0b0f14}' +
        '.sifix-btn-ghost{background:transparent;color:#cbd5e1}' +
        '.sifix-footer{margin-top:12px;font-size:10px;color:#64748b;text-align:center}' +
        '</style>' +
        '<div class="sifix-card">' +
        '<div style="text-align:center;margin-bottom:10px">' +
        '<div style="width:48px;height:48px;margin:0 auto 8px;border-radius:12px;padding:8px;background:rgba(148,163,184,0.14);display:flex;align-items:center;justify-content:center">' +
        (logoSrc ? '<img src="' + logoSrc + '" style="width:100%;height:100%;object-fit:contain" alt="SIFIX" />' : '<div style="width:100%;height:100%;background:linear-gradient(135deg,#22d3ee,#0ea5e9);border-radius:8px"></div>') +
        '</div>' +
        '<div class="sifix-title">' + title + '</div>' +
        '<div class="sifix-sub">Risk assessment complete</div>' +
        '<div style="display:flex;justify-content:center;gap:8px;margin-top:8px">' +
        '<span class="sifix-pill">' + analysis.riskLevel + ' · ' + analysis.riskScore + '/100</span>' +
        providerTag +
        '</div>' +
        '</div>' +

        '<div class="sifix-panel">' +
        '<div style="font-size:12px;line-height:1.6;color:#cbd5e1">' + (analysis.explanation || "Analysis complete.") + '</div>' +
        threatsHtml +
        '</div>' +

        storageHtml +

        '<div class="sifix-actions">' +
        '<button id="sifix-cancel2" class="sifix-btn sifix-btn-ghost">' + (isDanger ? 'Block' : 'Cancel') + '</button>' +
        '<button id="sifix-proceed2" class="sifix-btn sifix-btn-primary">' + (isDanger ? 'Proceed Anyway' : 'Send to Wallet') + '</button>' +
        '</div>' +
        '<div class="sifix-footer">Protected by SIFIX x 0G Security Agent</div>' +
        '</div>'

      document.documentElement.appendChild(overlay)
      console.log("[SIFIX] Result modal displayed")

      document.getElementById("sifix-cancel2").onclick = function () { 
        console.log("[SIFIX] User clicked Cancel")
        overlay.remove(); 
        resolve(false) 
      }
      document.getElementById("sifix-proceed2").onclick = function () { 
        console.log("[SIFIX] User clicked Proceed")
        overlay.remove(); 
        resolve(true) 
      }
    })
  }

  // ─── Proxy Injection ──────────────────────────────────
  var currentProvider = null
  var wrappedProviders = new WeakMap()

  function interceptMethodCall(target, methodName, args) {
    return (async function () {
      var method = args && args.method
      var params = (args && args.params) || []
      console.log("[SIFIX] request method:", method, "via:", methodName, "params:", params)

      var isTx = TX_METHODS.indexOf(method) !== -1
      var isSign = SIGN_METHODS.indexOf(method) !== -1
      if (isTx || isSign) {
        console.log("[SIFIX] ⚡ Intercepted:", method, params)

        var tx
        if (isTx) {
          tx = params[0] || {}
        } else if (method === "personal_sign") {
          tx = { from: params[1], data: params[0], method: method }
        } else if (method === "eth_sign") {
          tx = { from: params[0], data: params[1], method: method }
        } else if (method === "eth_signTypedData" || method === "eth_signTypedData_v3" || method === "eth_signTypedData_v4") {
          tx = { from: params[0], data: JSON.stringify(params[1]), typedData: params[1], method: method }
        } else if (method === "eth_getEncryptionPublicKey" || method === "eth_decrypt") {
          tx = { from: params[0], method: method }
        } else {
          tx = { from: params[0] && params[0].from, to: params[0] && params[0].to, data: params[0] && params[0].data, value: params[0] && params[0].value, method: method }
        }

        console.log("[SIFIX] modal open:", method)
        var action = await showInterceptPopup(method, tx)
        console.log("[SIFIX] decision:", action)

        if (action === "cancel") {
          var err = new Error("Transaction blocked by SIFIX user decision")
          err.code = 4900
          err.source = "sifix"
          throw err
        }

        if (action === "analyze") {
          var hideLoading = showLoading()
          try {
            var analysis = await analyzeTx(tx)
            hideLoading()

            console.log("[SIFIX] Analysis result:", analysis)

            // Check if analysis has required fields
            if (!analysis) {
              console.error("[SIFIX] Analysis is null/undefined")
              var err2 = new Error("Analysis unavailable (no_response). Request blocked.")
              err2.code = 4900
              err2.source = "sifix"
              throw err2
            }

            // If success field is missing, check for error field only
            var hasError = analysis.error && analysis.error !== "no_token" && analysis.error !== "protection_disabled"
            var isSuccess = analysis.success !== false && !hasError

            console.log("[SIFIX] Analysis validation:", { 
              hasSuccess: analysis.success, 
              hasError: !!analysis.error,
              isSuccess: isSuccess 
            })

            if (!isSuccess) {
              console.error("[SIFIX] Analysis failed:", analysis)
              
              // Show error modal instead of blocking
              var errorTitle = "Analysis Failed"
              var errorMessage = "Unable to analyze transaction: " + (analysis.error || analysis.explanation || "Unknown error")
              var errorDetails = analysis.error || ""
              
              var proceedAnyway = await showError(errorTitle, errorMessage, errorDetails)
              if (!proceedAnyway) {
                var err2b = new Error("Transaction cancelled by user after analysis failure")
                err2b.code = 4900
                err2b.source = "sifix"
                throw err2b
              }
              // User chose to proceed anyway, continue to wallet
            } else {
              // Analysis successful, show result
              console.log("[SIFIX] Showing result modal...")
              var proceed = await showResult(method, tx, analysis)
              console.log("[SIFIX] User decision:", proceed ? "PROCEED" : "CANCEL")
              
              if (!proceed) {
                var err3 = new Error("Transaction blocked by SIFIX")
                err3.code = 4900
                err3.source = "sifix"
                throw err3
              }
            }
          } catch (e) {
            hideLoading()
            
            // If user already cancelled, just throw
            if (e && (e.code === 4900 || e.source === "sifix")) throw e
            
            // Otherwise show error modal
            console.error("[SIFIX] Analysis/interceptor error:", e && e.message ? e.message : e)
            
            var errorTitle = "Analysis Error"
            var errorMessage = "An unexpected error occurred during analysis: " + (e && e.message ? e.message : "Unknown error")
            var errorDetails = e && e.stack ? e.stack.split('\n')[0] : ""
            
            var proceedAnyway = await showError(errorTitle, errorMessage, errorDetails)
            if (!proceedAnyway) {
              var err4 = new Error("Transaction cancelled by user after error")
              err4.code = 4900
              err4.source = "sifix"
              throw err4
            }
            // User chose to proceed anyway
          }
        }

        console.log("[SIFIX] forwarding to wallet:", method)
      }

      return target.request(args)
    })()
  }

  function patchDirectProviderMethods(provider) {
    if (!provider || typeof provider !== "object") return provider
    if (provider.__sifixDirectPatched) return provider

    try {
      var originalRequest = typeof provider.request === "function" ? provider.request.bind(provider) : null
      if (originalRequest) {
        Object.defineProperty(provider, "request", {
          value: function (args) {
            return interceptMethodCall({ request: originalRequest }, "request", args)
          },
          configurable: true,
          writable: true,
        })
      }
    } catch (e) {
      console.warn("[SIFIX] Failed to patch provider.request directly:", e)
    }

    try {
      if (typeof provider.send === "function") {
        var originalSend = provider.send.bind(provider)
        Object.defineProperty(provider, "send", {
          value: function (methodOrPayload, paramsOrCallback) {
            if (typeof methodOrPayload === "string") {
              return interceptMethodCall({ request: function (args) { return originalSend(args.method, args.params) } }, "send", {
                method: methodOrPayload,
                params: Array.isArray(paramsOrCallback) ? paramsOrCallback : [],
              })
            }
            return originalSend(methodOrPayload, paramsOrCallback)
          },
          configurable: true,
          writable: true,
        })
      }
    } catch (e) {
      console.warn("[SIFIX] Failed to patch provider.send directly:", e)
    }

    try {
      if (typeof provider.sendAsync === "function") {
        var originalSendAsync = provider.sendAsync.bind(provider)
        Object.defineProperty(provider, "sendAsync", {
          value: function (payload, callback) {
            var method = payload && payload.method
            var params = payload && payload.params
            interceptMethodCall({
              request: function (args) {
                return new Promise(function (resolve, reject) {
                  originalSendAsync({
                    id: payload && payload.id,
                    jsonrpc: (payload && payload.jsonrpc) || "2.0",
                    method: args.method,
                    params: args.params,
                  }, function (err, result) {
                    if (err) reject(err)
                    else resolve(result)
                  })
                })
              }
            }, "sendAsync", { method: method, params: params }).then(function (result) {
              if (typeof callback === "function") callback(null, result)
            }).catch(function (err) {
              if (typeof callback === "function") callback(err)
            })
          },
          configurable: true,
          writable: true,
        })
      }
    } catch (e) {
      console.warn("[SIFIX] Failed to patch provider.sendAsync directly:", e)
    }

    try { Object.defineProperty(provider, "__sifixDirectPatched", { value: true, configurable: true }) } catch (_) {}
    return provider
  }

  function buildWrappedProvider(original) {
    if (!original || typeof original !== "object") return original
    if (original.__sifixWrapped) return original
    if (wrappedProviders.has(original)) return wrappedProviders.get(original)

    patchDirectProviderMethods(original)

    var proxied = new Proxy(original, {
      get: function (target, prop) {
        if (prop === "request") {
          return async function (args) {
            return interceptMethodCall(target, "request", args)
          }
        }

        var value = target[prop]
        return typeof value === "function" ? value.bind(target) : value
      }
    })

    try { Object.defineProperty(proxied, "__sifixWrapped", { value: true, configurable: true }) } catch (_) {}
    wrappedProviders.set(original, proxied)
    return proxied
  }

  function installEthereumHook(provider) {
    try {
      if (!provider) return false
      if (provider.providers && Array.isArray(provider.providers)) {
        provider.providers = provider.providers.map(function (p) { return patchDirectProviderMethods(p) })
      }
      patchDirectProviderMethods(provider)
      currentProvider = buildWrappedProvider(provider)

      Object.defineProperty(window, "ethereum", {
        get: function () { return currentProvider },
        set: function (newVal) {
          console.log("[SIFIX] Provider set/re-injected, re-wrapping...")
          currentProvider = buildWrappedProvider(newVal)
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
      installEthereumHook(window.ethereum)
    }

    window.addEventListener("ethereum#initialized", function () {
      if (window.ethereum) installEthereumHook(window.ethereum)
    })

    window.addEventListener("eip6963:announceProvider", function (event) {
      try {
        var provider = event && event.detail && event.detail.provider
        if (provider) {
          console.log("[SIFIX] EIP-6963 provider announced")
          installEthereumHook(provider)
        }
      } catch (e) {
        console.warn("[SIFIX] EIP-6963 hook failed:", e)
      }
    })

    window.dispatchEvent(new Event("eip6963:requestProvider"))

    var tries = 0
    var poll = setInterval(function () {
      if (window.ethereum) {
        installEthereumHook(window.ethereum)
      }
      if (++tries > 150) clearInterval(poll)
    }, 200)
  }

  waitForEthereum()
})()
