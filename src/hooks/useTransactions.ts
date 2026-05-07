import { useState, useEffect, useCallback } from "react"
import type { TransactionRecord } from "../types"
import { getRecentTransactions, getTxStats } from "../lib/db"

export function useTransactions(limit = 10) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [stats, setStats] = useState({ total: 0, approved: 0, blocked: 0, simulated: 0 })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const [txs, s] = await Promise.all([
        getRecentTransactions(limit),
        getTxStats(),
      ])
      setTransactions(txs)
      setStats(s)
    } catch (e) {
      console.error("Failed to load transactions:", e)
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { transactions, stats, loading, refresh }
}
