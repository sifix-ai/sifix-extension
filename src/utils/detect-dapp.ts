/**
 * SIFIX dApp Detector Utility
 *
 * Detects whether the current tab is a dApp (Web3 application).
 * Used by the popup to determine if TX protection should be active.
 *
 * Adapted from DOMAN's detect-dapp.ts for SIFIX's use case.
 * The extension only intercepts transactions on dApp pages.
 * On regular web2 pages, the extension shows an inactive state.
 */

// Known dApp-related domains
const DAPP_DOMAINS = [
  // DEXs
  "uniswap.org", "sushi.com", "pancakeswap.finance", "aerodrome.finance",
  "curve.fi", "balancer.fi", "1inch.io", "paraswap.io", "kyberswap.com",
  // Lending
  "aave.com", "compound.finance", "morpho.org",
  // Base ecosystem
  "base.org", "basescan.org", "bridge.base.org",
  // NFT
  "opensea.io", "zora.co", "mint.fun", "rarible.com", "blur.io",
  // Bridges
  "across.to", "stargate.finance", "hop.exchange",
  // Other DeFi
  "lido.fi", "rocketpool.net", "eigenlayer.xyz",
  // Wallets/infra
  "metamask.io", "walletconnect.com", "safe.global",
  // 0G ecosystem
  "0g.ai", "zero.network",
]

// URL path keywords that indicate a dApp
const DAPP_PATH_KEYWORDS = [
  "/swap", "/bridge", "/stake", "/pool", "/farm", "/mint",
  "/claim", "/trade", "/liquidity", "/lend", "/borrow",
  "/vault", "/airdrop", "/dao", "/vote", "/governance",
  "/nft", "/marketplace", "/dapp", "/defi", "/yield",
  "/faucet", "/wrap", "/unwrap",
]

/**
 * Check if a URL represents a dApp page.
 * This runs in the popup context using chrome.tabs API.
 * Lightweight checks based on URL only (no DOM access).
 */
export function isDappUrl(url: string): boolean {
  if (!url || !url.startsWith("http")) return false

  try {
    const { hostname, pathname } = new URL(url)
    const lowerPath = pathname.toLowerCase()

    // 1. Known dApp domains
    if (DAPP_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
      return true
    }

    // 2. URL path keywords
    if (DAPP_PATH_KEYWORDS.some(p => lowerPath.includes(p))) {
      return true
    }

    // 3. Common dApp deployment patterns
    if (
      hostname.includes("app.") ||
      hostname.includes("swap.") ||
      hostname.includes("bridge.") ||
      hostname.includes("stake.") ||
      hostname.includes("mint.") ||
      hostname.includes("dao.") ||
      hostname.includes("defi.") ||
      hostname.includes("trade.")
    ) {
      return true
    }

    return false
  } catch {
    return false
  }
}

/**
 * Check if a URL is a chrome:// or browser internal page
 */
export function isInternalPage(url: string): boolean {
  if (!url) return true
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("about:") ||
    url.startsWith("edge://") ||
    url.startsWith("moz-extension://")
  )
}
