export function shortenAddress(address: string, chars = 4): string {
  return address.slice(0, chars + 2) + "..." + address.slice(-chars)
}

export function shortenHash(hash: string, chars = 6): string {
  return hash.slice(0, chars + 2) + "..." + hash.slice(-chars)
}

export function formatTimestamp(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return mins + "m ago"
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours + "h ago"
  const days = Math.floor(hours / 24)
  return days + "d ago"
}

export function formatEthValue(wei: string): string {
  const eth = Number(wei) / 1e18
  return eth.toFixed(eth < 0.001 ? 6 : 4)
}

export function riskFromScore(score: number): string {
  if (score <= 20) return "SAFE"
  if (score <= 40) return "LOW"
  if (score <= 60) return "MEDIUM"
  if (score <= 80) return "HIGH"
  return "CRITICAL"
}
