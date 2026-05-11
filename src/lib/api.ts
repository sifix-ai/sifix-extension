/**
 * SIFIX API Utilities
 * Centralized token and API base URL management
 */

import { DEFAULT_SETTINGS } from "../constants"

/**
 * Get the stored authentication token
 */
export async function getToken(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(["sifix_token"])
    return result.sifix_token || null
  } catch {
    return null
  }
}

/**
 * Set the authentication token
 */
export async function setToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ sifix_token: token }, resolve)
  })
}

/**
 * Clear the authentication token
 */
export async function clearToken(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove("sifix_token", resolve)
  })
}

/**
 * Get the wallet address associated with the token
 */
export async function getWalletFromToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["sifix_wallet"], (result) => {
      resolve(result.sifix_wallet || null)
    })
  })
}

/**
 * Get the dApp API base URL from settings
 */
export async function getApiBase(): Promise<string> {
  try {
    const result = await chrome.storage.local.get(["settings"])
    return result.settings?.dappApiUrl || DEFAULT_SETTINGS.dappApiUrl
  } catch {
    return DEFAULT_SETTINGS.dappApiUrl
  }
}
