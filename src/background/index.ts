/**
 * Background Service Worker
 * Handles transaction simulation and AI analysis
 */

import { SecurityAgent } from "@sifix/agent"
import type { Address, Hash } from "viem"

// Initialize agent
let agent: SecurityAgent | null = null

async function initAgent() {
  if (!agent) {
    agent = new SecurityAgent({
      rpcUrl: process.env.PLASMO_PUBLIC_RPC_URL || "https://evmrpc-testnet.0g.ai",
      openaiApiKey: process.env.PLASMO_PUBLIC_OPENAI_API_KEY || "",
      zeroGStorageUrl: process.env.PLASMO_PUBLIC_ZEROG_STORAGE_URL || ""
    })
  }
  return agent
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SIMULATE_TRANSACTION") {
    handleSimulation(message.payload)
      .then(sendResponse)
      .catch((error) => {
        console.error("[SIFIX] Simulation error:", error)
        sendResponse({
          risk: "UNKNOWN",
          analysis: "Simulation failed. Proceed with caution.",
          warnings: [error.message]
        })
      })
    return true // Keep channel open for async response
  }

  if (message.type === "QUERY_REPUTATION") {
    handleReputationQuery(message.payload)
      .then(sendResponse)
      .catch((error) => {
        console.error("[SIFIX] Reputation query error:", error)
        sendResponse({ risk: "UNKNOWN", score: 0 })
      })
    return true
  }

  if (message.type === "GET_CHAIN_ID") {
    // Return chain ID from active tab
    sendResponse({ chainId: 16600 }) // 0G testnet
    return true
  }
})

/**
 * Handle transaction simulation
 */
async function handleSimulation(payload: {
  method: string
  params: any[]
}): Promise<{
  risk: string
  analysis: string
  warnings: string[]
  gasEstimate?: string
  riskScore?: number
}> {
  const { method, params } = payload

  console.log("[SIFIX] Starting simulation:", method)

  // Extract transaction data
  const tx = method === "eth_sendTransaction" ? params[0] : null

  if (!tx) {
    // For signature requests, do basic analysis
    return {
      risk: "MEDIUM",
      riskScore: 50,
      analysis:
        "This is a signature request. Make sure you trust the dApp before signing.",
      warnings: [
        "Signatures can authorize token transfers",
        "Always verify the message content"
      ]
    }
  }

  try {
    // Initialize agent
    const securityAgent = await initAgent()

    // Run full analysis
    const result = await securityAgent.analyzeTransaction({
      from: tx.from as Address,
      to: tx.to as Address,
      data: (tx.data || "0x") as Hash,
      value: tx.value ? BigInt(tx.value) : BigInt(0)
    })

    // Map risk score to risk level
    const riskScore = result.analysis.riskScore
    let riskLevel: string
    if (riskScore >= 80) riskLevel = "CRITICAL"
    else if (riskScore >= 60) riskLevel = "HIGH"
    else if (riskScore >= 40) riskLevel = "MEDIUM"
    else if (riskScore >= 20) riskLevel = "LOW"
    else riskLevel = "SAFE"

    // Extract warnings from analysis
    const warnings: string[] = []
    if (result.analysis.recommendation === "BLOCK") {
      warnings.push("⛔ Transaction blocked by AI analysis")
    }
    if (!result.simulation.success) {
      warnings.push("⚠️ Simulation failed - transaction may revert")
    }
    if (result.threatIntel) {
      warnings.push(`🚨 Known threat detected (score: ${result.threatIntel.riskScore}/100)`)
    }

    return {
      risk: riskLevel,
      riskScore: riskScore,
      analysis: result.analysis.reasoning || "Transaction analyzed successfully.",
      warnings: warnings.length > 0 ? warnings : ["No major risks detected"],
      gasEstimate: tx.gas
    }
  } catch (error) {
    console.error("[SIFIX] Agent analysis failed:", error)

    // Fallback: basic heuristic analysis
    const warnings: string[] = []

    // Check for high value transfer
    if (tx.value && parseInt(tx.value, 16) > 1e18) {
      warnings.push("High value transfer detected (>1 ETH)")
    }

    // Check for contract interaction
    if (tx.data && tx.data !== "0x") {
      warnings.push("Contract interaction detected")
    }

    // Check for unknown recipient
    if (tx.to && !isKnownContract(tx.to)) {
      warnings.push("Recipient address is not a known contract")
    }

    return {
      risk: warnings.length > 1 ? "HIGH" : "MEDIUM",
      riskScore: warnings.length > 1 ? 70 : 50,
      analysis:
        "Basic security check completed. " +
        (warnings.length > 0
          ? "Some risks detected."
          : "No obvious risks found."),
      warnings
    }
  }
}

/**
 * Handle reputation query
 */
async function handleReputationQuery(payload: { address: string }): Promise<{
  risk: string
  score: number
  reports?: number
}> {
  const { address } = payload

  try {
    // TODO: Query on-chain reputation contract
    // For now, return unknown
    return {
      risk: "UNKNOWN",
      score: 0
    }
  } catch (error) {
    console.error("[SIFIX] Reputation query failed:", error)
    return {
      risk: "UNKNOWN",
      score: 0
    }
  }
}

/**
 * Check if address is a known contract
 */
function isKnownContract(address: string): boolean {
  const knownContracts = [
    "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", // Uniswap V2 Router
    "0xe592427a0aece92de3edee1f18e0157c05861564", // Uniswap V3 Router
    "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45", // Uniswap Universal Router
    "0x1111111254eeb25477b68fb85ed929f73a960582", // 1inch Router
    "0xdef1c0ded9bec7f1a1670819833240f027b25eff" // 0x Exchange Proxy
  ]

  return knownContracts.includes(address.toLowerCase())
}

console.log("[SIFIX] Background worker initialized with SecurityAgent ✅")
