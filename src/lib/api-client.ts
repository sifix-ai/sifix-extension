/**
 * SIFIX Extension API Client
 * All requests go through dApp API - no local AI config needed
 */

const DAPP_API_BASE = "http://localhost:3001/api/v1"

function getApiBase(): string {
  // Could be configurable in settings, but default to dApp
  return DAPP_API_BASE
}

export async function extensionScan(address: string, walletAddress: string) {
  const resp = await fetch(getApiBase() + "/extension/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, walletAddress })
  })
  return resp.json()
}

export async function extensionAnalyze(payload: {
  from: string
  to: string
  data?: string
  value?: string
  walletAddress: string
}) {
  const resp = await fetch(getApiBase() + "/extension/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  return resp.json()
}

export async function extensionGetSettings(walletAddress: string) {
  const resp = await fetch(getApiBase() + "/extension/settings?walletAddress=" + walletAddress)
  return resp.json()
}

export async function extensionSubmitTag(payload: {
  address: string
  tag: string
  label: string
  evidence: string
  submittedBy: string
}) {
  const resp = await fetch(getApiBase() + "/threats/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  return resp.json()
}

export async function extensionGetStats() {
  const resp = await fetch(getApiBase() + "/stats")
  return resp.json()
}
