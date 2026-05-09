/**
 * SIFIX dApp Safety Overlay — Content Script
 *
 * Runs on every page. Detects if current page is a dApp.
 * If so, checks domain safety via background (which caches results).
 * Shows overlay banner for warning/danger domains.
 * Only active when user has authenticated (has token).
 */

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
  // No "world: MAIN" = ISOLATED world with chrome API access
}

const MSG_CHECK_DAPP = "SIFIX_CHECK_DAPP"
const MSG_CHECK_DOMAIN = "SIFIX_CHECK_DOMAIN"

type SafetyLevel = "safe" | "warning" | "danger" | "unknown"

function injectStyles() {
  const style = document.createElement("style")
  style.id = "sifix-overlay-styles"
  style.textContent = `
    @keyframes sifix-slide-down {
      from { transform: translateY(-100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes sifix-slide-up {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .sifix-overlay-safe {
      background: linear-gradient(to right, rgba(17, 255, 153, 0.08), rgba(17, 255, 153, 0.03));
      border-bottom: 1px solid rgba(17, 255, 153, 0.2);
    }
    .sifix-overlay-warning {
      background: linear-gradient(to right, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04));
      border-bottom: 1px solid rgba(245, 158, 11, 0.25);
    }
    .sifix-overlay-danger {
      background: linear-gradient(to right, rgba(239, 68, 68, 0.14), rgba(239, 68, 68, 0.05));
      border-bottom: 1px solid rgba(239, 68, 68, 0.3);
    }
  `
  document.head.appendChild(style)
}

function showOverlay(level: SafetyLevel, reason?: string) {
  // Remove existing overlay
  document.getElementById("sifix-safety-overlay")?.remove()

  if (level === "safe" || level === "unknown") return

  injectStyles()

  const isDanger = level === "danger"
  const accent = isDanger ? "#ef4444" : "#f59e0b"
  const title = isDanger ? "Dangerous Site Detected" : "Proceed with Caution"
  const desc = reason || (isDanger
    ? "This site has been flagged as malicious. Do not connect your wallet or sign transactions."
    : "This site could not be fully verified. Be careful before connecting your wallet.")

  const overlay = document.createElement("div")
  overlay.id = "sifix-safety-overlay"
  overlay.style.cssText = `
    position: fixed; bottom: 16px; right: 16px; z-index: 2147483647;
    width: 340px; max-width: calc(100vw - 32px);
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px 16px; font-family: 'Inter', system-ui, sans-serif;
    border-radius: 14px; border; box-shadow: 0 12px 40px rgba(0,0,0,0.4);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    animation: sifix-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    color: #ededed;
    border-color: ${isDanger ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.25)"};
  `
  overlay.classList.add(isDanger ? "sifix-overlay-danger" : "sifix-overlay-warning")

  // Shield icon SVG
  const shieldSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`

  overlay.innerHTML = `
    <div style="flex-shrink:0; margin-top:1px">${shieldSvg}</div>
    <div style="flex:1; min-width:0; line-height:1.4">
      <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px">
        <span style="font-size:10px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; color:${accent}">
          ${isDanger ? "Danger" : "Warning"}
        </span>
        <span style="font-size:9px; padding:2px 6px; border-radius:4px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.5); font-weight:600">
          SIFIX
        </span>
      </div>
      <div style="font-size:13px; font-weight:600; color:#fff; margin-bottom:3px">${title}</div>
      <div style="font-size:11px; color:rgba(255,255,255,0.6); line-height:1.5">${desc}</div>
    </div>
    <button id="sifix-dismiss" style="
      flex-shrink:0; width:28px; height:28px; border-radius:8px;
      background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08);
      color:rgba(255,255,255,0.5); cursor:pointer; display:flex; align-items:center; justify-content:center;
      font-size:14px; transition: background 0.15s;
    ">&times;</button>
  `

  document.documentElement.appendChild(overlay)

  document.getElementById("sifix-dismiss")?.addEventListener("click", () => {
    overlay.remove()
  })
}

function showSafeIndicator() {
  // Subtle top bar for safe sites — only show briefly
  injectStyles()

  const bar = document.createElement("div")
  bar.id = "sifix-safe-bar"
  bar.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
    height: 3px; background: linear-gradient(to right, #11ff99, #3b9eff);
    transition: opacity 0.5s ease;
  `
  document.documentElement.appendChild(bar)

  // Fade out after 3 seconds
  setTimeout(() => {
    bar.style.opacity = "0"
    setTimeout(() => bar.remove(), 500)
  }, 3000)
}

async function checkSafety() {
  const url = window.location.href
  if (!url.startsWith("http")) return

  // Check if user has authenticated
  try {
    const result = await chrome.storage.local.get(["sifix_token"])
    if (!result.sifix_token) return // Not authenticated, skip
  } catch {
    return
  }

  // Check if protection enabled
  try {
    const result = await chrome.storage.local.get(["sifixProtectionEnabled"])
    if (result.sifixProtectionEnabled === false) return
  } catch { }

  // Request safety check from background
  try {
    const response = await chrome.runtime.sendMessage({
      type: MSG_CHECK_DAPP,
      url,
    })

    if (!response?.level) return

    if (response.level === "safe") {
      showSafeIndicator()
    } else if (response.level === "warning" || response.level === "danger") {
      showOverlay(response.level, response.reason)
    }
  } catch (err) {
    console.warn("[SIFIX] Safety check failed:", err)
  }
}

// Run on load
checkSafety()
