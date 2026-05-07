// Type-safe messaging between popup/content/background

import { MSG } from "../constants"

export async function sendToBackground<T = any>(message: {
  type: string
  [key: string]: any
}): Promise<T> {
  return chrome.runtime.sendMessage(message)
}

export async function getWalletState() {
  return sendToBackground<{ address: string | null; chainId: number | null; connected: boolean }>({
    type: MSG.GET_WALLET_STATE,
  })
}

export async function checkAddress(address: string) {
  return sendToBackground({
    type: MSG.CHECK_ADDRESS,
    address,
  })
}

export async function checkDomain(domain: string) {
  return sendToBackground({
    type: MSG.CHECK_DOMAIN,
    domain,
  })
}

export async function scanContract(address: string) {
  return sendToBackground({
    type: MSG.SCAN_CONTRACT,
    address,
  })
}

export async function getAddressTags(address: string) {
  return sendToBackground({
    type: MSG.GET_ADDRESS_TAGS,
    address,
  })
}

export async function submitAddressTag(payload: {
  address: string
  tag: string
  label: string
  evidence: string
  submittedBy: string
}) {
  return sendToBackground({
    type: MSG.SUBMIT_ADDRESS_TAG,
    payload,
  })
}

export async function voteAddressTag(tagId: string, direction: "up" | "down") {
  return sendToBackground({
    type: MSG.VOTE_ADDRESS_TAG,
    tagId,
    direction,
  })
}

export async function getRecentTxs(limit = 10) {
  return sendToBackground({
    type: MSG.GET_RECENT_TXS,
    limit,
  })
}

export async function getPageStatus() {
  return sendToBackground({
    type: MSG.GET_PAGE_STATUS,
  })
}

export async function getStats() {
  return sendToBackground({
    type: MSG.GET_STATS,
  })
}

export async function getSettings() {
  return sendToBackground({
    type: MSG.GET_SETTINGS,
  })
}

export async function updateSettings(settings: Record<string, any>) {
  return sendToBackground({
    type: MSG.UPDATE_SETTINGS,
    settings,
  })
}
