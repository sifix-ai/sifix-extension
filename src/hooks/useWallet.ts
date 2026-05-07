import { useState, useCallback } from "react"
import type { WalletState } from "../types"
import { MSG } from "../constants"

const DEFAULT_WALLET: WalletState = {
  address: null,
  chainId: null,
  connected: false,
  balance: null,
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>(DEFAULT_WALLET)
  const [loading, setLoading] = useState(false)

  const loadState = useCallback(async () => {
    try {
      const resp = await chrome.runtime.sendMessage({ type: MSG.GET_WALLET_STATE })
      if (resp && resp.data) {
        setWallet(resp.data)
      }
    } catch (e) {
      console.error("Failed to get wallet state:", e)
    }
  }, [])

  const connect = useCallback(async () => {
    setLoading(true)
    try {
      const resp = await chrome.runtime.sendMessage({ type: MSG.CONNECT_WALLET })
      if (resp && resp.data) {
        setWallet(resp.data)
      }
    } catch (e) {
      console.error("Connect wallet error:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    try {
      await chrome.runtime.sendMessage({ type: MSG.DISCONNECT_WALLET })
      setWallet(DEFAULT_WALLET)
    } catch (e) {
      console.error("Disconnect error:", e)
    }
  }, [])

  // Load on mount
  loadState()

  return { wallet, loading, connect, disconnect, refresh: loadState }
}
