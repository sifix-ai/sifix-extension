/**
 * SIFIX Content Script — Auth Bridge
 * Listens for postMessage from dApp extension setup page
 * and stores the token in chrome.storage.local
 *
 * dApp sends: window.postMessage({ type: 'SIFIX_EXTENSION_TOKEN', token, walletAddress }, '*')
 */

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["http://localhost:*/*", "https://*.vercel.app/*"],
  run_at: "document_idle",
}

window.addEventListener("message", (event) => {
  // Only accept from same origin (dApp)
  if (event.source !== window) return
  if (event.data?.type !== "SIFIX_EXTENSION_TOKEN") return

  const { token, walletAddress } = event.data

  if (!token) return

  console.log("[SIFIX] Received extension token from dApp")

  chrome.storage.local.set(
    {
      sifix_token: token,
      sifix_wallet: walletAddress || null,
    },
    () => {
      console.log("[SIFIX] Token saved to chrome.storage")
      // Notify popup to refresh
      chrome.runtime.sendMessage({
        type: "SIFIX_TOKEN_RECEIVED",
        token,
        walletAddress,
      }).catch(() => {
        // popup might not be open, that's fine
      })
    }
  )
})
