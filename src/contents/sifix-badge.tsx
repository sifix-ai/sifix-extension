/**
 * SIFIX Floating Shield Badge — Content Script
 *
 * Small floating chip at top-right on dApp pages:
 *   [shield] SIFIX SAFE   (green)
 *   [shield] SIFIX WARN   (amber)
 *   [shield] SIFIX RISK   (red)
 *   [shield] SIFIX ACTIVE (blue)
 *   [shield] SIFIX PAUSED (dim)
 *
 * Uses the same SVG shield icon as popup.
 * Only visible on dApp pages when authenticated.
 */

import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"

import { MSG } from "../constants"
import { isDappUrl } from "../utils/detect-dapp"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
}

type SafetyLevel = "safe" | "warning" | "danger" | "unknown"

const SHIELD_SVG = (color: string) => `
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
</svg>`

function SifixBadge() {
  const [isDApp, setIsDApp] = useState(false)
  const [safetyLevel, setSafetyLevel] = useState<SafetyLevel>("unknown")
  const [protectionEnabled, setProtectionEnabled] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const url = window.location.href
    const detected = isDappUrl(url)
    setIsDApp(detected)
    if (!detected) return

    chrome.storage.local.get(
      ["sifix_token", "sifixProtectionEnabled"],
      (result) => {
        const hasToken = !!result.sifix_token
        setAuthenticated(hasToken)
        setProtectionEnabled(
          typeof result.sifixProtectionEnabled === "boolean"
            ? result.sifixProtectionEnabled
            : true
        )
        if (hasToken) checkSafety(url)
      }
    )

    const onStorageChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local") return
      if (changes.sifixProtectionEnabled) {
        setProtectionEnabled(!!changes.sifixProtectionEnabled.newValue)
      }
      if (changes.sifix_token) {
        const now = !!changes.sifix_token.newValue
        setAuthenticated(now)
        if (now) checkSafety(window.location.href)
      }
    }

    chrome.storage.onChanged.addListener(onStorageChanged)
    return () => chrome.storage.onChanged.removeListener(onStorageChanged)
  }, [])

  async function checkSafety(url: string) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MSG.CHECK_DAPP,
        url,
      })
      if (response?.level) {
        setSafetyLevel(response.level as SafetyLevel)
      }
    } catch {
      // background not ready
    }
  }

  if (!isDApp || !authenticated) return null

  const levelText = !protectionEnabled
    ? "PAUSED"
    : safetyLevel === "danger"
      ? "RISK"
      : safetyLevel === "warning"
        ? "WARN"
        : safetyLevel === "safe"
          ? "SAFE"
          : "ACTIVE"

  const levelColor = !protectionEnabled
    ? "#52525b"
    : safetyLevel === "danger"
      ? "#f87171"
      : safetyLevel === "warning"
        ? "#facc15"
        : safetyLevel === "safe"
          ? "#4ade80"
          : "#3b9eff"

  return (
    <div
      style={{
        position: "fixed",
        top: "14px",
        right: "14px",
        zIndex: 2147483646,
        background: "rgba(0, 0, 0, 0.88)",
        border: `1px solid ${levelColor}30`,
        color: "#ededed",
        padding: "6px 11px 6px 8px",
        borderRadius: "9999px",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase" as const,
        fontFamily: "'Inter', system-ui, monospace",
        boxShadow: `0 4px 16px rgba(0, 0, 0, 0.5), 0 0 12px ${levelColor}15`,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        opacity: 0.94,
        transition: "opacity 0.2s ease, border-color 0.3s ease",
        cursor: "default",
        userSelect: "none" as const,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1" }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.94" }}>
      <span
        style={{
          width: "14px",
          height: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        dangerouslySetInnerHTML={{ __html: SHIELD_SVG(levelColor) }}
      />
      <span style={{ color: levelColor }}>SIFIX {levelText}</span>
    </div>
  )
}

export default SifixBadge
