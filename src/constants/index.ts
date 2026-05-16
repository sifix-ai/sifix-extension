// SIFIX Constants

import process from "process"

export const MSG = {
  // Wallet
  GET_WALLET_STATE: "SIFIX_GET_WALLET_STATE",
  CONNECT_WALLET: "SIFIX_CONNECT_WALLET",
  DISCONNECT_WALLET: "SIFIX_DISCONNECT_WALLET",
  SWITCH_CHAIN: "SIFIX_SWITCH_CHAIN",

  // Scanning (via dApp API)
  CHECK_ADDRESS: "SIFIX_CHECK_ADDRESS",
  CHECK_DOMAIN: "SIFIX_CHECK_DOMAIN",
  SCAN_CONTRACT: "SIFIX_SCAN_CONTRACT",

  // Tags & Voting (via dApp API)
  GET_ADDRESS_TAGS: "SIFIX_GET_ADDRESS_TAGS",
  SUBMIT_ADDRESS_TAG: "SIFIX_SUBMIT_ADDRESS_TAG",
  VOTE_ADDRESS_TAG: "SIFIX_VOTE_ADDRESS_TAG",

  // TX Interception
  TX_INTERCEPTED: "SIFIX_TX_INTERCEPTED",
  TX_VERDICT: "SIFIX_TX_VERDICT",
  GET_RECENT_TXS: "SIFIX_GET_RECENT_TXS",

  // Domain Safety
  CHECK_DAPP: "SIFIX_CHECK_DAPP",
  GET_PAGE_STATUS: "SIFIX_GET_PAGE_STATUS",

  // Stats
  GET_STATS: "SIFIX_GET_STATS",

  // Settings (extension local only)
  GET_SETTINGS: "SIFIX_GET_SETTINGS",
  UPDATE_SETTINGS: "SIFIX_UPDATE_SETTINGS",

  // Content -> Background
  INPAGE_REQUEST: "SIFIX_INPAGE_REQUEST",
  INPAGE_EVENT: "SIFIX_INPAGE_EVENT",
} as const

export const RISK_COLORS: Record<string, string> = {
  SAFE: "#22c55e",
  LOW: "#3b82f6",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
  CRITICAL: "#991b1b",
}

export const RISK_LABELS: Record<string, string> = {
  SAFE: "Safe",
  LOW: "Low Risk",
  MEDIUM: "Medium Risk",
  HIGH: "High Risk",
  CRITICAL: "Critical",
}

export const TAG_COLORS: Record<string, string> = {
  scammer: "#ef4444",
  suspicious: "#f59e0b",
  verified: "#22c55e",
  bot: "#8b5cf6",
  personal: "#3b82f6",
}

export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  11155111: "Sepolia",
  8453: "Base",
  137: "Polygon",
  42161: "Arbitrum",
  10: "Optimism",
  16600: "0G Galileo Testnet",
  16601: "0G Galileo Mainnet",
}

export const DEFAULT_SETTINGS = {
  protectionEnabled: true,
  autoBlockHighRisk: false,
  notifications: true,
  // Production API URL - change to localhost for development
  dappApiUrl: "https://sifix.vercel.app/api/v1",
}

// ── Known Scam Domains (Local Blacklist) ─────────────
export const KNOWN_SCAM_DOMAINS: string[] = [
  // Fake Uniswap
  "uiniswap.com", "uniswap-claiming.com", "uniswaps.org", "uniswap-airdrop.com", "app-uniswap.org",
  // Fake MetaMask
  "metamask-io.com", "metamask-wallet.net", "metamaski.io", "connect-metamask.com",
  // Fake Coinbase
  "coinbase-wallet.net", "coinbaase.com", "coinbase-verify.com",
  // Fake Base
  "base-airdrop.com", "base-chain.net", "basescan-verify.com", "base-claim.xyz",
  // Fake OpenSea
  "openseea.io", "opensea-verify.com",
  // Fake Aave
  "aave-app.com", "aave-protocol.net",
  // General crypto phishing
  "eth-reward.com", "free-eth-airdrop.com", "wallet-connect.net",
  "walletconnect-bridge.com", "dapp-approve.com", "token-approve.com",
  "nft-mint-free.com", "claimairdrop.xyz", "claim-rewards.xyz",
  "defi-staking.net", "pancakeswap-v3.com", "sushiswap-app.com",
]

// ── Known Safe Domains ───────────────────────────────
export const KNOWN_SAFE_DOMAINS: string[] = [
  // Block explorers
  "etherscan.io", "basescan.org", "polygonscan.com", "arbiscan.io", "optimistic.etherscan.io",
  // DEXs
  "app.uniswap.org", "uniswap.org", "app.sushi.com", "pancakeswap.finance", "aerodrome.finance",
  "curve.fi", "balancer.fi", "1inch.io",
  // Lending
  "app.aave.com", "aave.com", "compound.finance",
  // Base ecosystem
  "base.org", "bridge.base.org",
  // NFT
  "opensea.io", "zora.co", "blur.io",
  // Wallets & infra
  "metamask.io", "coinbase.com", "walletconnect.com", "safe.global",
  // General
  "github.com", "google.com", "x.com", "twitter.com", "discord.com",
]
