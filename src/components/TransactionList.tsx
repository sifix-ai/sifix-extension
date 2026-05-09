import type { TransactionRecord, TxStatus } from "../types"
import { shortenAddress, formatTimestamp, formatEthValue } from "../utils/format"
import { RISK_COLORS } from "../constants"
import { cn } from "../utils/cn"

interface TransactionListProps {
  transactions: TransactionRecord[]
  loading?: boolean
  limit?: number
}

const statusConfig: Record<TxStatus, { icon: string; color: string; label: string }> = {
  approved: { icon: "✅", color: "text-sifix-safe", label: "Approved" },
  blocked: { icon: "🛡️", color: "text-sifix-danger", label: "Blocked" },
  simulated: { icon: "🧪", color: "text-sifix-warn", label: "Simulated" },
  pending: { icon: "⏳", color: "text-sifix-text-40", label: "Pending" },
}

function TxItem({ tx }: { tx: TransactionRecord }) {
  const s = statusConfig[tx.status]
  const riskColor = RISK_COLORS[tx.riskLevel] || RISK_COLORS.MEDIUM

  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-white/[0.04] last:border-0 animate-slide-up">
      <span className="text-sm mt-0.5">{s.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-semibold font-body", s.color)}>{s.label}</span>
          <span className="text-[10px] text-sifix-text-40 font-mono">{formatTimestamp(tx.timestamp)}</span>
        </div>
        <div className="text-[11px] text-sifix-text-60 mt-0.5 font-mono truncate">
          → {shortenAddress(tx.to)}
          {tx.value && tx.value !== "0x0" && (
            <span className="text-sifix-text ml-1">{formatEthValue(tx.value)} ETH</span>
          )}
        </div>
        {tx.dappOrigin && (
          <span className="text-[9px] text-sifix-text-40">{tx.dappOrigin}</span>
        )}
        {/* Risk bar */}
        <div className="mt-1.5 h-1 bg-sifix-card rounded-full overflow-hidden border border-white/[0.04]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${tx.riskScore}%`, backgroundColor: riskColor }}
          />
        </div>
      </div>
    </div>
  )
}

export function TransactionList({ transactions, loading, limit }: TransactionListProps) {
  const display = limit ? transactions.slice(0, limit) : transactions

  if (loading) {
    return (
      <div className="sifix-card flex items-center justify-center py-6">
        <span className="sifix-spinner" />
      </div>
    )
  }

  if (!display.length) {
    return (
      <div className="sifix-card text-center py-8">
        <span className="text-2xl">📭</span>
        <p className="text-xs text-sifix-text-60 mt-2 font-body">No transactions yet</p>
        <p className="text-[10px] text-sifix-text-40 mt-1">Transactions will appear when you interact with dApps</p>
      </div>
    )
  }

  return (
    <div className="sifix-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-sifix-text-40 uppercase tracking-widest font-sans font-medium">
          Recent Transactions
        </span>
        {limit && transactions.length > limit && (
          <span className="text-[10px] text-sifix-primary font-medium cursor-pointer hover:text-sifix-primary-light transition-colors">
            View all →
          </span>
        )}
      </div>
      <div>
        {display.map((tx) => (
          <TxItem key={tx.id || tx.hash || tx.timestamp} tx={tx} />
        ))}
      </div>
    </div>
  )
}
