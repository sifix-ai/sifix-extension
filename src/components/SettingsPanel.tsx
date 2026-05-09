import { useState, useEffect } from "react"
import type { ExtensionSettings } from "../types"
import { getSettings, updateSettings } from "../lib/messaging"
import { DEFAULT_SETTINGS } from "../constants"
import { cn } from "../utils/cn"

export function SettingsPanel({ onDisconnect, connectedWallet }: { onDisconnect?: () => void; connectedWallet?: string | null }) {
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
        <span className="text-[10px] text-sifix-text-40 uppercase tracking-widest font-sans font-medium block mb-3">
          Protection
        </span>

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
        <span className="text-[10px] text-sifix-text-40 uppercase tracking-widest font-sans font-medium block mb-3">
          dApp Connection
        </span>
        <p className="text-[10px] text-sifix-text-40 mb-3 leading-relaxed">
          AI config is managed in the dApp dashboard. Extension connects to dApp API for all analysis.
        </p>

        <div className="mb-2">
          <label className="text-[10px] text-sifix-text-40 block mb-1 font-sans font-medium">dApp API URL</label>
          <input
            type="text"
            value={settings.dappApiUrl}
            onChange={(e) => handleInputChange("dappApiUrl", e.target.value)}
            className="w-full bg-sifix-bg border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-sifix-text font-mono focus:outline-none focus:border-sifix-primary/40 transition-colors"
          />
        </div>

        <a
          href={settings.dappApiUrl.replace("/api/v1", "/dashboard/settings")}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full mt-2 py-2.5 rounded-xl text-xs font-medium bg-sifix-primary/10 border border-sifix-primary/20 text-sifix-primary text-center hover:bg-sifix-primary/15 hover:border-sifix-primary/30 transition-all font-body"
        >
          Open dApp Settings (Configure AI Provider)
        </a>

        <button
          onClick={handleSave}
          className="w-full mt-2 py-2.5 rounded-xl text-xs font-medium sifix-gradient text-white hover:shadow-glow transition-all active:scale-[0.98]"
        >
          Save Settings
        </button>

        {saved && (
          <p className="text-[10px] text-sifix-safe text-center mt-1.5 animate-slide-up font-body">
            Settings saved ✓
          </p>
        )}
      </div>

      {/* Auth Info + Disconnect */}
      {connectedWallet && onDisconnect && (
        <div className="sifix-card">
          <span className="text-[10px] text-sifix-text-40 uppercase tracking-widest font-sans font-medium block mb-3">
            Connected Wallet
          </span>
          <p className="text-xs text-sifix-text font-mono mb-3">{connectedWallet}</p>
          <button
            onClick={onDisconnect}
            className="w-full py-2.5 rounded-xl text-xs font-medium bg-sifix-danger/5 border border-sifix-danger/20 text-sifix-danger hover:bg-sifix-danger/10 transition-all font-body"
          >
            Disconnect from SIFIX
          </button>
        </div>
      )}

      {/* Architecture Info */}
      <div className="sifix-card text-center">
        <div className="w-10 h-10 rounded-xl sifix-gradient flex items-center justify-center mx-auto shadow-glow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <p className="text-xs font-semibold text-sifix-text mt-2 font-body">SIFIX Extension</p>
        <p className="text-[10px] text-sifix-text-40 mt-0.5 font-body">v0.2.0 - Built by Mula Labs</p>

        <div className="mt-3 p-3 bg-sifix-bg rounded-xl border border-white/[0.04] text-left">
          <p className="text-[9px] text-sifix-text-60 font-semibold mb-1.5 uppercase tracking-wider">Architecture</p>
          <p className="text-[9px] text-sifix-text-40 font-mono">Extension → dApp API → AI Provider</p>
          <p className="text-[9px] text-sifix-text-40 mt-2 font-body">AI Provider configured in dApp dashboard:</p>
          <p className="text-[9px] text-sifix-text-40 font-body">• 0G Compute (decentralized, pay with 0G)</p>
          <p className="text-[9px] text-sifix-text-40 font-body">• OpenAI / Groq (bring your own key)</p>
          <p className="text-[9px] text-sifix-text-40 font-body">• Ollama (local, free)</p>
          <p className="text-[9px] text-sifix-text-40 font-body">• Custom endpoint</p>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <div>
        <p className="text-xs text-sifix-text font-body font-medium">{label}</p>
        <p className="text-[10px] text-sifix-text-40">{desc}</p>
      </div>
      <button
        onClick={onChange}
        className={cn(
          "relative w-10 h-5 rounded-full transition-all duration-200",
          checked
            ? "sifix-gradient shadow-glow"
            : "bg-sifix-bg border border-white/[0.06]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200",
            checked ? "left-5" : "left-0.5"
          )}
        />
      </button>
    </div>
  )
}
