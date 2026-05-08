// Extension content script - intercepts wallet transactions

import process from "process";

interface TransactionRequest {
  from: string;
  to: string;
  data?: string;
  value?: string;
}

interface RiskAnalysis {
  riskScore: number;
  confidence: number;
  reasoning: string;
  threats: string[];
  recommendation: 'BLOCK' | 'WARN' | 'ALLOW';
}

const API_URL = process.env.PLASMO_PUBLIC_DAPP_API_URL || "http://localhost:3000/api/v1";

/**
 * Intercept wallet provider requests
 */
function interceptWalletProvider() {
  const originalRequest = window.ethereum?.request;
  
  if (!originalRequest) {
    console.warn('[SIFIX] No wallet provider found');
    return;
  }

  window.ethereum.request = async function(args: any) {
    // Intercept transaction signing methods
    if (
      args.method === 'eth_sendTransaction' ||
      args.method === 'eth_signTransaction'
    ) {
      const tx = args.params[0] as TransactionRequest;
      
      console.log('[SIFIX] Intercepted transaction:', tx);

      // Analyze transaction before signing
      const analysis = await analyzTransaction(tx);

      // Show risk modal to user
      const userDecision = await showRiskModal(tx, analysis);

      if (!userDecision) {
        throw new Error('Transaction blocked by SIFIX Security Agent');
      }
    }

    // Call original method
    return originalRequest.apply(this, [args]);
  };

  console.log('[SIFIX] Wallet provider intercepted');
}

/**
 * Analyze transaction via API
 */
async function analyzTransaction(tx: TransactionRequest): Promise<RiskAnalysis> {
  try {
    const response = await fetch(`${API_URL}/api/agent/analyze-tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data.analysis;
  } catch (error) {
    console.error('[SIFIX] Analysis failed:', error);
    
    // Fail-safe: allow transaction if analysis fails
    return {
      riskScore: 0,
      confidence: 0,
      reasoning: 'Analysis unavailable - proceeding with caution',
      threats: [],
      recommendation: 'WARN',
    };
  }
}

/**
 * Show risk modal to user
 */
async function showRiskModal(
  tx: TransactionRequest,
  analysis: RiskAnalysis
): Promise<boolean> {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'sifix-risk-modal';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    // Risk color
    const riskColor = 
      analysis.recommendation === 'BLOCK' ? '#ef4444' :
      analysis.recommendation === 'WARN' ? '#f59e0b' :
      '#10b981';

    // Modal content
    overlay.innerHTML = `
      <div style="
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      ">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
          <div style="
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: ${riskColor};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
          ">
            ${analysis.recommendation === 'BLOCK' ? '🛑' : 
              analysis.recommendation === 'WARN' ? '⚠️' : '✅'}
          </div>
          <div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 600;">
              ${analysis.recommendation === 'BLOCK' ? 'High Risk Detected' :
                analysis.recommendation === 'WARN' ? 'Proceed with Caution' :
                'Transaction Looks Safe'}
            </h2>
            <p style="margin: 4px 0 0; color: #666; font-size: 14px;">
              Risk Score: ${analysis.riskScore}/100 (${Math.round(analysis.confidence * 100)}% confidence)
            </p>
          </div>
        </div>

        <div style="
          background: #f9fafb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        ">
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #374151;">
            ${analysis.reasoning}
          </p>
        </div>

        ${analysis.threats.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 8px;">
              Detected Threats:
            </h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #374151;">
              ${analysis.threats.map(t => `<li>${t}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div style="
          display: flex;
          gap: 12px;
          margin-top: 24px;
        ">
          <button id="sifix-block-btn" style="
            flex: 1;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            background: white;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">
            Block Transaction
          </button>
          <button id="sifix-proceed-btn" style="
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 8px;
            background: ${riskColor};
            color: white;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">
            ${analysis.recommendation === 'BLOCK' ? 'Proceed Anyway' : 'Proceed'}
          </button>
        </div>

        <p style="
          margin: 16px 0 0;
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
        ">
          Protected by SIFIX x 0G Security Agent
        </p>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners
    document.getElementById('sifix-block-btn')?.addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });

    document.getElementById('sifix-proceed-btn')?.addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });
  });
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', interceptWalletProvider);
} else {
  interceptWalletProvider();
}

console.log('[SIFIX] Security Agent loaded');
