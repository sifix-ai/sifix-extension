/**
 * SIFIX Extension API Client
 * All requests go through dApp API with Bearer token auth
 */

const DAPP_API_BASE = process.env.PLASMO_PUBLIC_DAPP_API_URL || "http://localhost:3000/api/v1"

function getApiBase(): string {
  return DAPP_API_BASE
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
  const resp = await fetch(`${getApiBase()}/auth/nonce?walletAddress=${walletAddress}`)
  return resp.json()
}

export async function verifySignature(payload: {
  walletAddress: string
  signature: string
  message: string
}): Promise<{ success: boolean; token: string; walletAddress: string; expiresAt: string }> {
  const resp = await fetch(`${getApiBase()}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return resp.json()
}

export async function checkAuth(): Promise<{ valid: boolean; walletAddress?: string }> {
  const resp = await authFetch(`${getApiBase()}/auth/verify-token`)
  return resp.json()
}

// ============================================
// PROTECTED EXTENSION ENDPOINTS (token required)
// ============================================

export async function extensionScan(address: string) {
  const resp = await authFetch(`${getApiBase()}/extension/scan`, {
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
  const resp = await authFetch(`${getApiBase()}/extension/analyze`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return resp.json()
}

export async function extensionGetSettings() {
  const resp = await authFetch(`${getApiBase()}/extension/settings`)
  return resp.json()
}

export async function extensionSubmitTag(payload: {
  address: string
  tag: string
  label: string
  evidence: string
  submittedBy: string
}) {
  const resp = await authFetch(`${getApiBase()}/threats/report`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return resp.json()
}

export async function extensionGetStats() {
  const resp = await authFetch(`${getApiBase()}/stats`)
  return resp.json()
}
