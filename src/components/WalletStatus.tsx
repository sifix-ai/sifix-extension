import type { WalletState } from "../types"
import { shortenAddress } from "../utils/format"
import { cn } from "../utils/cn"

interface WalletStatusProps {
  wallet: WalletState
  loading?: boolean
  onConnect: () => void
  onDisconnect: () => void
}

export function WalletStatus({ wallet, loading, onConnect, onDisconnect }: WalletStatusProps) {
  return (
    <div className="sifix-card">
      <span className="text-xs text-sifix-muted uppercase tracking-wider">Wallet</span>
      <span className="text-sm font-mono text-white">
        {wallet.address ? shortenAddress(wallet.address) : "Not connected"}
      </span>
      {!wallet.connected && (
        <button
          onClick={onConnect}
          disabled={loading}
          className={cn(
            "w-full py-2 rounded-lg text-sm font-medium",
            "bg-sifix-primary text-white",
            loading && "opacity-50"
          )}
        >
          Connect Wallet
        </button>
      )}
    </div>
  )
}
