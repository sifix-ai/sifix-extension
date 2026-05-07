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
  pending: { icon: "⏳", color: "text-sifix-muted", label: "Pending" },
}

function TxItem({ tx }: { tx: TransactionRecord }) {
  const s = statusConfig[tx.status]
  const riskColor = RISK_COLORS[tx.riskLevel] || RISK_COLORS.MEDIUM

  return (
    <div className="flex items-start gap-2 py-2 border-b border-sifix-border/50 last:border-0 animate-slide-up">
      <span className="text-sm mt-0.5">{s.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-semibold", s.color)}>{s.label}</span>
          <span className="text-[10px] text-sifix-muted">{formatTimestamp(tx.timestamp)}</span>
        </div>
        <div className="text-[11px] text-sifix-muted mt-0.5 font-mono truncate">
          → {shortenAddress(tx.to)}
          {tx.value && tx.value !== "0x0" && (
            <span className="text-sifix-text ml-1">{formatEthValue(tx.value)} ETH</span>
          )}
        </div>
        {tx.dappOrigin && (
          <span className="text-[9px] text-sifix-muted/60">{tx.dappOrigin}</span>
        )}
        {/* Risk bar */}
        <div className="mt-1 h-1 bg-sifix-surface rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
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
      <div className="sifix-card text-center py-6">
        <span className="text-2xl">📭</span>
        <p className="text-xs text-sifix-muted mt-2">No transactions yet</p>
        <p className="text-[10px] text-sifix-muted/60">Transactions will appear when you interact with dApps</p>
      </div>
    )
  }

  return (
    <div className="sifix-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-sifix-muted uppercase tracking-wider">
          Recent Transactions
        </span>
        {limit && transactions.length > limit && (
          <span className="text-[10px] text-sifix-primary">View all →</span>
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
