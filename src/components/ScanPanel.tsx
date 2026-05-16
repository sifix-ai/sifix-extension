import { useState } from "react"
import { checkAddress, checkDomain, scanContract } from "../lib/messaging"
import type { ScanResult, DomainCheckResult, ContractScanResult } from "../types"
import { RISK_COLORS, RISK_LABELS } from "../constants"
import { shortenAddress } from "../utils/format"
import { cn } from "../utils/cn"
import { SifixIcon } from "./SifixIcon"

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

  const TypeIcon = () => {
    if (inputType === "domain") return <span>🌐</span>
    if (inputType === "ens") return <span>📛</span>
    return <SifixIcon size={12} />
  }

  return (
    <div className="space-y-3 animate-slide-up">
      <div className="sifix-card">
        <span className="text-[10px] text-sifix-text-40 uppercase tracking-widest font-sans font-medium block mb-2">
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
              className="w-full bg-sifix-bg border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-sifix-text placeholder:text-sifix-text-40 focus:outline-none focus:border-sifix-primary/40 transition-colors font-mono"
            />
            {input && (
              <span className="absolute right-2.5 top-3 text-[10px] text-sifix-text-40 flex items-center gap-1">
                <TypeIcon /> {inputType}
              </span>
            )}
          </div>
          <button
            onClick={handleScan}
            disabled={loading || !input.trim()}
            className={cn(
              "px-4 rounded-xl text-sm font-medium transition-all duration-200",
              "sifix-gradient text-white hover:shadow-glow active:scale-[0.97]",
              (loading || !input.trim()) && "opacity-40 cursor-not-allowed hover:shadow-none"
            )}
          >
            {loading ? <span className="sifix-spinner" /> : "Scan"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="sifix-card border-sifix-danger/20 bg-sifix-danger/5">
          <p className="text-xs text-sifix-danger font-body flex items-center gap-2">
            <span>✗</span> {error}
          </p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="sifix-card animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-sifix-text font-medium">
              {result.address ? shortenAddress(result.address) : result.domain}
            </span>
            <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold font-body"
              style={{
                color: RISK_COLORS[result.riskLevel] || "#f59e0b",
                backgroundColor: `${RISK_COLORS[result.riskLevel] || "#f59e0b"}15`,
              }}
            >
              {RISK_LABELS[result.riskLevel] || "Unknown"}
            </span>
          </div>

          {/* Risk score bar */}
          <div className="h-2 bg-sifix-bg rounded-full overflow-hidden mb-3 border border-white/[0.04]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${result.riskScore || 0}%`,
                backgroundColor: RISK_COLORS[result.riskLevel] || "#f59e0b",
              }}
            />
          </div>

          {/* Details */}
          <div className="space-y-2">
            {result.isVerified !== undefined && (
              <div className="flex justify-between text-[11px]">
                <span className="text-sifix-text-40">Verified</span>
                <span className={result.isVerified ? "text-sifix-safe" : "text-sifix-danger"}>
                  {result.isVerified ? "✓ Yes" : "✗ No"}
                </span>
              </div>
            )}
            {result.reportCount !== undefined && (
              <div className="flex justify-between text-[11px]">
                <span className="text-sifix-text-40">Reports</span>
                <span className="text-sifix-text">{result.reportCount}</span>
              </div>
            )}
            {result.category && (
              <div className="flex justify-between text-[11px]">
                <span className="text-sifix-text-40">Category</span>
                <span className="text-sifix-text">{result.category}</span>
              </div>
            )}
            {result.reason && (
              <div className="mt-2 p-2.5 bg-sifix-bg rounded-xl border border-white/[0.04]">
                <p className="text-[10px] text-sifix-text-60 leading-relaxed">{result.reason}</p>
              </div>
            )}
            {result.isScam !== undefined && (
              <div className={cn(
                "mt-2 p-2.5 rounded-xl text-center text-xs font-semibold font-body flex items-center justify-center gap-2",
                result.isScam ? "bg-sifix-danger/10 text-sifix-danger border border-sifix-danger/20" : "bg-sifix-safe/10 text-sifix-safe border border-sifix-safe/20"
              )}>
                {result.isScam ? (
                  <>
                    <SifixIcon size={16} style={{ filter: "drop-shadow(0 0 4px #ef4444)" }} />
                    <span>SCAM DETECTED</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>NO THREATS FOUND</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          {result.tags && result.tags.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/[0.04]">
              <span className="text-[9px] text-sifix-text-40 uppercase tracking-widest font-sans font-medium">Community Tags</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {result.tags.map((tag: any, i: number) => (
                  <span
                    key={i}
                    className="text-[9px] px-2 py-0.5 rounded-full bg-sifix-bg text-sifix-text-70 border border-white/[0.04] font-body"
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
