import type { SafetyLevel } from "../types"
import { cn } from "../utils/cn"

interface PageSafetyProps {
  safety: SafetyLevel
  reason: string
  domain: string
}

const safetyConfig: Record<SafetyLevel, { color: string; icon: string; label: string; bg: string }> = {
  safe: { color: "text-sifix-safe", icon: "✅", label: "Safe", bg: "bg-sifix-safe/10 border-sifix-safe/20" },
  warning: { color: "text-sifix-warn", icon: "⚠️", label: "Warning", bg: "bg-sifix-warn/10 border-sifix-warn/20" },
  danger: { color: "text-sifix-danger", icon: "🚨", label: "Danger", bg: "bg-sifix-danger/10 border-sifix-danger/20" },
  unknown: { color: "text-sifix-text-40", icon: "❓", label: "Not Checked", bg: "" },
}

export function PageSafety({ safety, reason, domain }: PageSafetyProps) {
  const config = safetyConfig[safety]

  return (
    <div className={cn("sifix-card", config.bg)}>
      <div className="flex items-center gap-2.5">
        <span className="text-base">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-semibold font-body", config.color)}>
              {config.label}
            </span>
            {domain && (
              <span className="text-[10px] text-sifix-text-40 truncate font-mono">
                {domain}
              </span>
            )}
          </div>
          {reason && (
            <p className="text-[10px] text-sifix-text-40 mt-0.5 truncate">{reason}</p>
          )}
        </div>
      </div>
    </div>
  )
}
