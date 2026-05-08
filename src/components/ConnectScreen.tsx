import { useState, useEffect } from "react"

interface ConnectScreenProps {
  onConnected: (walletAddress: string) => void
}

const DAPP_EXTENSION_URL = "http://localhost:3001/dashboard/extension"

export function ConnectScreen({ onConnected }: ConnectScreenProps) {
  const [mode, setMode] = useState<"main" | "paste">("main")
  const [tokenInput, setTokenInput] = useState("")
  const [status, setStatus] = useState<"idle" | "validating" | "error">("idle")
  const [error, setError] = useState("")

  // Auto-capture token from URL params (if dApp redirected with ?token=xxx)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    if (token) {
      handleTokenCapture(token)
    }
  }, [])

  const handleOpenDapp = () => {
    chrome.tabs.create({ url: DAPP_EXTENSION_URL })
  }

  const handleTokenCapture = async (token: string) => {
    setStatus("validating")
    setError("")

    try {
      const { setToken, checkAuth } = await import("../lib/api-client")
      await setToken(token)
      const result = await checkAuth()

      if (result.valid && result.walletAddress) {
        chrome.storage.local.set({ sifix_wallet: result.walletAddress })
        onConnected(result.walletAddress)
      } else {
        const { clearToken } = await import("../lib/api-client")
        await clearToken()
        setError("Token tidak valid atau sudah expired")
        setStatus("error")
      }
    } catch (err: any) {
      setError(err.message || "Gagal validasi token")
      setStatus("error")
    }
  }

  const handlePasteSubmit = async () => {
    if (!tokenInput.trim()) return
    await handleTokenCapture(tokenInput.trim())
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 20px",
      minHeight: "480px",
      gap: "16px",
    }}>
      {/* Logo */}
      <div style={{
        width: "56px",
        height: "56px",
        borderRadius: "16px",
        background: "linear-gradient(135deg, #ff6b6b, #4ecdc4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "24px",
        fontWeight: 700,
        color: "#fff",
      }}>
        S
      </div>
      <div style={{
        fontSize: "22px",
        fontWeight: 700,
        color: "#fff",
        letterSpacing: "-0.5px",
      }}>
        SIFIX
      </div>
      <div style={{
        fontSize: "12px",
        color: "#94a3b8",
        textAlign: "center",
        maxWidth: "240px",
      }}>
        AI-Powered Wallet Security
      </div>

      {/* Main: Open dApp */}
      {mode === "main" && (
        <>
          <button
            onClick={handleOpenDapp}
            style={{
              marginTop: "20px",
              padding: "14px 28px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #ff6b6b, #4ecdc4)",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
              maxWidth: "280px",
              transition: "opacity 0.2s",
            }}
          >
            Connect via dApp
          </button>

          <div style={{
            fontSize: "11px",
            color: "#64748b",
            textAlign: "center",
            maxWidth: "240px",
            lineHeight: "1.5",
          }}>
            Buka halaman SIFIX dApp, connect wallet, lalu copy token ke extension ini.
          </div>

          <button
            onClick={() => setMode("paste")}
            style={{
              marginTop: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #334155",
              background: "transparent",
              color: "#94a3b8",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Sudah punya token? Paste di sini
          </button>
        </>
      )}

      {/* Paste Token Mode */}
      {mode === "paste" && (
        <>
          <div style={{ width: "100%", maxWidth: "280px", marginTop: "16px" }}>
            <label style={{
              fontSize: "12px",
              color: "#94a3b8",
              display: "block",
              marginBottom: "6px",
            }}>
              Paste API Token
            </label>
            <textarea
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="sfx_..."
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #334155",
                background: "#1e293b",
                color: "#fff",
                fontSize: "12px",
                fontFamily: "monospace",
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            onClick={handlePasteSubmit}
            disabled={!tokenInput.trim() || status === "validating"}
            style={{
              padding: "12px 24px",
              borderRadius: "10px",
              border: "none",
              background: !tokenInput.trim() ? "#334155" : "#3b82f6",
              color: !tokenInput.trim() ? "#64748b" : "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: !tokenInput.trim() ? "not-allowed" : "pointer",
              width: "100%",
              maxWidth: "280px",
            }}
          >
            {status === "validating" ? "Validating..." : "Connect"}
          </button>

          <button
            onClick={() => { setMode("main"); setError(""); setTokenInput("") }}
            style={{
              padding: "6px 12px",
              border: "none",
              background: "transparent",
              color: "#64748b",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Kembali
          </button>
        </>
      )}

      {/* Error */}
      {error && (
        <div style={{
          fontSize: "12px",
          color: "#ef4444",
          textAlign: "center",
          padding: "8px 12px",
          background: "rgba(239, 68, 68, 0.1)",
          borderRadius: "8px",
          maxWidth: "280px",
        }}>
          {error}
        </div>
      )}

      {/* Footer */}
      <div style={{
        fontSize: "10px",
        color: "#475569",
        textAlign: "center",
        marginTop: "auto",
        paddingTop: "16px",
      }}>
        Powered by 0G Compute + Storage
      </div>
    </div>
  )
}
