/**
 * SIFIX Extension API Client
 * All requests go through dApp API with Bearer token auth
 */

// Default — overridden by settings from chrome.storage
let API_BASE = "http://localhost:3001/api/v1"

// Load saved API base on init
;(async () => {
  try {
    const result = await chrome.storage.local.get(["settings"])
    if (result.settings?.dappApiUrl) {
      API_BASE = result.settings.dappApiUrl
    }
  } catch {}
})()

async function getApiBase(): Promise<string> {
  try {
    const result = await chrome.storage.local.get(["settings"])
    if (result.settings?.dappApiUrl) {
      API_BASE = result.settings.dappApiUrl
    }
  } catch {}
  return API_BASE
}

// Token storage helpers
export async function getToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["sifix_token"], (result) => {
      resolve(result.sifix_token || null)
    })
  })
}

export async function setToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ sifix_token: token }, resolve)
  })
}

export async function clearToken(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove("sifix_token", resolve)
  })
}

export async function getWalletFromToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["sifix_wallet"], (result) => {
      resolve(result.sifix_wallet || null)
    })
  })
}

// Helper to make authenticated API calls
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  return fetch(url, { ...options, headers })
}

// ============================================
// AUTH ENDPOINTS (no token needed)
// ============================================

export async function getNonce(walletAddress: string): Promise<{ nonce: string; message: string; timestamp: number }> {
  const base = await getApiBase()
  const resp = await fetch(`${base}/auth/nonce?walletAddress=${walletAddress}`)
  return resp.json()
}

export async function verifySignature(payload: {
  walletAddress: string
  signature: string
  message: string
}): Promise<{ success: boolean; token: string; walletAddress: string; expiresAt: string }> {
  const base = await getApiBase()
  const resp = await fetch(`${base}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return resp.json()
}

export async function checkAuth(): Promise<{ valid: boolean; walletAddress?: string }> {
  const base = await getApiBase()
  const resp = await authFetch(`${base}/auth/verify-token`)
  return resp.json()
}

// ============================================
// PROTECTED EXTENSION ENDPOINTS (token required)
// ============================================

export async function extensionScan(address: string) {
  const base = await getApiBase()
  const resp = await authFetch(`${base}/extension/scan`, {
    method: "POST",
    body: JSON.stringify({ address }),
  })
  return resp.json()
}

export async function extensionAnalyze(payload: {
  from: string
  to: string
  data?: string
  value?: string
}) {
  const base = await getApiBase()
  const resp = await authFetch(`${base}/extension/analyze`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return resp.json()
}

export async function extensionGetSettings() {
  const base = await getApiBase()
  const resp = await authFetch(`${base}/extension/settings`)
  return resp.json()
}

export async function extensionSubmitTag(payload: {
  address: string
  tag: string
  label: string
  evidence: string
  submittedBy: string
}) {
  const base = await getApiBase()
  const resp = await authFetch(`${base}/threats/report`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return resp.json()
}

export async function extensionGetStats() {
  const base = await getApiBase()
  const resp = await authFetch(`${base}/stats`)
  return resp.json()
}
