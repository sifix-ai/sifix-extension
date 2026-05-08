/**
 * SIFIX Background Service Worker
 * Handles messaging between popup, content scripts, and APIs
 */

import { MSG, DEFAULT_SETTINGS, CHAIN_NAMES } from "../constants"
import type { WalletState, ExtensionSettings } from "../types"

// ─── State ──────────────────────────────────────────
let walletState: WalletState = { address: null, chainId: null, connected: false, balance: null }
let settings: ExtensionSettings = { ...DEFAULT_SETTINGS }

// ─── Init ───────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ settings, walletState })
  console.log("[SIFIX] Extension installed")
  registerTxInterceptor()
})

// Register MAIN world content script on startup too
registerTxInterceptor()

/**
 * Register the tx-interceptor as a MAIN world content script.
 * Plasmo v0.88 doesn't properly register world:"MAIN" scripts in manifest,
 * so we register it programmatically via chrome.scripting API.
 */
async function registerTxInterceptor() {
  try {
    // Unregister first to avoid duplicates
    await chrome.scripting.unregisterContentScripts({ ids: ["sifix-tx-interceptor"] }).catch(() => {})
    
    await chrome.scripting.registerContentScripts([{
      id: "sifix-tx-interceptor",
      matches: ["http://*/*", "https://*/*"],
      js: ["static/tx-interceptor.js"],
      world: "MAIN" as any,
      runAt: "document_start" as any,
    }])
    console.log("[SIFIX] TX interceptor registered (MAIN world)")
  } catch (err) {
    console.error("[SIFIX] Failed to register tx-interceptor:", err)
  }
}

// Load persisted state
chrome.storage.local.get(["walletState", "settings"], (result) => {
  if (result.walletState) walletState = result.walletState
  if (result.settings) settings = { ...DEFAULT_SETTINGS, ...result.settings }
})

