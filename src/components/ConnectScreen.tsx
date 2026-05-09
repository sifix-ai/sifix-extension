import { useState, useEffect } from "react"

interface ConnectScreenProps {
  onConnected: (walletAddress: string) => void
}

const DAPP_EXTENSION_URL = process.env.PLASMO_PUBLIC_DAPP_EXTENSION_URL || "http://localhost:3000/dashboard/extension"

export function ConnectScreen({ onConnected }: ConnectScreenProps) {
  const [status, setStatus] = useState<"idle" | "validating" | "error">("idle")
  const [error, setError] = useState("")
  const [showPaste, setShowPaste] = useState(false)
  const [tokenInput, setTokenInput] = useState("")

  useEffect(() => {
    const handler = (message: any) => {
      if (message.type === "SIFIX_TOKEN_RECEIVED" && message.token) validateAndConnect()
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  useEffect(() => { checkExistingToken() }, [])

  const checkExistingToken = async () => {
    try {
      const { getToken, checkAuth } = await import("../lib/api-client")
      const token = await getToken()
      if (token) {
        const result = await checkAuth()
        if (result.valid && result.walletAddress) {
          chrome.storage.local.set({ sifix_wallet: result.walletAddress })
          onConnected(result.walletAddress)
        }
      }
    } catch {}
  }

  const validateAndConnect = async () => {
    setStatus("validating")
    setError("")
    try {
      const { checkAuth } = await import("../lib/api-client")
      const result = await checkAuth()
      if (result.valid && result.walletAddress) {
        chrome.storage.local.set({ sifix_wallet: result.walletAddress })
        onConnected(result.walletAddress)
      } else {
        setError("Token is invalid or expired")
        setStatus("error")
      }
    } catch (err: any) {
      setError(err.message || "Token validation failed")
      setStatus("error")
    }
  }

  const handleOpenDapp = () => {
    chrome.tabs.create({ url: DAPP_EXTENSION_URL })
  }

  const handlePasteSubmit = async () => {
    if (!tokenInput.trim()) return
    setStatus("validating")
    setError("")
    try {
      const { setToken } = await import("../lib/api-client")
      await setToken(tokenInput.trim())
      await validateAndConnect()
    } catch (err: any) {
      setError(err.message || "Token validation failed")
      setStatus("error")
    }
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6">
      {/* Top glow */}
      <div className="absolute inset-x-0 top-0 h-64 glow-blue pointer-events-none" style={{ opacity: 0.12 }} />

      {/* Brand */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b9eff, #3b9eff)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <span className="text-lg font-semibold text-ink tracking-tight">SIFIX</span>
      </div>

      <p className="text-[11px] text-sifix-text-50 text-center leading-relaxed max-w-[220px] mb-1">
        Transaction Shield
      </p>
      <p className="text-[10px] text-sifix-text-40 text-center leading-relaxed max-w-[240px]">
        AI-powered wallet protection on 0G Chain
      </p>

      {!showPaste ? (
        <div className="w-full max-w-[260px] mt-6 flex flex-col items-center gap-3">
          {/* Primary CTA — glassmorphic card */}
          <button
            onClick={handleOpenDapp}
            className="w-full h-11 rounded-xl text-sm font-medium text-white cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-accent-blue/20 active:scale-[0.98]"
            style={{
              background: "linear-gradient(to right, rgba(59, 158, 255, 0.8), #3b9eff)",
              border: "1px solid rgba(59, 158, 255, 0.3)"
            }}
          >
            Activate via dApp
          </button>

          {/* Instruction card */}
          <div className="w-full glass-card p-3 mt-1">
            <p className="text-[10px] text-sifix-text-50 text-center leading-relaxed">
              Open the dApp dashboard to connect your wallet and generate an activation token.
            </p>
          </div>

          {/* Ghost button */}
          <button
            onClick={() => setShowPaste(true)}
            className="mt-1 h-8 px-4 rounded-xl text-[10px] text-sifix-text-50 cursor-pointer transition-all duration-200 hover:bg-white/[0.06] hover:text-sifix-text-70"
            style={{ border: "1px solid rgba(255, 255, 255, 0.06)" }}
          >
            Paste token manually
          </button>
        </div>
      ) : (
        <div className="w-full max-w-[260px] mt-5 flex flex-col items-center gap-2.5">
          {/* Token input — glassmorphic */}
          <div className="w-full glass-card p-0.5">
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="sfx_..."
              className="w-full px-3 py-2.5 rounded-[11px] text-xs text-ink font-mono outline-none transition-all duration-200 focus:ring-2 focus:ring-accent-blue"
              style={{
                backgroundColor: "rgba(0,0,0,0.6)",
                border: "none"
              }}
            />
          </div>

          <button
            onClick={handlePasteSubmit}
            disabled={!tokenInput.trim() || status === "validating"}
            className={
              "w-full h-10 rounded-xl text-sm font-medium transition-all duration-200 " +
              (!tokenInput.trim()
                ? "opacity-30 cursor-not-allowed text-white"
                : "text-white cursor-pointer hover:shadow-lg hover:shadow-accent-blue/20 active:scale-[0.98]")
            }
            style={{
              background: tokenInput.trim()
                ? "linear-gradient(to right, rgba(59, 158, 255, 0.8), #3b9eff)"
                : "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.15)"
            }}
          >
            {status === "validating" ? "Connecting..." : "Connect"}
          </button>

          <button
            onClick={() => { setShowPaste(false); setError(""); setTokenInput("") }}
            className="text-[10px] text-sifix-text-40 hover:text-sifix-text-60 transition-colors cursor-pointer"
          >
            Back
          </button>
        </div>
      )}

      {/* Error card */}
      {error && (
        <div className="mt-3 w-full max-w-[260px] p-3 rounded-xl glass-card"
          style={{ borderColor: "rgba(255, 32, 71, 0.2)" }}
        >
          <p className="text-[10px] text-accent-red text-center">{error}</p>
        </div>
      )}
    </div>
  )
}
