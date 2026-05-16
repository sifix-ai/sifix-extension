import { useState, useEffect } from "react"
import { ConnectScreen } from "./components/ConnectScreen"
import { getToken, checkAuth, clearToken } from "./lib/api-client"
import { isDappUrl, isInternalPage } from "./utils/detect-dapp"
import { MSG } from "./constants"
import type { SafetyLevel } from "./types"
import "./style.css"

type AuthState = "loading" | "connected" | "disconnected"

interface TabInfo {
  url: string
  domain: string
  isDapp: boolean
  isInternal: boolean
}

interface DomainSafety {
  safety: SafetyLevel
  reason: string
  domain: string
}

const DAPP_DASHBOARD = process.env.PLASMO_PUBLIC_DAPP_EXTENSION_URL || "http://localhost:3000/dashboard/extension"

function Popup() {
  const [authState, setAuthState] = useState<AuthState>("loading")
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null)
  const [protecting, setProtecting] = useState(true)
  const [tabInfo, setTabInfo] = useState<TabInfo>({ url: "", domain: "", isDapp: false, isInternal: true })
  const [domainSafety, setDomainSafety] = useState<DomainSafety>({ safety: "unknown", reason: "", domain: "" })

  // --- Auth check ---
  const checkAuthState = async () => {
    const token = await getToken()
    if (!token) { setAuthState("disconnected"); return }
    const result = await checkAuth()
    if (result.valid && result.walletAddress) {
      setConnectedWallet(result.walletAddress)
      setAuthState("connected")
    } else {
      await clearToken()
      setAuthState("disconnected")
    }
  }

  // --- Tab detection ---
  const detectTab = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const url = tab?.url || ""
      const domain = url ? new URL(url).hostname : ""
      const isDapp = isDappUrl(url)
      const isInternal = isInternalPage(url)
      setTabInfo({ url, domain, isDapp, isInternal })
      return { url, domain, isDapp, isInternal }
    } catch {
      setTabInfo({ url: "", domain: "", isDapp: false, isInternal: true })
      return null
    }
  }

  // --- Domain safety check via background ---
  const checkDomainSafety = async (url: string) => {
    try {
      const resp = await chrome.runtime.sendMessage({ type: MSG.GET_PAGE_STATUS, url })
      if (resp?.data) {
        setDomainSafety(resp.data)
      }
    } catch (e) {
      console.error("Failed to get page status:", e)
    }
  }

  useEffect(() => {
    const init = async () => {
      await checkAuthState()
      const tab = await detectTab()
      // If on a dApp page + authenticated, check domain safety
      if (tab?.isDapp && tab?.url) {
        const token = await getToken()
        if (token) {
          await checkDomainSafety(tab.url)
        }
      }
    }
    init()
  }, [])

  // Listen for token from dapp
  useEffect(() => {
    const handler = (message: any) => {
      if (message.type === "SIFIX_TOKEN_RECEIVED" && message.token) checkAuthState()
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  // Listen for protection toggle changes
  useEffect(() => {
    chrome.storage.local.get("sifixProtectionEnabled", (r) => {
      if (typeof r.sifixProtectionEnabled === "boolean") setProtecting(r.sifixProtectionEnabled)
    })
    const onStorage = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === "local" && changes.sifixProtectionEnabled) {
        setProtecting(!!changes.sifixProtectionEnabled.newValue)
      }
    }
    chrome.storage.onChanged.addListener(onStorage)
    return () => chrome.storage.onChanged.removeListener(onStorage)
  }, [])

  // ══════════════════════════════════════════
  // STATE: Loading
  // ══════════════════════════════════════════
  if (authState === "loading") {
    return (
      <div className="popup-container">
        <div className="flex items-center justify-center flex-1">
          <div className="w-5 h-5 border-2 border-white/20 border-t-accent-blue rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    )
  }

  // ══════════════════════════════════════════
  // STATE: Disconnected
  // ══════════════════════════════════════════
  if (authState === "disconnected") {
    return (
      <div className="popup-container">
        <ConnectScreen onConnected={(addr) => {
          setConnectedWallet(addr)
          setAuthState("connected")
        }} />
        <Footer />
      </div>
    )
  }

  // ══════════════════════════════════════════
  // STATE: Connected — Inactive (internal / web2)
  // ══════════════════════════════════════════
  if (!tabInfo.isDapp || tabInfo.isInternal) {
    return (
      <div className="popup-container">
        <div className="absolute inset-x-0 top-0 h-48 glow-blue pointer-events-none" style={{ opacity: 0.08 }} />
        <div className="relative z-10 flex flex-col items-center flex-1 px-6 pt-8 pb-4">
          <BrandHeader />
          <InactiveShield isInternal={tabInfo.isInternal} domain={tabInfo.domain} />
          <WalletFooter wallet={connectedWallet} onDisconnect={async () => {
            await clearToken()
            chrome.storage.local.remove("sifix_wallet")
            setConnectedWallet(null)
            setAuthState("disconnected")
          }} />
        </div>
        <Footer />
      </div>
    )
  }

  // ══════════════════════════════════════════
  // STATE: Connected — Active on dApp
  // ══════════════════════════════════════════
  const safety = domainSafety.safety
  const isSafe = safety === "safe"
  const isWarning = safety === "warning"
  const isDanger = safety === "danger"
  const accentColor = isDanger ? "#ef4444" : isWarning ? "#f59e0b" : !protecting ? "rgba(252,253,255,0.25)" : "#11ff99"
  const statusLabel = isDanger ? "Dangerous" : isWarning ? "Caution" : protecting ? "Protected" : "Paused"
  const glowClass = isDanger ? "glow-red" : isWarning ? "glow-red" : protecting ? "glow-green" : "glow-blue"
  const logoUrl = chrome.runtime.getURL('assets/sifix-white.png')

  return (
    <div className="popup-container">
      <div className={`absolute inset-x-0 top-0 h-48 ${glowClass} pointer-events-none`} style={{ opacity: 0.2 }} />
      <div className="relative z-10 flex flex-col items-center flex-1 px-6 pt-8 pb-4">
        <BrandHeader />

        {/* Shield */}
        <div className="relative mb-3 mt-2">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center p-3"
            style={{
              background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}05)`,
              border: `1px solid ${accentColor}30`
            }}
          >
            <img 
              src={logoUrl} 
              alt="SIFIX" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                filter: `drop-shadow(0 0 4px ${accentColor})`
              }} 
            />
          </div>
          {protecting && isSafe && (
            <div className="absolute inset-0 rounded-2xl animate-ping opacity-15" style={{ border: `2px solid ${accentColor}` }} />
          )}
        </div>

        <h2 className="text-sm font-semibold text-ink tracking-tight">{statusLabel}</h2>
        <p className="text-[10px] text-sifix-text-50 mt-1">Transaction Shield</p>

        {/* Domain pill */}
        {tabInfo.domain && (
          <div className="mt-3 px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sifix-text-40">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span className="text-[10px] text-sifix-text-50 font-mono">{tabInfo.domain}</span>
          </div>
        )}

        {/* Safety badge */}
        <div className="mt-2 px-2 py-0.5 rounded-full" style={{
          background: isDanger ? "rgba(239,68,68,0.08)" : isWarning ? "rgba(245,158,11,0.08)" : "rgba(17,255,153,0.08)",
          border: `1px solid ${isDanger ? "rgba(239,68,68,0.15)" : isWarning ? "rgba(245,158,11,0.15)" : "rgba(17,255,153,0.15)"}`
        }}>
          <span className="text-[9px] font-medium" style={{ color: accentColor }}>
            {isDanger ? "Dangerous Site" : isWarning ? "Use Caution" : "Web3 Safe"}
          </span>
        </div>

        {/* Safety reason */}
        {domainSafety.reason && (isDanger || isWarning) && (
          <p className="mt-2 text-[10px] text-sifix-text-40 text-center max-w-[220px] leading-relaxed">
            {domainSafety.reason}
          </p>
        )}

        {/* Protection toggle */}
        <div className="mt-4 w-full max-w-[260px]">
          <button
            onClick={() => {
              const next = !protecting
              setProtecting(next)
              chrome.storage.local.set({ sifixProtectionEnabled: next })
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer"
            style={{
              backgroundColor: protecting ? "rgba(59, 158, 255, 0.06)" : "rgba(255, 255, 255, 0.03)",
              border: protecting ? "1px solid rgba(59, 158, 255, 0.15)" : "1px solid rgba(255, 255, 255, 0.06)"
            }}
          >
            <div className="flex items-center gap-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={protecting ? "#3b9eff" : "rgba(252,253,255,0.4)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span className="text-xs text-sifix-text-70">TX Protection</span>
            </div>
            <div className="w-9 h-5 rounded-full relative transition-all duration-200" style={{ backgroundColor: protecting ? "#3b9eff" : "rgba(255, 255, 255, 0.1)" }}>
              <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200" style={{ left: protecting ? "17px" : "2px" }} />
            </div>
          </button>
        </div>

        {/* Wallet */}
        <div className="mt-3 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
          <span className="text-[10px] text-sifix-text-40 font-mono">
            {connectedWallet ? connectedWallet.slice(0, 6) + "..." + connectedWallet.slice(-4) : ""}
          </span>
        </div>

        <a href={DAPP_DASHBOARD} target="_blank" rel="noopener noreferrer" className="mt-2 text-[10px] text-accent-blue hover:text-white transition-colors font-medium flex items-center gap-1">
          Open Dashboard
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>

        <button onClick={async () => { await clearToken(); chrome.storage.local.remove("sifix_wallet"); setConnectedWallet(null); setAuthState("disconnected") }} className="mt-auto text-[9px] text-sifix-text-30 hover:text-accent-red transition-colors cursor-pointer pb-1">
          Disconnect
        </button>
      </div>
      <Footer />
    </div>
  )
}

// ══════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════

function BrandHeader() {
  const logoUrl = chrome.runtime.getURL('assets/sifix-white.png')
  
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center p-1" style={{ background: "linear-gradient(135deg, #3b9eff, #3b9eff)" }}>
        <img src={logoUrl} alt="SIFIX" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <span className="text-sm font-semibold text-ink tracking-tight">SIFIX</span>
      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(59, 158, 255, 0.1)", color: "#3b9eff" }}>v0.2</span>
    </div>
  )
}

function InactiveShield({ isInternal, domain }: { isInternal: boolean; domain: string }) {
  const logoUrl = chrome.runtime.getURL('assets/sifix-white.png')
  
  return (
    <div className="flex flex-col items-center mt-2">
      <div className="relative mb-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <img src={logoUrl} alt="SIFIX" style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.25 }} />
        </div>
      </div>
      <h2 className="text-sm font-semibold text-sifix-text-60 tracking-tight">{isInternal ? "No Active Page" : "Inactive"}</h2>
      <p className="text-[10px] text-sifix-text-40 mt-1 text-center max-w-[200px] leading-relaxed">
        {isInternal ? "Navigate to a dApp to activate transaction protection." : "This is not a dApp. SIFIX activates automatically on Web3 applications."}
      </p>
      {domain && !isInternal && (
        <div className="mt-3 px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sifix-text-30"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span className="text-[10px] text-sifix-text-40 font-mono">{domain}</span>
        </div>
      )}
    </div>
  )
}

function WalletFooter({ wallet, onDisconnect }: { wallet: string | null; onDisconnect: () => void }) {
  return (
    <div className="mt-auto flex flex-col items-center gap-2 pb-1">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#3b9eff" }} />
        <span className="text-[10px] text-sifix-text-40 font-mono">{wallet ? wallet.slice(0, 6) + "..." + wallet.slice(-4) : ""}</span>
      </div>
      <button onClick={onDisconnect} className="text-[9px] text-sifix-text-30 hover:text-accent-red transition-colors cursor-pointer">Disconnect</button>
    </div>
  )
}

function Footer() {
  return (
    <div className="flex items-center justify-center gap-2 py-3 border-t border-hairline">
      <span className="text-[9px] text-sifix-text-30">Powered by</span>
      <svg width="18" height="9" viewBox="0 0 551 267" fill="none">
        <path fillRule="evenodd" clipRule="evenodd" d="M551 140.176C547.524 210.803 489.168 267 417.687 267C343.972 267 284.212 207.229 284.212 133.499C284.212 59.769 343.972 0 417.687 0C486.9 0 543.808 52.6889 550.506 120.151H489.889C483.613 85.9722 453.674 60.0757 417.689 60.0757C377.144 60.0757 344.276 92.9486 344.276 133.499C344.276 174.052 377.144 206.925 417.689 206.925C448.816 206.925 475.416 187.549 486.095 160.201H384.32V140.176H551ZM43.9296 232.504C96.3218 279.985 177.314 278.45 227.858 227.899C279.983 175.763 279.983 91.2372 227.858 39.1014C175.732 -13.0328 91.22 -13.0328 39.0943 39.1014C-9.84622 88.0512 -12.8367 165.554 30.1224 217.994L72.9838 175.125C53.2597 146.519 56.1206 107.032 81.5664 81.5821C110.235 52.9077 156.717 52.9077 185.387 81.5821C214.055 110.257 214.055 156.746 185.387 185.421C163.377 207.435 130.868 212.548 103.981 200.76L175.948 128.78L161.791 114.622L86.4966 189.928L43.9296 232.504Z" fill="rgba(252, 253, 255, 0.2)"/>
      </svg>
      <span className="text-[9px]" style={{ color: "rgba(252, 253, 255, 0.2)" }}>0G</span>
    </div>
  )
}

export default Popup
