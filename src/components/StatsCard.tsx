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
    { label: "Total", value: stats.total, icon: "📊", color: "text-sifix-text", gradient: "from-violet-500/10 to-transparent" },
    { label: "Approved", value: stats.approved, icon: "✅", color: "text-sifix-safe", gradient: "from-green-500/10 to-transparent" },
    { label: "Blocked", value: stats.blocked, icon: "🛡️", color: "text-sifix-danger", gradient: "from-red-500/10 to-transparent" },
    { label: "Simulated", value: stats.simulated, icon: "🧪", color: "text-sifix-warn", gradient: "from-amber-500/10 to-transparent" },
  ]

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "sifix-card text-center py-2.5 transition-all duration-300 hover:border-white/[0.1]",
            `bg-gradient-to-b ${item.gradient}`
          )}
        >
          <span className="text-sm">{item.icon}</span>
          <p className={cn("text-lg font-bold font-mono mt-0.5", item.color)}>{item.value}</p>
          <p className="text-[9px] text-sifix-text-40 mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  )
}
