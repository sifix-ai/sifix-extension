/**
 * SIFIX API Client
 * Connects extension to dApp backend
 */

const API_BASE_URL = process.env.PLASMO_PUBLIC_API_URL || "http://localhost:3001"

export interface ScanResult {
  address: string
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  riskScore: number
  threatCount: number
  lastScan: string
  analysis?: {
    reasoning: string
    recommendation: "PROCEED" | "CAUTION" | "BLOCK"
  }
}

export interface ThreatReport {
  id: string
  address: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  type: string
  description: string
  evidence: string
  reportedAt: string
}

/**
 * Scan address for threats
 */
export async function scanAddress(address: string): Promise<ScanResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address })
  })

  if (!response.ok) {
    throw new Error(`Scan failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Report threat to backend
 */
export async function reportThreat(data: {
  address: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  type: string
  description: string
  evidence: any
}): Promise<ThreatReport> {
  const response = await fetch(`${API_BASE_URL}/api/v1/threats/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error(`Report failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get threat feed
 */
export async function getThreatFeed(limit = 10): Promise<ThreatReport[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/threats?limit=${limit}`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch threats: ${response.statusText}`)
  }

  const data = await response.json()
  return data.threats || []
}

/**
 * Get address reputation from on-chain
 */
export async function getReputation(address: string): Promise<{
  score: number
  reportCount: number
  lastUpdate: string
}> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/reputation/${address}`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch reputation: ${response.statusText}`)
  }

  return response.json()
}
