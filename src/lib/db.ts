import Dexie, { type Table } from "dexie"
import type { TransactionRecord, AddressTag } from "../types"

class SifixDB extends Dexie {
  transactions!: Table<TransactionRecord>
  tags!: Table<AddressTag>

  constructor() {
    super("SifixDB")
    this.version(1).stores({
      transactions: "++id, hash, from, to, chainId, status, timestamp, dappOrigin, riskScore",
      tags: "++id, address, tag, submittedBy, createdAt",
    })
  }
}

export const db = new SifixDB()

// Helper: save a transaction record
export async function saveTransaction(tx: Omit<TransactionRecord, "id">): Promise<number> {
  return db.transactions.add(tx as TransactionRecord)
}

// Helper: get recent transactions
export async function getRecentTransactions(limit = 20): Promise<TransactionRecord[]> {
  return db.transactions
    .orderBy("timestamp")
    .reverse()
    .limit(limit)
    .toArray()
}

// Helper: get stats
export async function getTxStats(): Promise<{
  total: number
  approved: number
  blocked: number
  simulated: number
}> {
  const all = await db.transactions.toArray()
  return {
    total: all.length,
    approved: all.filter(t => t.status === "approved").length,
    blocked: all.filter(t => t.status === "blocked").length,
    simulated: all.filter(t => t.status === "simulated").length,
  }
}

// Helper: save tag
export async function saveTag(tag: Omit<AddressTag, "id">): Promise<number> {
  return db.tags.add(tag as AddressTag)
}

// Helper: get tags for address
export async function getTagsForAddress(address: string): Promise<AddressTag[]> {
  return db.tags.where("address").equals(address.toLowerCase()).toArray()
}
