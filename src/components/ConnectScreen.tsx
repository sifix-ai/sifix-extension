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
      if (message.type === "SIFIX_TOKEN_RECEIVED" && message.token) {
        validateAndConnect()
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  useEffect(() => {
    checkExistingToken()
  }, [])

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
        setError("Token tidak valid atau sudah expired")
        setStatus("error")
      }
    } catch (err: any) {
      setError(err.message || "Gagal validasi token")
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
      setError(err.message || "Gagal validasi token")
      setStatus("error")
    }
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8">
      {/* Shield icon */}
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.15)" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>

      <h1 className="text-lg font-semibold text-sifix-text tracking-tight" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
        SIFIX
      </h1>
      <p className="text-[11px] text-sifix-text-40 mt-1 text-center leading-relaxed">
        Wallet Transaction Protection
      </p>

      {!showPaste ? (
        <div className="w-full max-w-[260px] mt-8 flex flex-col items-center gap-3">
          <button
            onClick={handleOpenDapp}
            className="w-full py-3 rounded-xl text-sm font-medium text-white cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)" }}
          >
            Activate via dApp
          </button>

          <p className="text-[10px] text-sifix-text-40 text-center leading-relaxed">
            Open dApp dashboard to connect your wallet and activate the extension.
          </p>

          <button
            onClick={() => setShowPaste(true)}
            className="mt-1 text-[11px] text-sifix-text-40 hover:text-sifix-text-60 transition-colors cursor-pointer"
          >
            Paste token manually
          </button>
        </div>
      ) : (
        <div className="w-full max-w-[260px] mt-6 flex flex-col items-center gap-2.5">
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="sfx_..."
            className="w-full px-3 py-2.5 rounded-xl border text-xs text-sifix-text font-mono outline-none transition-colors"
            style={{
              backgroundColor: "#0a0118",
              borderColor: "rgba(248, 247, 255, 0.06)"
            }}
            onFocus={(e) => e.target.style.borderColor = "rgba(139, 92, 246, 0.3)"}
            onBlur={(e) => e.target.style.borderColor = "rgba(248, 247, 255, 0.06)"}
          />

          <button
            onClick={handlePasteSubmit}
            disabled={!tokenInput.trim() || status === "validating"}
            className={
              "w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200 " +
              (!tokenInput.trim()
                ? "opacity-30 cursor-not-allowed text-white"
                : "text-white cursor-pointer hover:opacity-90 active:scale-[0.98]")
            }
            style={{
              background: tokenInput.trim() ? "linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)" : "rgba(255,255,255,0.05)"
            }}
          >
            {status === "validating" ? "Connecting..." : "Connect"}
          </button>

          <button
            onClick={() => { setShowPaste(false); setError(""); setTokenInput("") }}
            className="text-[11px] text-sifix-text-40 hover:text-sifix-text-60 transition-colors cursor-pointer"
          >
            Back
          </button>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-sifix-danger mt-3 text-center">{error}</p>
      )}
    </div>
  )
}
