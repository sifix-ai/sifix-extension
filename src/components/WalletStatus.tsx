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
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-sifix-text-40 uppercase tracking-widest font-sans font-medium">Wallet</span>
        {wallet.connected && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-sifix-safe animate-pulse" />
            <span className="text-[10px] text-sifix-safe font-medium">Connected</span>
          </div>
        )}
      </div>

      {wallet.address ? (
        <span className="text-sm font-mono text-sifix-text font-medium">
          {shortenAddress(wallet.address)}
        </span>
      ) : (
        <span className="text-sm text-sifix-text-40">Not connected</span>
      )}

      {!wallet.connected && (
        <button
          onClick={onConnect}
          disabled={loading}
          className={cn(
            "w-full mt-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
            "sifix-gradient text-white hover:shadow-glow active:scale-[0.98]",
            loading && "opacity-50 cursor-not-allowed"
          )}
        >
          Connect Wallet
        </button>
      )}
    </div>
  )
}