// ─── Message Handler ────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {

    // ─── Wallet ──────────────────────────────
    case MSG.GET_WALLET_STATE: {
      chrome.storage.local.get("walletState", (r) => {
        sendResponse({ data: r.walletState || walletState })
      })
      return true
    }

    case MSG.CONNECT_WALLET: {
      handleConnectWallet(sender)
        .then((state) => sendResponse({ data: state }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    case MSG.DISCONNECT_WALLET: {
      walletState = { address: null, chainId: null, connected: false, balance: null }
      chrome.storage.local.set({ walletState })
      sendResponse({ data: walletState })
      return false
    }

    // ─── Scanning ────────────────────────────
    case MSG.CHECK_ADDRESS: {
      handleCheckAddress(message.address)
        .then((data) => sendResponse({ data }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    case MSG.CHECK_DOMAIN: {
      handleCheckDomain(message.domain)
        .then((data) => sendResponse({ data }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    case MSG.SCAN_CONTRACT: {
      handleScanContract(message.address)
        .then((data) => sendResponse({ data }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    // ─── Tags & Voting ──────────────────────
    case MSG.GET_ADDRESS_TAGS: {
      handleGetTags(message.address)
        .then((data) => sendResponse({ data }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    case MSG.SUBMIT_ADDRESS_TAG: {
      handleSubmitTag(message.payload)
        .then((data) => sendResponse({ data }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    case MSG.VOTE_ADDRESS_TAG: {
      handleVoteTag(message.tagId, message.direction)
        .then((data) => sendResponse({ data }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    // ─── Transactions ────────────────────────
    case MSG.GET_RECENT_TXS: {
      handleGetRecentTxs(message.limit || 20)
        .then((data) => sendResponse({ data }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    // ─── Page Status ─────────────────────────
    case MSG.GET_PAGE_STATUS: {
      handleGetPageStatus(sender)
        .then((data) => sendResponse({ data }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    // ─── Settings ────────────────────────────
    case MSG.GET_SETTINGS: {
      sendResponse({ data: settings })
      return false
    }

    case MSG.UPDATE_SETTINGS: {
      settings = { ...settings, ...message.settings }
      chrome.storage.local.set({ settings })
      sendResponse({ data: settings })
      return false
    }

    // ─── Stats ───────────────────────────────
    case MSG.GET_STATS: {
      handleGetStats()
        .then((data) => sendResponse({ data }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    default:
      return false
  }
})

// ─── Handlers ───────────────────────────────────────

async function handleConnectWallet(sender: chrome.runtime.MessageSender): Promise<WalletState> {
  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error("No active tab")

  // Inject script to connect wallet via window.ethereum
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: () => {
      return new Promise((resolve) => {
        if (!window.ethereum) {
          resolve({ error: "No wallet detected. Install MetaMask or another Web3 wallet." })
          return
        }
        window.ethereum
          .request({ method: "eth_requestAccounts" })
          .then((accounts: string[]) => {
            const chainId = window.ethereum.chainId
            resolve({
              address: accounts[0] || null,
              chainId: chainId ? parseInt(chainId, 16) : null,
              connected: true,
            })
          })
          .catch((err: any) => resolve({ error: err.message }))
      })
    },
  })

  const result = results?.[0]?.result as any
  if (result?.error) throw new Error(result.error)

  walletState = {
    address: result.address,
    chainId: result.chainId,
    connected: result.connected,
    balance: null,
  }

  // Get balance
  if (walletState.address) {
    try {
      const balance = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: (addr: string) => {
          return window.ethereum.request({
            method: "eth_getBalance",
            params: [addr, "latest"],
          })
        },
        args: [walletState.address],
      })
      const bal = balance?.[0]?.result as string
      if (bal) {
        walletState.balance = (parseInt(bal, 16) / 1e18).toFixed(4)
      }
    } catch {}
  }

  chrome.storage.local.set({ walletState })
  return walletState
}

async function handleCheckAddress(address: string) {
  // TODO: Connect to SIFIX API + GoPlus
  // For now return mock data
  const isKnown = address.toLowerCase().startsWith("0x")
  return {
    address,
    inputType: "address",
    riskScore: 25,
    riskLevel: "LOW",
    isVerified: false,
    reportCount: 0,
    tags: [],
  }
}

async function handleCheckDomain(domain: string) {
  // TODO: Connect to SIFIX API
  // For now return mock
  return {
    domain,
    isScam: false,
    riskScore: 10,
    category: "unchecked",
    reason: "Domain not yet checked by community",
  }
}

async function handleScanContract(address: string) {
  // TODO: Connect to SIFIX agent for bytecode analysis
  return {
    address,
    riskScore: 30,
    level: "unknown",
    checks: [
      { key: "verified", label: "Contract Verified", status: "unknown", reason: "Not checked yet" },
      { key: "honeypot", label: "Honeypot Check", status: "safe", reason: "No honeypot patterns detected" },
      { key: "ownership", label: "Ownership Risk", status: "unknown", reason: "Not checked yet" },
    ],
  }
}

async function handleGetTags(address: string) {
  // TODO: Query from SIFIX API + 0G Storage
  return []
}

async function handleSubmitTag(payload: any) {
  // TODO: Submit to SIFIX API + on-chain via ScamReporter contract
  console.log("[SIFIX] Tag submitted:", payload)
  return { success: true, tag: payload }
}

async function handleVoteTag(tagId: string, direction: "up" | "down") {
  // TODO: Submit vote to SIFIX API + on-chain
  return { success: true, tagId, direction }
}

async function handleGetRecentTxs(limit: number) {
  // Read from IndexedDB in background context
  try {
    const { getRecentTransactions } = await import("../lib/db")
    return await getRecentTransactions(limit)
  } catch {
    return []
  }
}

async function handleGetPageStatus(sender: chrome.runtime.MessageSender) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const url = tab?.url || ""
    const domain = url ? new URL(url).hostname : ""

    // TODO: Check domain against local blacklist + SIFIX API
    return {
      safety: "unknown" as const,
      reason: "Not yet checked",
      domain,
    }
  } catch {
    return { safety: "unknown", reason: "", domain: "" }
  }
}

async function handleGetStats() {
  try {
    const { getTxStats } = await import("../lib/db")
    return await getTxStats()
  } catch {
    return { total: 0, approved: 0, blocked: 0, simulated: 0 }
  }
}
