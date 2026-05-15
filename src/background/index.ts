/**
 * SIFIX Background Service Worker
 *
 * Handles:
 * - Auto domain safety scan on every page load (cached per session)
 * - Auto TX analysis when intercepted
 * - Badge updates per tab (safe/warn/risk)
 * - Messaging between popup, content scripts, and APIs
 */

import { MSG, DEFAULT_SETTINGS, KNOWN_SCAM_DOMAINS, KNOWN_SAFE_DOMAINS } from "../constants"
import type { WalletState, ExtensionSettings, SafetyLevel } from "../types"
import { getToken, getApiBase } from "../lib/api"

// ─── State ──────────────────────────────────────────
let walletState: WalletState = { address: null, chainId: null, connected: false, balance: null }
let settings: ExtensionSettings = { ...DEFAULT_SETTINGS }

// ─── Domain Safety Cache ────────────────────────────
const safetyCache = new Map<string, { level: SafetyLevel; reason?: string; timestamp: number }>()

// ─── Init ───────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ settings, walletState })
  console.log("[SIFIX] Extension installed")
})

// ─── Early TX Interceptor Injection ─────────────────
function maybeInjectInterceptor(details: chrome.webNavigation.WebNavigationCallbackDetails) {
  if (details.frameId !== 0) return
  if (!details.url || !details.url.startsWith("http")) return

  chrome.storage.local.get(["sifix_token", "sifixProtectionEnabled"], (result) => {
    const hasToken = Boolean(result.sifix_token)
    const enabled = typeof result.sifixProtectionEnabled === "boolean" ? result.sifixProtectionEnabled : true

    if (!hasToken || !enabled) {
      return
    }

    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: ["tx-interceptor.js"],
      world: "MAIN" as any,
      injectImmediately: true,
    }).catch(() => { })
  })
}

chrome.webNavigation?.onBeforeNavigate?.addListener(maybeInjectInterceptor)
chrome.webNavigation?.onCommitted?.addListener(maybeInjectInterceptor)
chrome.webNavigation?.onHistoryStateUpdated?.addListener(maybeInjectInterceptor)

// Load persisted state
chrome.storage.local.get(["walletState", "settings"], (result) => {
  if (result.walletState) walletState = result.walletState
  if (result.settings) settings = { ...DEFAULT_SETTINGS, ...result.settings }
})

// ═════════════════════════════════════════════════════
// AUTO DOMAIN SCAN — runs on every tab update
// ═════════════════════════════════════════════════════
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && tab.url?.startsWith("http")) {
    // Only auto-scan if authenticated
    chrome.storage.local.get(["sifix_token", "sifixProtectionEnabled"], (result) => {
      if (!result.sifix_token) return
      if (result.sifixProtectionEnabled === false) return

      handleCheckDapp(tab.url!).then((result) => {
        updateBadge(tabId, result.level, normalizeDomain(tab.url!))
      }).catch(() => {})
    })
  }
})

