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
    if (!token) {
      setAuthState("disconnected")
      return
    }
    const result = await checkAuth()
    if (result.valid && result.walletAddress) {
      setConnectedWallet(result.walletAddress)
      setAuthState("connected")
    } else {
      await clearToken()
      setAuthState("disconnected")
    }
  }

  useEffect(() => {
    checkAuthState()
  }, [])

  useEffect(() => {
    const handler = (message: any) => {
      if (message.type === "SIFIX_TOKEN_RECEIVED" && message.token) {
        checkAuthState()
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  // Loading
  if (authState === "loading") {
    return (
      <div className="popup-container">
        <div className="flex items-center justify-center flex-1">
          <div className="w-6 h-6 border-2 border-white/20 border-t-sifix-primary rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    )
  }

  // Disconnected — go to dapp to activate
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

  // Connected — minimal intercept status
  const isSafe = pageStatus.safety === "safe" || pageStatus.safety === "unknown"
  const statusColor = isSafe ? "#22c55e" : pageStatus.safety === "warning" ? "#f59e0b" : "#ef4444"
  const statusLabel = pageStatus.safety === "safe" ? "Protected" : pageStatus.safety === "warning" ? "Caution" : pageStatus.safety === "danger" ? "Danger" : "Active"
  const statusIcon = isSafe ? "🛡️" : pageStatus.safety === "warning" ? "⚠️" : pageStatus.safety === "danger" ? "🚨" : "🛡️"

  return (
    <div className="popup-container">
      <div className="flex flex-col items-center flex-1 px-6 pt-8 pb-4">
        {/* Shield icon */}
        <div className="relative mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${statusColor}15`, border: `1px solid ${statusColor}25` }}
          >
            <span className="text-2xl">{statusIcon}</span>
          </div>
          {/* Pulse ring */}
          {protecting && isSafe && (
            <div
              className="absolute inset-0 rounded-2xl animate-ping opacity-20"
              style={{ border: `2px solid ${statusColor}` }}
            />
          )}
        </div>

        {/* Status */}
        <h2 className="text-base font-semibold text-sifix-text tracking-tight" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
          {statusLabel}
        </h2>
        {pageStatus.domain && (
          <p className="text-[11px] text-sifix-text-40 mt-1 font-mono">{pageStatus.domain}</p>
        )}
        {pageStatus.reason && (
          <p className="text-[10px] text-sifix-text-40 mt-0.5 text-center leading-relaxed max-w-[260px]">{pageStatus.reason}</p>
        )}

        {/* Toggle */}
        <div className="mt-6 w-full max-w-[240px]">
          <button
            onClick={() => setProtecting(!protecting)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl"
            style={{
              backgroundColor: protecting ? "rgba(139, 92, 246, 0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${protecting ? "rgba(139, 92, 246, 0.2)" : "rgba(255,255,255,0.06)"}`
            }}
          >
            <span className="text-xs text-sifix-text-70">TX Protection</span>
            <div
              className="w-9 h-5 rounded-full relative transition-all duration-200"
              style={{ backgroundColor: protecting ? "#8b5cf6" : "rgba(255,255,255,0.1)" }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                style={{ left: protecting ? "17px" : "2px" }}
              />
            </div>
          </button>
        </div>

        {/* Wallet */}
        <div className="mt-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sifix-safe" />
          <span className="text-[11px] text-sifix-text-60 font-mono">
            {connectedWallet ? connectedWallet.slice(0, 6) + "..." + connectedWallet.slice(-4) : ""}
          </span>
        </div>

        {/* Open Dashboard */}
        <a
          href={DAPP_DASHBOARD}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-[11px] text-sifix-primary hover:underline font-medium"
        >
          Open Dashboard →
        </a>

        {/* Disconnect (subtle) */}
        <button
          onClick={async () => {
            await clearToken()
            chrome.storage.local.remove("sifix_wallet")
            setConnectedWallet(null)
            setAuthState("disconnected")
          }}
          className="mt-auto text-[10px] text-sifix-text-40 hover:text-sifix-danger transition-colors pb-1"
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
    <div className="flex items-center justify-center gap-2 py-3">
      <svg width="24" height="12" viewBox="0 0 551 267" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" clipRule="evenodd" d="M551 140.176C547.524 210.803 489.168 267 417.687 267C343.972 267 284.212 207.229 284.212 133.499C284.212 59.769 343.972 0 417.687 0C486.9 0 543.808 52.6889 550.506 120.151H489.889C483.613 85.9722 453.674 60.0757 417.689 60.0757C377.144 60.0757 344.276 92.9486 344.276 133.499C344.276 174.052 377.144 206.925 417.689 206.925C448.816 206.925 475.416 187.549 486.095 160.201H384.32V140.176H551ZM43.9296 232.504C96.3218 279.985 177.314 278.45 227.858 227.899C279.983 175.763 279.983 91.2372 227.858 39.1014C175.732 -13.0328 91.22 -13.0328 39.0943 39.1014C-9.84622 88.0512 -12.8367 165.554 30.1224 217.994L72.9838 175.125C53.2597 146.519 56.1206 107.032 81.5664 81.5821C110.235 52.9077 156.717 52.9077 185.387 81.5821C214.055 110.257 214.055 156.746 185.387 185.421C163.377 207.435 130.868 212.548 103.981 200.76L175.948 128.78L161.791 114.622L86.4966 189.928L43.9296 232.504Z" fill="rgba(248, 247, 255, 0.25)"/>
      </svg>
      <span className="text-[10px]" style={{ color: "rgba(248, 247, 255, 0.25)" }}>0G</span>
    </div>
  )
}

export default Popup
