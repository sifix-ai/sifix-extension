import { cn } from "../utils/cn"
import { RISK_COLORS } from "../constants"

interface RiskScoreProps {
  score: number
  level: string
  size?: "sm" | "lg"
}

export function RiskScore({ score, level, size = "sm" }: RiskScoreProps) {
  const color = RISK_COLORS[level] || RISK_COLORS.MEDIUM
  const pct = Math.min(100, Math.max(0, score))

  return (
    <div className={cn("sifix-card", size === "lg" && "p-4")}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-sifix-text-40 uppercase tracking-widest font-sans font-medium">
          Risk Score
        </span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-semibold font-body"
          style={{
            color,
            backgroundColor: `${color}20`,
          }}
        >
          {level}
        </span>
      </div>
      <div className="flex items-end gap-1.5">
        <span
          className={cn("font-bold font-mono leading-none", size === "lg" ? "text-3xl" : "text-2xl")}
          style={{ color }}
        >
          {pct}
        </span>
        <span className="text-sifix-text-40 text-xs mb-1 font-mono">/100</span>
      </div>
      {/* Progress bar */}
      <div className="mt-2 h-1.5 bg-sifix-card rounded-full overflow-hidden border border-white/[0.04]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
