import { cn } from "../utils/cn"

interface StatsCardProps {
  stats: {
    total: number
    approved: number
    blocked: number
    simulated: number
  }
}

export function StatsCard({ stats }: StatsCardProps) {
  const items = [
    { label: "Total", value: stats.total, icon: "📊", color: "text-white" },
    { label: "Approved", value: stats.approved, icon: "✅", color: "text-sifix-safe" },
    { label: "Blocked", value: stats.blocked, icon: "🛡️", color: "text-sifix-danger" },
    { label: "Simulated", value: stats.simulated, icon: "🧪", color: "text-sifix-warn" },
  ]

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {items.map((item) => (
        <div key={item.label} className="sifix-card text-center py-2">
          <span className="text-sm">{item.icon}</span>
          <p className={cn("text-base font-bold font-mono", item.color)}>{item.value}</p>
          <p className="text-[9px] text-sifix-muted">{item.label}</p>
        </div>
      ))}
    </div>
  )
}
