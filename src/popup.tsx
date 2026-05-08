import { useState, useEffect } from "react"
import type { ActivePanel } from "./types"
import { Header } from "./components/Header"
import { WalletStatus } from "./components/WalletStatus"
import { PageSafety } from "./components/PageSafety"
import { RiskScore } from "./components/RiskScore"
import { StatsCard } from "./components/StatsCard"
import { TransactionList } from "./components/TransactionList"
import { ScanPanel } from "./components/ScanPanel"
import { TagPanel } from "./components/TagPanel"
import { SettingsPanel } from "./components/SettingsPanel"
import { ConnectScreen } from "./components/ConnectScreen"
import { useWallet } from "./hooks/useWallet"
import { useTransactions } from "./hooks/useTransactions"
import { usePageStatus } from "./hooks/usePageStatus"
import { getToken, checkAuth, clearToken } from "./lib/api-client"
import "./style.css"

type AuthState = "loading" | "connected" | "disconnected"

function Popup() {
  const [activePanel, setActivePanel] = useState<ActivePanel>("overview")
  const [authState, setAuthState] = useState<AuthState>("loading")
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null)
  const { wallet, loading: walletLoading, connect, disconnect } = useWallet()
  const { transactions, stats, loading: txLoading } = useTransactions(10)
  const pageStatus = usePageStatus()

  // Check auth state on mount
  useEffect(() => {
    async function check() {
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
    check()
  }, [])

  const handleConnected = (walletAddress: string) => {
    setConnectedWallet(walletAddress)
    setAuthState("connected")
  }

  const handleDisconnect = async () => {
    await clearToken()
    chrome.storage.local.remove("sifix_wallet")
    setConnectedWallet(null)
    setAuthState("disconnected")
  }

  // Loading state
  if (authState === "loading") {
    return (
      <div className="w-[380px] min-h-[540px] bg-sifix-bg flex items-center justify-center">
        <div className="text-sifix-muted text-sm">Loading...</div>
      </div>
    )
  }

  // Not connected — show connect screen
  if (authState === "disconnected") {
    return (
      <div className="w-[380px] min-h-[540px] bg-sifix-bg flex flex-col">
        <ConnectScreen onConnected={handleConnected} />
      </div>
    )
  }

  // Connected — show main UI
  return (
    <div className="w-[380px] min-h-[540px] bg-sifix-bg flex flex-col">
      <Header activePanel={activePanel} onPanelChange={(p) => setActivePanel(p as ActivePanel)} />
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activePanel === "overview" && (
          <>
            <WalletStatus wallet={wallet} loading={walletLoading} onConnect={connect} onDisconnect={handleDisconnect} />
            <PageSafety safety={pageStatus.safety} reason={pageStatus.reason} domain={pageStatus.domain} />
            <StatsCard stats={stats} />
            <TransactionList transactions={transactions} loading={txLoading} limit={5} />
          </>
        )}
        {activePanel === "scan" && (
          <>
            <WalletStatus wallet={wallet} loading={walletLoading} onConnect={connect} onDisconnect={handleDisconnect} />
            <ScanPanel />
          </>
        )}
        {activePanel === "history" && (
          <TransactionList transactions={transactions} loading={txLoading} />
        )}
        {activePanel === "tag" && <TagPanel wallet={wallet} />}
        {activePanel === "settings" && (
          <SettingsPanel onDisconnect={handleDisconnect} connectedWallet={connectedWallet} />
        )}
      </div>
      <footer className="px-3 py-2 border-t border-sifix-border flex items-center justify-between">
        <span className="text-[9px] text-sifix-muted/40">
          {connectedWallet ? connectedWallet.slice(0, 6) + "..." + connectedWallet.slice(-4) : "SIFIX"}
        </span>
        <span className="text-[9px] text-sifix-muted/40">Powered by 0G</span>
      </footer>
    </div>
  )
}

export default Popup
