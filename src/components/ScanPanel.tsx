import { useState } from "react"
import { checkAddress, checkDomain, scanContract } from "../lib/messaging"
import type { ScanResult, DomainCheckResult, ContractScanResult } from "../types"
import { RISK_COLORS, RISK_LABELS } from "../constants"
import { shortenAddress } from "../utils/format"
import { cn } from "../utils/cn"

export function ScanPanel() {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")

  const detectType = (val: string) => {
    if (val.startsWith("0x") && val.length === 42) return "address"
    if (val.endsWith(".eth") || val.endsWith(".sol")) return "ens"
    if (val.includes(".")) return "domain"
    return "address"
  }

  const handleScan = async () => {
    if (!input.trim()) return
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const type = detectType(input.trim())
      let resp: any

      if (type === "domain") {
        resp = await checkDomain(input.trim())
      } else if (type === "ens") {
        resp = await checkAddress(input.trim())
      } else {
        // Could be address or contract — try address first
        resp = await checkAddress(input.trim())
      }

      if (resp?.error) {
        setError(resp.error)
      } else {
        setResult(resp?.data || resp)
      }
    } catch (e: any) {
      setError(e.message || "Scan failed")
    } finally {
      setLoading(false)
    }
  }

  const inputType = detectType(input)
  const typeLabel = inputType === "domain" ? "🌐 Domain" : inputType === "ens" ? "📛 ENS" : "📍 Address"

  return (
    <div className="space-y-3 animate-slide-up">
      <div className="sifix-card">
        <span className="text-xs text-sifix-muted uppercase tracking-wider block mb-2">
          Scanner
        </span>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
              placeholder="Address, ENS, or domain..."
              className="w-full bg-sifix-surface border border-sifix-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-sifix-muted/50 focus:outline-none focus:border-sifix-primary/50"
            />
            {input && (
              <span className="absolute right-2 top-2 text-[10px] text-sifix-muted">
                {typeLabel}
              </span>
            )}
          </div>
          <button
            onClick={handleScan}
            disabled={loading || !input.trim()}
            className={cn(
              "px-4 rounded-lg text-sm font-medium transition-all",
              "bg-sifix-primary hover:bg-sifix-primary-dark text-white",
              (loading || !input.trim()) && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? <span className="sifix-spinner" /> : "Scan"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="sifix-card border-sifix-danger/30 bg-sifix-danger/10">
          <p className="text-xs text-sifix-danger">❌ {error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="sifix-card animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-white">
              {result.address ? shortenAddress(result.address) : result.domain}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{
                color: RISK_COLORS[result.riskLevel] || "#f59e0b",
                backgroundColor: `${RISK_COLORS[result.riskLevel] || "#f59e0b"}20`,
              }}
            >
              {RISK_LABELS[result.riskLevel] || "Unknown"}
            </span>
          </div>

          {/* Risk score bar */}
          <div className="h-2 bg-sifix-surface rounded-full overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${result.riskScore || 0}%`,
                backgroundColor: RISK_COLORS[result.riskLevel] || "#f59e0b",
              }}
            />
          </div>

          {/* Details */}
          <div className="space-y-1.5">
            {result.isVerified !== undefined && (
              <div className="flex justify-between text-[11px]">
                <span className="text-sifix-muted">Verified</span>
                <span className={result.isVerified ? "text-sifix-safe" : "text-sifix-danger"}>
                  {result.isVerified ? "✓ Yes" : "✗ No"}
                </span>
              </div>
            )}
            {result.reportCount !== undefined && (
              <div className="flex justify-between text-[11px]">
                <span className="text-sifix-muted">Reports</span>
                <span className="text-white">{result.reportCount}</span>
              </div>
            )}
            {result.category && (
              <div className="flex justify-between text-[11px]">
                <span className="text-sifix-muted">Category</span>
                <span className="text-white">{result.category}</span>
              </div>
            )}
            {result.reason && (
              <div className="mt-2 p-2 bg-sifix-surface rounded-lg">
                <p className="text-[10px] text-sifix-muted">{result.reason}</p>
              </div>
            )}
            {result.isScam !== undefined && (
              <div className={cn(
                "mt-2 p-2 rounded-lg text-center text-xs font-semibold",
                result.isScam ? "bg-sifix-danger/20 text-sifix-danger" : "bg-sifix-safe/20 text-sifix-safe"
              )}>
                {result.isScam ? "🚨 SCAM DETECTED" : "✅ NO THREATS FOUND"}
              </div>
            )}
          </div>

          {/* Tags */}
          {result.tags && result.tags.length > 0 && (
            <div className="mt-3 pt-2 border-t border-sifix-border">
              <span className="text-[10px] text-sifix-muted uppercase tracking-wider">Community Tags</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {result.tags.map((tag: any, i: number) => (
                  <span
                    key={i}
                    className="text-[9px] px-2 py-0.5 rounded-full bg-sifix-surface text-sifix-text"
                  >
                    {tag.tag}: {tag.label || tag.evidence}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