// ═════════════════════════════════════════════════════
// MESSAGE HANDLER
// ═════════════════════════════════════════════════════
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {

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

    // ─── Domain Safety ───────────────────────
    case MSG.CHECK_DAPP: {
      handleCheckDapp(message.url)
        .then(sendResponse)
        .catch((err) => sendResponse({ level: "unknown", error: err.message }))
      return true
    }

    case MSG.CHECK_DOMAIN: {
      handleCheckDomain(message.domain)
        .then((data) => sendResponse({ data }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    case MSG.GET_PAGE_STATUS: {
      handleGetPageStatus(message.url)
        .then((data) => sendResponse({ data }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    // ─── Address Scanning ────────────────────
    case MSG.CHECK_ADDRESS: {
      handleCheckAddress(message.address)
        .then((data) => sendResponse({ data }))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }

    // ─── Tags ────────────────────────────────
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

// ═════════════════════════════════════════════════════
// DOMAIN SAFETY CHECK
// ═════════════════════════════════════════════════════

function normalizeDomain(url: string): string {
  if (!url) return ""
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0]?.replace(/^www\./, "") || ""
  }
}

/**
 * Check domain safety:
 * 1. Cache (already scanned this session)
 * 2. Local scam blacklist
 * 3. Local safe list
 * 4. SIFIX API /api/v1/check-domain
 * 5. GoPlus phishing API (fallback)
 */
async function handleCheckDapp(url: string): Promise<{ level: SafetyLevel; reason?: string }> {
  if (!url || !url.startsWith("http")) return { level: "unknown" }

  const hostname = normalizeDomain(url)
  if (!hostname) return { level: "unknown" }

  // Cache check
  const cached = safetyCache.get(hostname)
  if (cached) {
    return { level: cached.level, reason: cached.reason }
  }

  // Local scam blacklist
  const isLocalScam = KNOWN_SCAM_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  )
  if (isLocalScam) {
    safetyCache.set(hostname, { level: "danger", reason: "Known scam domain.", timestamp: Date.now() })
    return { level: "danger", reason: "Known scam domain." }
  }

  // Local safe list
  const isLocalSafe = KNOWN_SAFE_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  )

  // SIFIX API check
  const token = await getToken()
  const apiBase = await getApiBase()
  let apiResult: { riskScore?: number; riskLevel?: string; isScam?: boolean } | null = null

  try {
    const headers: Record<string, string> = {}
    if (token) headers["Authorization"] = `Bearer ${token}`

    const resp = await fetch(`${apiBase}/scam-domains/check?domain=${encodeURIComponent(hostname)}`, { headers })
    if (resp.ok) {
      const json = await resp.json()
      apiResult = json.data || json
    }
  } catch {
    apiResult = null
  }

  // API says scam or high risk
  if (apiResult?.isScam || (apiResult?.riskScore ?? 0) >= 80) {
    safetyCache.set(hostname, { level: "danger", reason: "SIFIX flagged this domain as dangerous.", timestamp: Date.now() })
    return { level: "danger", reason: "SIFIX flagged this domain as dangerous." }
  }

  // Moderate risk
  if ((apiResult?.riskScore ?? 0) >= 40) {
    safetyCache.set(hostname, { level: "warning", reason: "Elevated risk detected. Proceed with caution.", timestamp: Date.now() })
    return { level: "warning", reason: "Elevated risk detected. Proceed with caution." }
  }

  // API says safe or local safe
  if (isLocalSafe || (apiResult && (apiResult.riskScore ?? 0) < 40)) {
    safetyCache.set(hostname, { level: "safe", timestamp: Date.now() })
    return { level: "safe" }
  }

  // GoPlus fallback
  try {
    const resp = await fetch(`https://api.gopluslabs.io/api/v1/phishing_site?url=${encodeURIComponent(url)}`)
    if (resp.ok) {
      const data = await resp.json()
      if (data?.result?.phishing_site === 1) {
        safetyCache.set(hostname, { level: "danger", reason: "GoPlus flagged this as a phishing site.", timestamp: Date.now() })
        return { level: "danger", reason: "GoPlus flagged this as a phishing site." }
      }
    }
  } catch { }

  // Default unknown
  safetyCache.set(hostname, { level: "unknown", timestamp: Date.now() })
  return { level: "unknown", reason: "Domain not yet verified." }
}

async function handleCheckDomain(domain: string) {
  const hostname = normalizeDomain(domain)
  if (!hostname) throw new Error("Invalid domain")

  const token = await getToken()
  const apiBase = await getApiBase()

  const headers: Record<string, string> = {}
  if (token) headers["Authorization"] = `Bearer ${token}`

  try {
    const resp = await fetch(`${apiBase}/scan/${encodeURIComponent(hostname)}`, { headers })
    if (resp.ok) {
      const json = await resp.json()
      return json.data || json
    }
  } catch { }

  return { domain: hostname, isScam: false, riskScore: 0, category: "unknown" }
}

async function handleGetPageStatus(url: string) {
  const domain = normalizeDomain(url)
  if (!domain) return { safety: "unknown" as SafetyLevel, reason: "", domain: "" }

  const safety = await handleCheckDapp(url.startsWith("http") ? url : `https://${domain}`)

  return {
    safety: safety.level,
    reason: safety.reason || "",
    domain,
  }
}

// ─── Badge Updates ──────────────────────────────────
function updateBadge(tabId: number | undefined, level: SafetyLevel, hostname?: string) {
  if (!chrome.action) return
  const scope = typeof tabId === "number" ? { tabId } : undefined

  if (level === "safe") {
    chrome.action.setBadgeText({ text: "", ...scope })
    chrome.action.setTitle({ title: `SIFIX — ${hostname || "Site"} is safe`, ...scope })
  } else if (level === "warning") {
    chrome.action.setBadgeText({ text: "!", ...scope })
    chrome.action.setBadgeBackgroundColor({ color: "#f59e0b", ...scope })
    chrome.action.setTitle({ title: `SIFIX — Caution: ${hostname || "this site"}`, ...scope })
  } else if (level === "danger") {
    chrome.action.setBadgeText({ text: "!", ...scope })
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444", ...scope })
    chrome.action.setTitle({ title: `SIFIX — DANGER: ${hostname || "this site"}`, ...scope })
  } else {
    chrome.action.setBadgeText({ text: "", ...scope })
    chrome.action.setTitle({ title: "SIFIX — Transaction Shield", ...scope })
  }
}

// ═════════════════════════════════════════════════════
// WALLET HANDLER
// ═════════════════════════════════════════════════════

async function handleConnectWallet(sender: chrome.runtime.MessageSender): Promise<WalletState> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error("No active tab")

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
    } catch { }
  }

  chrome.storage.local.set({ walletState })
  return walletState
}

