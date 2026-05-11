/**
 * SIFIX Extension API Client
 * All requests go through dApp API with Bearer token auth
 */

import { getToken, getApiBase, setToken, clearToken, getWalletFromToken } from "./api"

export { getToken, setToken, clearToken, getWalletFromToken }

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
