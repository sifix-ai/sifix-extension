import { useState, useEffect } from "react"
import { ConnectScreen } from "./components/ConnectScreen"
import { getToken, checkAuth, clearToken } from "./lib/api-client"
import { usePageStatus } from "./hooks/usePageStatus"
import "./style.css"

type AuthState = "loading" | "connected" | "disconnected"

const DAPP_DASHBOARD = process.env.PLASMO_PUBLIC_DAPP_EXTENSION_URL || "http://localhost:3000/dashboard/extension"

function Popup() {
  const [authState, setAuthState] = useState<AuthState>("loading")
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null)
  const [protecting, setProtecting] = useState(true)
  const pageStatus = usePageStatus()

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

  useEffect(() => { checkAuthState() }, [])

  useEffect(() => {
    const handler = (message: any) => {
      if (message.type === "SIFIX_TOKEN_RECEIVED" && message.token) checkAuthState()
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

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

  // Connected state
  const isSafe = pageStatus.safety === "safe" || pageStatus.safety === "unknown"
  const isWarning = pageStatus.safety === "warning"
  const accentColor = isSafe ? "#11ff99" : isWarning ? "#ff801f" : "#ff2047"
  const statusLabel = pageStatus.safety === "safe" ? "Protected" : pageStatus.safety === "warning" ? "Caution" : pageStatus.safety === "danger" ? "Threat Detected" : "Active"
  const glowClass = isSafe ? "glow-green" : isWarning ? "glow-blue" : "glow-red"

  return (
    <div className="popup-container">
      {/* Top glow */}
      <div className={`absolute inset-x-0 top-0 h-48 ${glowClass} pointer-events-none`} style={{ opacity: 0.25 }} />

      <div className="relative z-10 flex flex-col items-center flex-1 px-6 pt-8 pb-4">
        {/* Brand header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b9eff, #3b9eff)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-ink tracking-tight">SIFIX</span>
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(59, 158, 255, 0.1)", color: "#3b9eff" }}>v0.2</span>
        </div>

        {/* Shield icon */}
        <div className="relative mb-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}05)`,
              border: `1px solid ${accentColor}30`
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          {protecting && isSafe && (
            <div
              className="absolute inset-0 rounded-2xl animate-ping opacity-15"
              style={{ border: `2px solid ${accentColor}` }}
            />
          )}
        </div>

        {/* Status */}
        <h2 className="text-sm font-semibold text-ink tracking-tight">{statusLabel}</h2>
        <p className="text-[10px] text-sifix-text-50 mt-1">Wallet Transaction Protection</p>

        {pageStatus.domain && (
          <div className="mt-3 px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sifix-text-40">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span className="text-[10px] text-sifix-text-50 font-mono">{pageStatus.domain}</span>
          </div>
        )}

        {/* Protection toggle */}
        <div className="mt-5 w-full max-w-[260px]">
          <button
            onClick={() => setProtecting(!protecting)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200"
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
            <div
              className="w-9 h-5 rounded-full relative transition-all duration-200"
              style={{ backgroundColor: protecting ? "#3b9eff" : "rgba(255, 255, 255, 0.1)" }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                style={{ left: protecting ? "17px" : "2px" }}
              />
            </div>
          </button>
        </div>

        {/* Wallet address */}
        <div className="mt-4 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#11ff99" }} />
          <span className="text-[10px] text-sifix-text-40 font-mono">
            {connectedWallet ? connectedWallet.slice(0, 6) + "..." + connectedWallet.slice(-4) : ""}
          </span>
        </div>

        {/* Dashboard link */}
        <a
          href={DAPP_DASHBOARD}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-[10px] text-accent-blue hover:text-white transition-colors font-medium flex items-center gap-1"
        >
          Open Dashboard
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>

        {/* Disconnect */}
        <button
          onClick={async () => {
            await clearToken()
            chrome.storage.local.remove("sifix_wallet")
            setConnectedWallet(null)
            setAuthState("disconnected")
          }}
          className="mt-auto text-[9px] text-sifix-text-30 hover:text-accent-red transition-colors pb-1"
        >
          Disconnect
        </button>
      </div>

      <Footer />
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
