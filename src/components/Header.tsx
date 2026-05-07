import { cn } from "../utils/cn"

interface HeaderProps {
  activePanel: string
  onPanelChange: (panel: string) => void
}

const panels = [
  { id: "overview", label: "📊", title: "Overview" },
  { id: "scan", label: "🔍", title: "Scan" },
  { id: "history", label: "📋", title: "History" },
  { id: "tag", label: "🏷️", title: "Tags" },
  { id: "settings", label: "⚙️", title: "Settings" },
]

export function Header({ activePanel, onPanelChange }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-3 py-2 border-b border-sifix-border">
      <div className="flex items-center gap-2">
        <span className="text-lg">🛡️</span>
        <h1 className="text-base font-bold text-white tracking-tight">SIFIX</h1>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sifix-primary/20 text-sifix-primary font-mono">
          v0.1.0
        </span>
      </div>
      <nav className="flex gap-0.5">
        {panels.map((p) => (
          <button
            key={p.id}
            title={p.title}
            onClick={() => onPanelChange(p.id)}
            className={cn(
              "w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all",
              activePanel === p.id
                ? "bg-sifix-primary/20 text-sifix-primary"
                : "text-sifix-muted hover:text-sifix-text hover:bg-sifix-surface"
            )}
          >
            {p.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
