import { useState } from "react"
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
import { useWallet } from "./hooks/useWallet"
import { useTransactions } from "./hooks/useTransactions"
import { usePageStatus } from "./hooks/usePageStatus"
import "./style.css"

function Popup() {
  const [activePanel, setActivePanel] = useState<ActivePanel>("overview")
  const { wallet, loading: walletLoading, connect, disconnect } = useWallet()
  const { transactions, stats, loading: txLoading } = useTransactions(10)
  const pageStatus = usePageStatus()

  return (
    <div className="w-[380px] min-h-[540px] bg-sifix-bg flex flex-col">
      <Header activePanel={activePanel} onPanelChange={(p) => setActivePanel(p as ActivePanel)} />
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activePanel === "overview" && (
          <>
            <WalletStatus wallet={wallet} loading={walletLoading} onConnect={connect} onDisconnect={disconnect} />
            <PageSafety safety={pageStatus.safety} reason={pageStatus.reason} domain={pageStatus.domain} />
            <StatsCard stats={stats} />
            <TransactionList transactions={transactions} loading={txLoading} limit={5} />
          </>
        )}
        {activePanel === "scan" && (
          <>
            <WalletStatus wallet={wallet} loading={walletLoading} onConnect={connect} onDisconnect={disconnect} />
            <ScanPanel />
          </>
        )}
        {activePanel === "history" && (
          <TransactionList transactions={transactions} loading={txLoading} />
        )}
        {activePanel === "tag" && <TagPanel wallet={wallet} />}
        {activePanel === "settings" && <SettingsPanel />}
      </div>
      <footer className="px-3 py-2 border-t border-sifix-border flex items-center justify-between">
        <span className="text-[9px] text-sifix-muted/40">
          {stats.total > 0 ? stats.blocked + " threats blocked" : "SIFIX - AI Wallet Security"}
        </span>
        <span className="text-[9px] text-sifix-muted/40">Powered by 0G</span>
      </footer>
    </div>
  )
}

export default Popup