// ═════════════════════════════════════════════════════
// API-CONNECTED HANDLERS (no more stubs)
// ═════════════════════════════════════════════════════

async function handleCheckAddress(address: string) {
  const token = await getToken()
  const apiBase = await getApiBase()

  const headers: Record<string, string> = {}
  if (token) headers["Authorization"] = `Bearer ${token}`

  try {
    const resp = await fetch(`${apiBase}/scan/${encodeURIComponent(address)}`, { headers })
    if (resp.ok) {
      const json = await resp.json()
      return json.data || json
    }
  } catch { }

  return { address, inputType: "address", riskScore: 0, riskLevel: "SAFE", isVerified: false, reportCount: 0, tags: [] }
}

async function handleGetTags(address: string) {
  const apiBase = await getApiBase()
  const normalized = address.toLowerCase()

  try {
    const resp = await fetch(`${apiBase}/address/${encodeURIComponent(normalized)}/tags?limit=20`)
    if (resp.ok) {
      const json = await resp.json()
      const payload = json.data || json
      return payload?.tags || []
    }
  } catch { }

  return []
}

async function handleSubmitTag(payload: any) {
  const token = await getToken()
  const apiBase = await getApiBase()

  try {
    const normalized = (payload?.address || "").toLowerCase()
    if (!normalized) return { success: false, error: "Missing address" }

    const resp = await fetch(`${apiBase}/address/${encodeURIComponent(normalized)}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ tag: payload?.tag }),
    })
    if (resp.ok) {
      const json = await resp.json()
      return json.data || json
    }
  } catch { }

  return { success: false }
}

async function handleVoteTag(tagId: string, direction: "up" | "down") {
  const token = await getToken()
  const apiBase = await getApiBase()
  const wallet = walletState.address

  if (!wallet) return { success: false, error: "Wallet not connected" }

  try {
    // Fetch tags from current wallet address context, then find tagId
    const resp = await fetch(`${apiBase}/address/${encodeURIComponent(wallet.toLowerCase())}/tags?limit=100`, {
      headers: { "Authorization": `Bearer ${token}` },
    })
    if (resp.ok) {
      const json = await resp.json()
      const tags = json.data?.tags || []
      const tag = tags.find((t: any) => t.id === tagId)
      if (tag) {
        const voteResp = await fetch(`${apiBase}/address/${encodeURIComponent(wallet.toLowerCase())}/tags/${tagId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ direction }),
        })
        if (voteResp.ok) {
          const voteJson = await voteResp.json()
          return voteJson.data || voteJson
        }
      }
    }
  } catch { }

  return { success: false }
}

async function handleGetRecentTxs(limit: number) {
  try {
    const { getRecentTransactions } = await import("../lib/db")
    return await getRecentTransactions(limit)
  } catch {
    return []
  }
}

async function handleGetStats() {
  const apiBase = await getApiBase()

  try {
    const resp = await fetch(`${apiBase}/stats`)
    if (resp.ok) {
      const json = await resp.json()
      return json.data || json
    }
  } catch { }

  try {
    const { getTxStats } = await import("../lib/db")
    return await getTxStats()
  } catch {
    return { total: 0, approved: 0, blocked: 0, simulated: 0 }
  }
}

console.log("[SIFIX] Background service loaded")
