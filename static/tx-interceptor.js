/**
 * SIFIX TX Interceptor — Standalone MAIN world script
 * Injected via chrome.scripting.registerContentScripts from background worker
 * 
 * Hooks window.ethereum.request() via Proxy to intercept transactions
 * and route them through SIFIX AI analysis before reaching the wallet.
 */

(function () {
  "use strict"

  // Methods to intercept
  var TX_METHODS = ["eth_sendTransaction", "eth_signTransaction"]
  var SIGN_METHODS = ["personal_sign", "eth_sign", "eth_signTypedData", "eth_signTypedData_v3", "eth_signTypedData_v4"]

  // ─── API Call via postMessage bridge ────────────────
  function analyzeTx(tx) {
    return new Promise(function (resolve) {
      var requestId = "sifix_" + Date.now() + "_" + Math.random().toString(36).slice(2)

      var handler = function (event) {
        if (event.data && event.data.type === "SIFIX_ANALYSIS_RESULT" && event.data.requestId === requestId) {
          window.removeEventListener("message", handler)
          resolve(event.data.result)
        }
      }
      window.addEventListener("message", handler)

      window.postMessage({
        type: "SIFIX_ANALYZE_TX",
        requestId: requestId,
        tx: tx,
      }, "*")

      setTimeout(function () {
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

  // ─── Loading Overlay ───────────────────────────────
  function showLoading() {
    var el = document.createElement("div")
    el.id = "sifix-loading"
    el.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:2147483646;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"
    el.innerHTML = '<div style="background:#1a1a2e;border-radius:16px;padding:24px 32px;text-align:center"><div style="width:40px;height:40px;border:3px solid #334155;border-top-color:#4ecdc4;border-radius:50%;animation:sifixspin 0.8s linear infinite;margin:0 auto 12px"></div><div style="color:white;font-size:14px;font-weight:500">SIFIX analyzing...</div><div style="color:#64748b;font-size:12px;margin-top:4px">0G Security Agent</div></div><style>@keyframes sifixspin{to{transform:rotate(360deg)}}</style>'
    document.body.appendChild(el)
    return function () { el.remove() }
  }

  // ─── Risk Modal ────────────────────────────────────
  function showRiskModal(method, tx, analysis) {
    return new Promise(function (resolve) {
      document.getElementById("sifix-modal") && document.getElementById("sifix-modal").remove()

      var isDangerous = analysis.riskScore >= 60
      var isWarning = analysis.riskScore >= 40 && analysis.riskScore < 60
      var accent = isDangerous ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e"
      var bg = isDangerous ? "linear-gradient(135deg,#1a0a0a,#2d1010)" : isWarning ? "linear-gradient(135deg,#1a1a0a,#2d2a10)" : "linear-gradient(135deg,#0a1a0a,#102d10)"
      var icon = isDangerous ? "\uD83D\uDED1" : isWarning ? "\u26A0\uFE0F" : "\u2705"
      var title = isDangerous ? "High Risk Transaction!" : isWarning ? "Proceed with Caution" : "Transaction Looks Safe"
      var valEth = tx.value ? (parseInt(tx.value, 16) / 1e18).toFixed(6) : null
      var threatsHtml = (analysis.detectedThreats && analysis.detectedThreats.length)
        ? '<div style="margin-top:10px;border-top:1px solid rgba(255,255,255,0.06);padding-top:10px"><div style="color:#ef4444;font-size:12px;font-weight:600;margin-bottom:6px">Threats Detected:</div>' +
          analysis.detectedThreats.map(function (t) { return '<div style="color:#fca5a5;font-size:12px;margin:3px 0">&bull; ' + t + '</div>' }).join("") +
          '</div>'
        : ""
      var storageHtml = analysis.storageHash
        ? '<div style="background:rgba(78,205,196,0.08);border:1px solid rgba(78,205,196,0.2);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:12px"><span style="color:#4ecdc4;font-weight:600">&#x1F517; Stored on 0G</span><span style="color:#94a3b8;margin-left:8px;font-family:monospace;font-size:10px">' + analysis.storageHash.slice(0, 16) + '...</span></div>'
        : ""
      var providerTag = analysis.provider === "0g-compute"
        ? '<span style="background:rgba(78,205,196,0.15);color:#4ecdc4;padding:4px 8px;border-radius:12px;font-size:10px">0G Compute</span>'
        : ""

      var overlay = document.createElement("div")
      overlay.id = "sifix-modal"
      overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;animation:sifixfi 0.2s ease-out"
      overlay.innerHTML =
        '<style>@keyframes sifixfi{from{opacity:0}to{opacity:1}}@keyframes sifixsl{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}</style>' +
        '<div style="background:' + bg + ';border:1px solid ' + accent + '40;border-radius:20px;padding:28px;max-width:440px;width:92%;box-shadow:0 24px 80px rgba(0,0,0,0.6);animation:sifixsl 0.3s ease-out">' +
          '<div style="text-align:center;margin-bottom:20px">' +
            '<div style="font-size:40px;margin-bottom:8px">' + icon + '</div>' +
            '<h2 style="color:white;margin:0 0 4px;font-size:20px">' + title + '</h2>' +
            '<div style="display:inline-flex;align-items:center;gap:8px;margin-top:8px">' +
              '<span style="background:' + accent + '20;color:' + accent + ';padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">' + analysis.riskLevel + ' &middot; Score ' + analysis.riskScore + '/100</span>' +
              providerTag +
            '</div>' +
          '</div>' +
          '<div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:12px;margin-bottom:16px">' +
            '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px"><span style="color:#94a3b8">From</span><span style="color:#e2e8f0;font-family:monospace;font-size:12px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (tx.from || "-") + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px"><span style="color:#94a3b8">To</span><span style="color:#e2e8f0;font-family:monospace;font-size:12px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (tx.to || "-") + '</span></div>' +
            (valEth ? '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px"><span style="color:#94a3b8">Value</span><span style="color:#e2e8f0;font-family:monospace;font-size:12px">' + valEth + ' ETH</span></div>' : "") +
            '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px"><span style="color:#94a3b8">Method</span><span style="color:#e2e8f0;font-family:monospace;font-size:12px">' + method + '</span></div>' +
          '</div>' +
          '<div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:14px;margin-bottom:16px">' +
            '<div style="color:#cbd5e0;font-size:13px;line-height:1.6">' + (analysis.explanation || "No analysis available.") + '</div>' +
            threatsHtml +
          '</div>' +
          storageHtml +
          '<div style="display:flex;gap:10px">' +
            '<button id="sifix-cancel" style="padding:12px 20px;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#94a3b8;font-weight:600;font-size:14px;cursor:pointer;flex:1">' + (isDangerous ? "Block" : "Cancel") + '</button>' +
            '<button id="sifix-proceed" style="padding:12px 20px;border-radius:10px;border:none;background:' + accent + ';color:white;font-weight:600;font-size:14px;cursor:pointer;flex:1">' + (isDangerous ? "Proceed Anyway (Risky)" : "Proceed") + '</button>' +
          '</div>' +
          '<div style="text-align:center;margin-top:12px;font-size:11px;color:#475569">Protected by SIFIX x 0G Security Agent</div>' +
        '</div>'

      document.body.appendChild(overlay)

      document.getElementById("sifix-cancel").addEventListener("click", function () {
        overlay.remove()
        resolve(false)
      })
      document.getElementById("sifix-proceed").addEventListener("click", function () {
        overlay.remove()
        resolve(true)
      })
    })
  }

  // ─── Proxy Injection ───────────────────────────────
  function doInject() {
    if (!window.ethereum) return false

    try {
      var original = window.ethereum

      var proxied = new Proxy(original, {
        get: function (target, prop) {
          if (prop === "request") {
            return function (args) {
              var method = args.method
              var params = args.params || []
              var isTx = TX_METHODS.indexOf(method) !== -1
              var isSign = SIGN_METHODS.indexOf(method) !== -1

              if (isTx || isSign) {
                console.log("[SIFIX] Intercepted:", method)

                var tx = isTx ? (params[0] || {}) : {}
                var hideLoading = showLoading()

                return analyzeTx(tx).then(function (analysis) {
                  hideLoading()

                  if (!analysis.success && analysis.error) {
                    console.warn("[SIFIX] Analysis failed, allowing:", analysis.error)
                    return target.request(args)
                  }

                  return showRiskModal(method, tx, analysis).then(function (proceed) {
                    if (!proceed) {
                      var err = new Error("Transaction blocked by SIFIX Security Agent")
                      err.code = 4001
                      throw err
                    }
                    return target.request(args)
                  })
                }).catch(function (err) {
                  hideLoading()
                  if (err.code === 4001) throw err
                  console.warn("[SIFIX] Error, allowing tx:", err.message)
                  return target.request(args)
                })
              }

              return target.request(args)
            }
          }

          var value = target[prop]
          if (typeof value === "function") {
            return value.bind(target)
          }
          return value
        }
      })

      Object.defineProperty(window, "ethereum", {
        get: function () { return proxied },
        set: function () { console.log("[SIFIX] Provider re-injection detected") },
        configurable: true,
      })

      console.log("[SIFIX] Transaction interceptor active ✅")
      return true
    } catch (e) {
      console.warn("[SIFIX] Proxy injection failed:", e)
      return false
    }
  }

  // ─── Wait for ethereum provider ────────────────────
  if (window.ethereum) {
    doInject()
  } else {
    var tries = 0
    var interval = setInterval(function () {
      if (window.ethereum) {
        clearInterval(interval)
        doInject()
      }
      tries++
      if (tries > 100) { // 20 seconds
        clearInterval(interval)
        console.log("[SIFIX] No wallet provider found after 20s, stopped watching")
      }
    }, 200)
  }
})()
