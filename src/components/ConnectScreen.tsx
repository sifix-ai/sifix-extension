import { useState } from "react"

interface ConnectScreenProps {
  onConnected: (walletAddress: string) => void
}

// Send message to background script (which has access to active tab's window.ethereum)
function sendToBackground(type: string, payload?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, ...payload }, (response) => {
      if (response?.error) {
        reject(new Error(response.error))
      } else if (response?.data) {
        resolve(response.data)
      } else {
        reject(new Error("No response from background"))
      }
    })
  })
}

export function ConnectScreen({ onConnected }: ConnectScreenProps) {
  const [status, setStatus] = useState<"idle" | "connecting" | "signing" | "verifying" | "error">("idle")
  const [error, setError] = useState<string>("")

  const handleConnect = async () => {
    setStatus("connecting")
    setError("")

    try {
      // Step 1: Get accounts via background → active tab → window.ethereum
      const { accounts } = await sendToBackground("SIFIX_AUTH_CONNECT")

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found in wallet")
      }

      const walletAddress = accounts[0]

      // Step 2: Get nonce from dApp
      const { getNonce, verifySignature, setToken } = await import("../lib/api-client")
      const nonceResp = await getNonce(walletAddress)

      if (!nonceResp.message) {
        throw new Error("Failed to get auth nonce from dApp")
      }

      // Step 3: Sign message via background → active tab → window.ethereum
      setStatus("signing")
      const { signature } = await sendToBackground("SIFIX_AUTH_SIGN", {
        walletAddress,
        message: nonceResp.message,
      })

      if (!signature) {
        throw new Error("Failed to sign message")
      }

      // Step 4: Verify signature with dApp API
      setStatus("verifying")
      const verifyResp = await verifySignature({
        walletAddress,
        signature,
        message: nonceResp.message,
      })

      if (!verifyResp.success || !verifyResp.token) {
        throw new Error("Signature verification failed")
      }

      // Step 5: Store token
      await setToken(verifyResp.token)
      chrome.storage.local.set({ sifix_wallet: verifyResp.walletAddress })

      setStatus("idle")
      onConnected(verifyResp.walletAddress)
    } catch (err: any) {
      setStatus("error")
      setError(err.message || "Connection failed")

      setTimeout(() => {
        setStatus("idle")
        setError("")
      }, 5000)
    }
  }

  const statusText: Record<string, string> = {
    idle: "",
    connecting: "Connecting wallet...",
    signing: "Please sign the message in your wallet...",
    verifying: "Verifying signature...",
    error: "",
  }

  const isConnecting = status === "connecting" || status === "signing" || status === "verifying"

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 16px",
      minHeight: "320px",
      gap: "16px",
    }}>
      {/* Logo */}
      <div style={{
        fontSize: "32px",
        fontWeight: 700,
        color: "#fff",
        letterSpacing: "-0.5px",
      }}>
        SIFIX
      </div>
      <div style={{
        fontSize: "13px",
        color: "#94a3b8",
        textAlign: "center",
      }}>
        AI-Powered Wallet Security
      </div>

      {/* Connect Button */}
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        style={{
          marginTop: "16px",
          padding: "12px 32px",
          borderRadius: "12px",
          border: "none",
          background: isConnecting ? "#334155" : "#3b82f6",
          color: isConnecting ? "#94a3b8" : "#fff",
          fontSize: "15px",
          fontWeight: 600,
          cursor: isConnecting ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          width: "100%",
          maxWidth: "280px",
        }}
      >
        {isConnecting ? statusText[status] : "Connect to SIFIX"}
      </button>

      {/* Spinner */}
      {isConnecting && (
        <div style={{
          fontSize: "12px",
          color: "#64748b",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          <span style={{
            display: "inline-block",
            width: "12px",
            height: "12px",
            border: "2px solid #3b82f6",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
          {statusText[status]}
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
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

      {/* Info */}
      <div style={{
        fontSize: "11px",
        color: "#475569",
        textAlign: "center",
        maxWidth: "240px",
        marginTop: "8px",
      }}>
        Sign a message to verify your wallet. No gas fees required.
      </div>
    </div>
  )
}
