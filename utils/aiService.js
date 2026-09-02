/* ============================================
   ReviveAI — AI & Backend API Client
   Live FastAPI Connectivity with Seamless Fallback
   ============================================ */

const AIService = (() => {
  const API_BASE = 'http://localhost:8000';
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
      tag: 'Rail Fallback',
      tagType: 'info',
      amount: 8200,
      payment_method: 'card',
      failure_reason: 'bank_declined',
      description: '5 previous retries failed. Policy POL-01 prevents further retries and switches rails.',
      expectedAction: 'Offer UPI / Netbanking Rails',
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
    'revenue': {
      text: `Based on my analysis of your revenue telemetry:\n\n📊 **Total MRR**: $127,400\n📈 **Month-over-month growth**: +8.4%\n💰 **Recovered this month**: $32,500\n⚠️ **At-risk revenue**: $41,200\n\nYour recovery rate of 74.2% is well above industry standard (58%). The XGBoost-calibrated recovery agent has prevented $24,800 in churn with smart retry timing.\n\n**Recommendation**: Focus on the 12 critical-risk accounts representing $18,400 in MRR. Proactive outreach can recover 65%+ before next renewal.`,
      chart: null
    },
    'churn': {
      text: `🔮 **Churn Prediction Analysis**:\n\nIdentified **5 high-risk accounts** with risk scores above 65/100.\n\n**Key indicators detected:**\n• 📉 Usage drop > 40% in 3 enterprise accounts\n• 🎫 Support tickets regarding billing in 2 accounts\n• 💳 Repeated card decline codes\n\n**Action Plan**: Trigger automated retention playbooks with 15% annual billing incentives to reduce churn probability from 72% down to 24%.`,
      chart: null
    },
    'payments': {
      text: `💳 **Payment Recovery & Smart Retries**:\n\n**Failed Volume Ingested**: 12 transactions ($24,500)\n**Successfully Recovered**: 8 payments ($18,200)\n**Active Smart Retries**: 4 scheduled in optimal banking windows\n\n**Top Root Causes:**\n1. Card expired (35%)\n2. Insufficient funds (28%)\n3. Bank 3DS timeout (18%)\n4. Network failure (12%)\n\n**Model Insight**: Smart Retries timed after 4h have a 74% success rate compared to naive immediate retries (31%).`,
      chart: null
    },
    'pricing': {
      text: `💰 **Dynamic Pricing Optimization**:\n\nCurrent Starter tier: **$49/mo** → Recommended: **$59/mo**\nPro tier: **$99/mo** → Recommended: **$119/mo**\n\nElasticity modeling indicates a +14.2% MRR expansion with minimal churn sensitivity if coupled with grandfathering.`,
      chart: null
    },
    'default': {
      text: `⚡ **ReviveAI Revenue Copilot Status**:\n\n• **Active Model Engine**: ${activeLLMInfo.active_provider.toUpperCase()} (${activeLLMInfo.configured_model})\n• **FastAPI Backend**: ${backendConnected ? '🟢 Connected (Port 8000)' : '🟡 Standalone Demo Mode'}\n• **Policy Engine Guardrails**: 100% Active (POL-01 through POL-06)\n• **MCP Server**: Ready for external agent connections\n\nAsk me anything about:\n• "Show me revenue recovered this month"\n• "Analyze failed payment telemetry"\n• "Which accounts are at risk of churn?"\n• "Run a smart retry simulation"`,
      chart: null
    }
  };

  function getResponse(query) {
    const q = query.toLowerCase();
    if (q.includes('revenue') || q.includes('mrr') || q.includes('money') || q.includes('earn')) {
      return responses.revenue;
    }
    if (q.includes('churn') || q.includes('risk') || q.includes('leave') || q.includes('cancel')) {
      return responses.churn;
    }
    if (q.includes('payment') || q.includes('fail') || q.includes('decline') || q.includes('retry') || q.includes('recover')) {
      return responses.payments;
    }
    if (q.includes('price') || q.includes('pricing') || q.includes('cost') || q.includes('charge')) {
      return responses.pricing;
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
