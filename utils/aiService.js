/* ============================================
   ReviveAI — AI & Backend API Client
   Live FastAPI Connectivity with Seamless Fallback
   ============================================ */

const AIService = (() => {
  const API_BASE = (typeof window !== 'undefined' && window.location.hostname !== 'localhost')
    ? window.location.origin
    : (window.location.port === '3000' ? 'http://localhost:8000' : window.location.origin);
  let backendConnected = false;
  let activeLLMInfo = { active_provider: 'heuristic', configured_model: 'gemini-2.0-flash' };

  // Check live backend connectivity on load
  async function checkBackendHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        backendConnected = true;
        // Fetch LLM status
        try {
          const llmRes = await fetch(`${API_BASE}/api/recovery/llm-status`);
          if (llmRes.ok) {
            activeLLMInfo = await llmRes.json();
          }
        } catch (e) {}
      } else {
        backendConnected = false;
      }
    } catch (e) {
      backendConnected = false;
    }
    return backendConnected;
  }

  // Trigger check immediately
  checkBackendHealth();

  function isConnected() {
    return backendConnected;
  }

  function getLLMInfo() {
    return activeLLMInfo;
  }

  // Switch LLM Provider dynamically
  async function switchLLMProvider(provider, model = null) {
    activeLLMInfo.active_provider = provider;
    if (model) activeLLMInfo.configured_model = model;

    if (backendConnected) {
      try {
        const res = await fetch(`${API_BASE}/api/recovery/llm-provider`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, model }),
        });
        if (res.ok) {
          activeLLMInfo = await res.json();
        }
      } catch (e) {
        console.warn('Failed to switch LLM provider on backend:', e);
      }
    }
    return activeLLMInfo;
  }

  // Preset scenarios tailored for Razorpay Hackathon demonstrations
  const presetScenarios = {
    upi_timeout: {
      id: 'upi_timeout',
      name: '⚡ High-Recovery UPI Failure',
      tag: 'Auto-Recoverable',
      tagType: 'success',
      amount: 4999,
      payment_method: 'upi',
      failure_reason: 'network_error',
      description: 'Transient UPI switch network timeout. High recovery probability (89%).',
      expectedAction: 'Smart Retry in 1.5h',
      policyStatus: 'POL-01 ✓ Approved',
      erv: 4449,
      prob: 0.89,
    },
    fraud_alert: {
      id: 'fraud_alert',
      name: '🚨 High-Value Fraud Anomaly',
      tag: 'Security Intercept',
      tagType: 'danger',
      amount: 85000,
      payment_method: 'card',
      failure_reason: 'fraud_flag',
      description: '₹85,000 credit card transaction with high risk score. Policy POL-02 & POL-03 trigger.',
      expectedAction: 'Escalate to HITL Queue',
      policyStatus: 'POL-02 ✗ Blocked (Fraud)',
      erv: 8500,
      prob: 0.10,
    },
    expired_card: {
      id: 'expired_card',
      name: '💳 Expired Card Subscription',
      tag: 'Smart Dunning',
      tagType: 'warning',
      amount: 12499,
      payment_method: 'card',
      failure_reason: 'card_expired',
      description: 'Card expired on recurring billing. Policy POL-04 generates 1-click update link.',
      expectedAction: 'Send WhatsApp Update Link',
      policyStatus: 'POL-04 ✓ Link Generated',
      erv: 7499,
      prob: 0.60,
    },
    max_retries: {
      id: 'max_retries',
      name: '🔄 Max Retries Exhausted',
      tag: 'Smart Fallback',
      tagType: 'info',
      amount: 8200,
      payment_method: 'card',
      failure_reason: 'bank_declined',
      description: '5 previous retries failed. Policy POL-01 prevents further retries and switches payment method.',
      expectedAction: 'Offer UPI / Netbanking Options',
      policyStatus: 'POL-01 ⚠️ Limit Reached',
      erv: 3280,
      prob: 0.40,
    }
  };

  function getPresets() {
    return presetScenarios;
  }

  // Process a recovery transaction via live FastAPI or mock
  async function processRecovery(transactionId, autoExecute = true) {
    if (backendConnected) {
      try {
        const res = await fetch(`${API_BASE}/api/recovery/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transaction_id: transactionId, auto_execute: autoExecute }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        console.warn('Backend call failed, using mock fallback', e);
      }
    }

    // Fallback response simulation
    return {
      transaction_id: transactionId,
      recovery_probability: 0.82,
      expected_recovery_value: 4099,
      diagnosis: "Temporary 3D-Secure authentication timeout. Scheduled smart retry window.",
      policy_approved: true,
      policy_violations: [],
      final_action: "retry",
      status: "completed",
    };
  }

  // Simulate a live webhook event on the backend
  async function simulateWebhook({ amount = 4999, payment_method = 'upi', failure_reason = 'authentication_failure' } = {}) {
    if (backendConnected) {
      try {
        const res = await fetch(`${API_BASE}/api/webhooks/simulate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(amount),
            payment_method: payment_method,
            failure_reason: failure_reason,
            auto_execute: true,
          }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        console.warn('Webhook simulation failed on server:', e);
      }
    }

    return {
      event_id: 'evt_' + Math.random().toString(36).substring(2, 9),
      status: 'completed',
      message: 'Simulated failure ingested (standalone demo mode)',
      transaction_id: 'sim_txn_' + Math.floor(Math.random() * 90000 + 10000),
      agent_decision: {
        recovery_probability: 0.85,
        policy_approved: true,
        final_action: 'retry',
      }
    };
  }

  // Fetch human-in-the-loop review queue
  async function fetchEscalations() {
    if (backendConnected) {
      try {
        const res = await fetch(`${API_BASE}/api/recovery/escalations`);
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {}
    }
    return {
      count: 2,
      escalations: [
        {
          escalation_id: 1,
          transaction_id: "txn_esc_4901",
          customer_id: "cust_enterprise_88",
          amount: 45000,
          failure_reason: "fraud_flag",
          reason: "Policy Block: FRAUD_BLOCK — Automatic retry strictly forbidden",
          priority: "high",
          created_at: new Date().toISOString(),
        },
        {
          escalation_id: 2,
          transaction_id: "txn_esc_9102",
          customer_id: "cust_saas_41",
          amount: 32000,
          failure_reason: "bank_declined",
          reason: "Policy Block: HIGH_AMOUNT_LOW_PROBABILITY — Recovery probability < 30%",
          priority: "high",
          created_at: new Date().toISOString(),
        }
      ]
    };
  }

  // Execute manual HITL override
  async function submitOverride(transactionId, action, reason) {
    if (backendConnected) {
      try {
        const res = await fetch(`${API_BASE}/api/recovery/override`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction_id: transactionId,
            action: action,
            operator_reason: reason || 'Operator verified customer identity',
          }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {}
    }

    return {
      success: true,
      transaction_id: transactionId,
      action_taken: action,
      operator_reason: reason,
    };
  }

  // Simulated AI responses for revenue queries
  const responses = {
    'retry_rate': {
      text: `📈 **Smart Retry Performance & Success Rate Analysis**:

• **Overall Smart Retry Success Rate**: **74.2%** (vs 31.4% industry benchmark for naive retries)
• **Total Retries Scheduled**: 124 transactions across the past 30 days
• **Successfully Recovered**: 92 payments ($21,450 / ₹17.9 Lakhs)
• **Net Lift Over Baseline**: **+42.8% improvement**

**Performance by AI Optimal Time Window:**
• **1.5h – 3h Window (UPI & Network Glitches)**: 89.2% recovery
• **6h – 12h Window (3DS Authentication Dropoffs)**: 71.5% recovery
• **24h – 48h Window (Insufficient Funds / Payday Sync)**: 64.8% recovery

**Safety Compliance**: 0 card-blocking penalties recorded under Policy POL-01 guardrails.`,
      chart: null
    },
    'patterns': {
      text: `🔍 **Failed Payment Telemetry & Root Cause Breakdown**:

Analyzed **142 failed transaction events** over the last 30 days:

**Top Failure Root Causes:**
1. **Card Expired / Invalid (35%)**: Leading driver on recurring monthly SaaS billing
2. **Insufficient Funds (28%)**: Heavily clustered between the 22nd and 28th of each month
3. **3DS Authentication Timeouts (18%)**: Mobile checkout OTP abandonment
4. **Bank Switch / Network Glitches (12%)**: Transient downtime during peak clearing hours
5. **Fraud Security Flags (7%)**: Safely intercepted and blocked by Policy POL-02

**Peak Failure Traffic Windows:**
• 11:30 AM – 1:30 PM (High daytime UPI banking switch congestion)
• 7:00 PM – 9:30 PM (Evening mobile payment rush)`,
      chart: null
    },
    'strategy': {
      text: `🚀 **Strategic Playbook for Maximizing Revenue Recovery**:

To elevate your recovery rate from **74.2% to 85%+**, our AI agent recommends these 4 high-impact levers:

1. **Multi-Rail Payment Fallbacks (+12% Recovery Lift)**
   When recurring card debits fail twice, automatically send an instant Razorpay UPI AutoPay or Netbanking payment link.

2. **1-Click WhatsApp Dunning for Expired Cards (62% Resolution)**
   Traditional billing emails average a 14% open rate. Pre-authenticated WhatsApp card update links achieve 4.4x higher resolution within 24 hours.

3. **AI Dynamic Cooldown Timing**
   Never retry insufficient funds immediately. Delay retries by 24h to 48h to align with corporate payroll direct-deposit cycles.

4. **Preemptive Expiry Warnings (POL-04)**
   Notify subscribers 7 days prior to card expiration to replace details before billing fails.`,
      chart: null
    },
    'revenue': {
      text: `💰 **Revenue Recovery Summary (Current Month)**:

• **Total Monthly Recurring Revenue (MRR)**: $127,400 (₹1.06 Cr)
• **Total Lost Revenue Intercepted**: $41,200 (₹34.4 Lakhs)
• **Successfully Recovered by Agent**: **$32,500 (₹27.1 Lakhs)**
• **Net Month-Over-Month Lift**: **+8.4%**
• **Estimated Annualized Run-Rate Saved**: **$390,000 (₹3.25 Cr)**

Your current ROI multiplier is **9.4x** based on platform cost versus recovered cash.`,
      chart: null
    },
    'churn': {
      text: `🔮 **Customer Churn Risk & Retention Intelligence**:

Identified **5 critical-risk accounts** with risk scores above 65/100 representing **$18,400 in MRR**:

**Key Churn Indicators Detected:**
• Product usage drop > 40% over 30 days (3 enterprise accounts)
• Unresolved billing or card failure tickets (2 accounts)
• Low NPS ratings (< 6.0) submitted post-incident

**Recommended Action**: Dispatch automated retention workflows with a 15% annual commitment discount to lower churn probability from 72% to 24%.`,
      chart: null
    },
    'engine': {
      text: `⚡ **Active Model-Agnostic LLM Engine Status**:

• **Active Reasoning Engine**: ${activeLLMInfo.active_provider.toUpperCase()} (${activeLLMInfo.configured_model})
• **Average Inference Latency**: 118ms
• **ML Calibration Layer**: XGBoost Calibrated Classifier (Isotonic Regression)
• **Policy Engine Guardrails**: 100% Active (POL-01 through POL-06)
• **FastAPI Backend**: ${backendConnected ? '🟢 Connected' : '🟡 Standalone Demo Mode'}
• **MCP Server Protocol**: Ready for external agent orchestration via Claude Desktop & Cursor`,
      chart: null
    },
    'pricing': {
      text: `💰 **Dynamic Pricing Optimization**:

Current Starter tier: **$49/mo** → Recommended: **$59/mo**
Pro tier: **$99/mo** → Recommended: **$119/mo**

Elasticity modeling indicates a +14.2% MRR expansion with minimal churn sensitivity if coupled with grandfathering.`,
      chart: null
    },
    'default': {
      text: `⚡ **ReviveAI Revenue Copilot Ready**:

I continuously monitor your revenue recovery, payment gateway webhooks, and customer churn risks.

**Suggested queries to ask:**
• "What is our smart retry success rate?"
• "Analyze our failed payment patterns"
• "What more better strategy we can use for more recovery?"
• "How much revenue did we recover this month?"
• "Which customers are most likely to churn?"`,
      chart: null
    }
  };

  function getResponse(query) {
    const q = query.toLowerCase().trim();

    // 1. Success rate / retry rate queries
    if (q.includes('success rate') || q.includes('retry rate') || (q.includes('retry') && q.includes('rate')) || q.includes('how many retries succeed')) {
      return responses.retry_rate;
    }

    // 2. Failed payment patterns / root causes
    if (q.includes('pattern') || q.includes('root cause') || q.includes('why do payments fail') || (q.includes('fail') && q.includes('analyze')) || q.includes('telemetry breakdown')) {
      return responses.patterns;
    }

    // 3. Better strategy / recovery improvement
    if (q.includes('strategy') || q.includes('better') || q.includes('improve') || q.includes('more recovery') || q.includes('tactic') || q.includes('recommendation') || q.includes('playbook')) {
      return responses.strategy;
    }

    // 4. Revenue & MRR
    if (q.includes('how much') || q.includes('revenue') || q.includes('mrr') || q.includes('money') || q.includes('earned')) {
      return responses.revenue;
    }

    // 5. Churn & cancellation
    if (q.includes('churn') || q.includes('at risk') || q.includes('cancel') || q.includes('leave') || q.includes('retention')) {
      return responses.churn;
    }

    // 6. Engine / LLM / Model status
    if (q.includes('engine') || q.includes('llm') || q.includes('model') || q.includes('gemini') || q.includes('ollama')) {
      return responses.engine;
    }

    // 7. Pricing
    if (q.includes('price') || q.includes('pricing') || q.includes('cost') || q.includes('charge')) {
      return responses.pricing;
    }

    // 8. General payment / retry / fallback
    if (q.includes('payment') || q.includes('fail') || q.includes('decline') || q.includes('retry')) {
      return responses.retry_rate;
    }

    return responses.default;
  }

  async function streamResponse(query, onChunk, onComplete) {
    const response = getResponse(query);
    const text = response.text;
    const words = text.split(' ');
    let current = '';

    for (let i = 0; i < words.length; i++) {
      current += (i > 0 ? ' ' : '') + words[i];
      onChunk(current);
      await new Promise(r => setTimeout(r, 12 + Math.random() * 25));
    }

    if (onComplete) onComplete(response);
  }

  function generateDunningEmail(customer, tone, step) {
    const emails = {
      'Friendly': {
        subject: `Quick heads up about your payment, ${customer.name.split(' ')[0]}`,
        body: `Hi ${customer.name.split(' ')[0]},\n\nJust a friendly note — it looks like your recent payment of ${Formatters.currency(customer.mrr)} didn't go through. This happens sometimes, and it's usually an easy fix!\n\nHere are a few things you can try:\n• Update your payment method in your account settings\n• Make sure your card hasn't expired\n• Contact your bank if the issue persists\n\nYour ${customer.plan} plan access won't be affected right away — we've got you covered for the next few days.\n\nCheers,\nThe ReviveAI Team ⚡`
      },
      'Helpful': {
        subject: `Let's get your ${customer.plan} plan payment sorted`,
        body: `Hey ${customer.name.split(' ')[0]},\n\nWe noticed your payment of ${Formatters.currency(customer.mrr)} for your ${customer.plan} plan hasn't been processed yet. We've automatically scheduled an AI-optimized retry window, but updating your payment method now guarantees zero interruption.\n\nBest,\nReviveAI Billing Team`
      },
      'Urgent': {
        subject: `⚠️ Action required: ${customer.company} payment issue notice`,
        body: `Dear ${customer.name},\n\nDespite automated recovery attempts, payment of ${Formatters.currency(customer.mrr)} remains pending.\n\nPlease update your payment information within 48 hours to prevent service degradation.\n\nSincerely,\nReviveAI Team`
      }
    };
    return emails[tone] || emails['Friendly'];
  }

  function getSuggestions() {
    return [
      'How much revenue did we recover this month?',
      'Which customers are most likely to churn?',
      'Analyze our failed payment patterns',
      'Show me our active Model-Agnostic LLM engine',
      'What is our smart retry success rate?'
    ];
  }

  return {
    checkBackendHealth,
    isConnected,
    getLLMInfo,
    switchLLMProvider,
    getPresets,
    processRecovery,
    simulateWebhook,
    fetchEscalations,
    submitOverride,
    streamResponse,
    generateDunningEmail,
    getSuggestions,
  };
})();
