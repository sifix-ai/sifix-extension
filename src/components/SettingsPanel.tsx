import { useState, useEffect } from "react"
import type { ExtensionSettings } from "../types"
import { getSettings, updateSettings } from "../lib/messaging"
import { DEFAULT_SETTINGS } from "../constants"
import { cn } from "../utils/cn"

export function SettingsPanel() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    try {
      const resp = await getSettings()
      if (resp?.data) {
        setSettings({ ...DEFAULT_SETTINGS, ...resp.data })
      }
    } catch (e) { console.error(e) }
  }

  const handleToggle = async (key: keyof ExtensionSettings) => {
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    await updateSettings(updated)
    flashSaved()
  }

  const handleInputChange = async (key: string, value: string) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
  }

  const handleSave = async () => {
    await updateSettings(settings)
    flashSaved()
  }

  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-3 animate-slide-up">
      {/* Protection */}
      <div className="sifix-card">
        <span className="text-xs text-sifix-muted uppercase tracking-wider block mb-3">Protection</span>

        <ToggleRow
          label="Protection Enabled"
          desc="Intercept transactions on dApps"
          checked={settings.protectionEnabled}
          onChange={() => handleToggle("protectionEnabled")}
        />
        <ToggleRow
          label="Auto-block High Risk"
          desc="Automatically block HIGH/CRITICAL transactions"
          checked={settings.autoBlockHighRisk}
          onChange={() => handleToggle("autoBlockHighRisk")}
        />
        <ToggleRow
          label="Notifications"
          desc="Show notifications for blocked transactions"
          checked={settings.notifications}
          onChange={() => handleToggle("notifications")}
        />
      </div>

      {/* dApp Connection */}
      <div className="sifix-card">
        <span className="text-xs text-sifix-muted uppercase tracking-wider block mb-3">dApp Connection</span>
        <p className="text-[10px] text-sifix-muted/60 mb-3">
          AI config is managed in the dApp dashboard. Extension connects to dApp API for all analysis.
        </p>

        <div className="mb-2">
          <label className="text-[10px] text-sifix-muted block mb-1">dApp API URL</label>
          <input
            type="text"
            value={settings.dappApiUrl}
            onChange={(e) => handleInputChange("dappApiUrl", e.target.value)}
            className="w-full bg-sifix-surface border border-sifix-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sifix-primary/50"
          />
        </div>

        <a
          href={settings.dappApiUrl.replace("/api/v1", "/dashboard/settings")}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full mt-2 py-2 rounded-lg text-xs font-medium bg-sifix-primary/10 border border-sifix-primary/30 text-sifix-primary text-center hover:bg-sifix-primary/20 transition-all"
        >
          Open dApp Settings (Configure AI Provider)
        </a>

        <button
          onClick={handleSave}
          className="w-full mt-2 py-2 rounded-lg text-xs font-medium bg-sifix-primary hover:bg-sifix-primary-dark text-white transition-all"
        >
          Save Settings
        </button>

        {saved && (
          <p className="text-[10px] text-sifix-safe text-center mt-1 animate-slide-up">
            Settings saved
          </p>
        )}
      </div>

      {/* Architecture Info */}
      <div className="sifix-card text-center">
        <span className="text-2xl">&#x1F6E1;&#xFE0F;</span>
        <p className="text-xs font-bold text-white mt-1">SIFIX Extension</p>
        <p className="text-[10px] text-sifix-muted">v0.2.0 - Built by Mula Labs</p>

        <div className="mt-3 p-2 bg-sifix-surface rounded-lg text-left">
          <p className="text-[10px] text-sifix-muted font-semibold mb-1">Architecture:</p>
          <p className="text-[9px] text-sifix-muted/60">Extension (UI) &rarr; dApp API (Backend) &rarr; AI Provider</p>
          <p className="text-[9px] text-sifix-muted/60 mt-1">AI Provider configured in dApp dashboard:</p>
          <p className="text-[9px] text-sifix-muted/60">&#x2022; 0G Compute (decentralized, pay with 0G)</p>
          <p className="text-[9px] text-sifix-muted/60">&#x2022; OpenAI / Groq (bring your own key)</p>
          <p className="text-[9px] text-sifix-muted/60">&#x2022; Ollama (local, free)</p>
          <p className="text-[9px] text-sifix-muted/60">&#x2022; Custom endpoint</p>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-sifix-border/50 last:border-0">
      <div>
        <p className="text-xs text-white">{label}</p>
        <p className="text-[10px] text-sifix-muted">{desc}</p>
      </div>
      <button
        onClick={onChange}
        className={cn(
          "relative w-10 h-5 rounded-full transition-colors",
          checked ? "bg-sifix-primary" : "bg-sifix-surface"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
            checked ? "left-5" : "left-0.5"
          )}
        />
      </button>
    </div>
  )
}
