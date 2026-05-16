import { cn } from "../utils/cn"
import { SifixIcon } from "./SifixIcon"

interface StatsCardProps {
  stats: {
    total: number
    approved: number
    blocked: number
    simulated: number
  }
}

const StatIcon = ({ type }: { type: string }) => {
  if (type === "total") return <span className="text-sm">Σ</span>
  if (type === "approved") return <span className="text-sm">✓</span>
  if (type === "blocked") return <SifixIcon size={14} />
  if (type === "simulated") return <span className="text-sm">◉</span>
  return null
}

export function StatsCard({ stats }: StatsCardProps) {
  const items = [
    { label: "Total", value: stats.total, type: "total", color: "text-sifix-text", gradient: "from-violet-500/10 to-transparent" },
    { label: "Approved", value: stats.approved, type: "approved", color: "text-sifix-safe", gradient: "from-green-500/10 to-transparent" },
    { label: "Blocked", value: stats.blocked, type: "blocked", color: "text-sifix-danger", gradient: "from-red-500/10 to-transparent" },
    { label: "Simulated", value: stats.simulated, type: "simulated", color: "text-sifix-warn", gradient: "from-amber-500/10 to-transparent" },
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
          <StatIcon type={item.type} />
          <p className={cn("text-lg font-bold font-mono mt-0.5", item.color)}>{item.value}</p>
          <p className="text-[9px] text-sifix-text-40 mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  )
}
