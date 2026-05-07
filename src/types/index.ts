// SIFIX Types

export type SafetyLevel = "safe" | "warning" | "danger" | "unknown"
export type RiskLevel = "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
export type TagType = "scammer" | "suspicious" | "verified" | "bot" | "personal"
export type TxStatus = "approved" | "blocked" | "simulated" | "pending"

export interface WalletState {
  address: string | null
  chainId: number | null
  connected: boolean
  balance?: string | null
}

export interface TransactionRecord {
  id?: number
  hash?: string
  from: string
  to: string
  value: string
  data?: string
  chainId: number
  status: TxStatus
  riskScore: number
  riskLevel: RiskLevel
  riskFactors: string[]
  aiExplanation?: string
  timestamp: number
  dappOrigin: string
  blockedReason?: string
  simulationResult?: SimulationResult
}

export interface SimulationResult {
  gasUsed: number
  balanceChanges: BalanceChange[]
  tokenTransfers: TokenTransfer[]
}

export interface BalanceChange {
  token: string
  symbol: string
  amount: string
  direction: "in" | "out"
}

export interface TokenTransfer {
  token: string
  symbol: string
  amount: string
  from: string
  to: string
}

export interface AddressTag {
  id?: string
  address: string
  tag: TagType
  label?: string
  evidence?: string
  submittedBy?: string
  votesUp: number
  votesDown: number
  createdAt?: string
}

export interface ScanResult {
  address: string
  inputType: "address" | "ens" | "domain"
  riskScore: number
  riskLevel: RiskLevel
  isVerified: boolean
  reportCount: number
  tags?: AddressTag[]
}

export interface ContractScanResult {
  address: string
  riskScore: number
  level: SafetyLevel
  checks: ContractCheck[]
}

export interface ContractCheck {
  key: string
  label: string
  status: SafetyLevel
  reason: string
}

export interface DomainCheckResult {
  domain: string
  isScam: boolean
  riskScore: number
  category?: string
  reason?: string
}

export interface PlatformStats {
  scamCount: number
  checkCount: number
  blockedCount: number
}

// dApp connection settings - NO AI config here
export interface ExtensionSettings {
  protectionEnabled: boolean
  autoBlockHighRisk: boolean
  notifications: boolean
  dappApiUrl: string  // dApp backend URL
}

export type ActivePanel = "overview" | "scan" | "history" | "tag" | "settings"

// dApp AI settings (read-only for extension display)
export interface DappAiSettings {
  walletAddress: string
  aiProvider: string
  hasCustomProvider: boolean
  aiModel: string | null
  hasApiKey: boolean
}
