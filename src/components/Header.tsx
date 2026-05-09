import { cn } from "../utils/cn"

interface HeaderProps {
  activePanel: string
  onPanelChange: (panel: string) => void
}

const panels = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "scan", label: "Scan", icon: "🔍" },
  { id: "history", label: "History", icon: "📋" },
  { id: "tag", label: "Tags", icon: "🏷️" },
  { id: "settings", label: "Settings", icon: "⚙️" },
]

export function Header({ activePanel, onPanelChange }: HeaderProps) {
  return (
    <header className="sifix-glass rounded-b-2xl px-3 py-2.5">
      <div className="flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg sifix-gradient flex items-center justify-center shadow-glow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 className="text-base font-semibold text-sifix-text font-body tracking-tight">
            SIFIX
          </h1>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sifix-primary/15 text-sifix-primary font-mono font-medium">
            v0.2
          </span>
        </div>

        {/* Nav tabs */}
        <nav className="flex gap-0.5">
          {panels.map((p) => (
            <button
              key={p.id}
              title={p.label}
              onClick={() => onPanelChange(p.id)}
              className={cn(
                "w-8 h-8 rounded-xl text-sm flex items-center justify-center transition-all duration-200",
                activePanel === p.id
                  ? "bg-sifix-primary/15 text-sifix-primary shadow-glow"
                  : "text-sifix-text-40 hover:text-sifix-text-70 hover:bg-white/[0.04]"
              )}
            >
              {p.icon}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
