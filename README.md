# SIFIX Extension

AI-Powered Wallet Security Extension for Web3

## Features

- 🛡️ **Transaction Interception** - Catches all wallet transactions before execution
- 🧪 **AI-Powered Simulation** - Simulates transactions using 0G Chain + OpenAI GPT-4
- 🎯 **Risk Analysis** - 5-tier risk scoring (SAFE → CRITICAL)
- 🚨 **Threat Intelligence** - Community-driven reputation from 0G Storage
- ⚡ **User Choice** - Trust & Proceed or Simulate First

## Setup

### 1. Install Dependencies

```bash
cd packages/extension
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your API keys
```

Required:
- `PLASMO_PUBLIC_OPENAI_API_KEY` - Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- `PLASMO_PUBLIC_RPC_URL` - 0G Chain RPC (default: testnet)

Optional:
- `PLASMO_PUBLIC_ZEROG_STORAGE_URL` - For threat intelligence
- `PLASMO_PUBLIC_CONTRACT_ADDRESS` - Reputation contract (after deployment)

### 3. Build Extension

```bash
pnpm build
```

Output: `build/chrome-mv3-prod/`

### 4. Load in Chrome

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select `build/chrome-mv3-prod/` folder

## Development

```bash
pnpm dev
```

Hot reload enabled. Changes auto-rebuild.

## Architecture

```
Extension
├── TX Interceptor (content script)
│   └── Proxy window.ethereum
│   └── Show interactive popup
│
├── Background Worker (service worker)
│   └── SecurityAgent integration
│   └── Transaction simulation
│   └── AI risk analysis
│
└── SecurityAgent (@sifix/agent)
    ├── TransactionSimulator (viem)
    ├── AIAnalyzer (OpenAI GPT-4)
    └── ThreatIntel (0G Storage)
```

## Risk Levels

| Score | Level | Color | Action |
|-------|-------|-------|--------|
| 0-20 | SAFE | 🟢 Green | Auto-proceed |
| 20-40 | LOW | 🔵 Blue | Warn user |
| 40-60 | MEDIUM | 🟡 Yellow | Simulate recommended |
| 60-80 | HIGH | 🔴 Red | Block recommended |
| 80-100 | CRITICAL | 🚨 Dark Red | Block strongly |

## Testing

Test on live dApps:
- Uniswap: https://app.uniswap.org
- OpenSea: https://opensea.io
- Any Web3 dApp with MetaMask

## Troubleshooting

**Extension not loading?**
- Check Chrome console for errors
- Verify manifest.json exists in build folder
- Try rebuilding: `pnpm build`

**Simulation failing?**
- Check .env has valid OPENAI_API_KEY
- Check RPC_URL is accessible
- Check browser console for errors

**Popup not showing?**
- Check content script is injected (DevTools → Sources)
- Verify window.ethereum exists
- Try refreshing the page

## License

MIT
