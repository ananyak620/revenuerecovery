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
    },
    voluntary_churn: {
      id: 'voluntary_churn',
      name: '🔁 Voluntary Churn (Price Resistance)',
      tag: 'Self-Correction Loop',
      tagType: 'primary',
      amount: 8500,
      payment_method: 'subscription',
      failure_reason: 'customer_cancellation',
      description: 'Customer cancelled recurring mandate due to price resistance. Strategist proposes 25% discount, Auditor catches margin cap violation (>20%) and triggers re-planning loop down to 15%.',
      expectedAction: 'Offer 15% Courtesy Renewal',
      policyStatus: 'POL-07 Margin Cap (1 Revision)',
      erv: 6120,
      prob: 0.72,
    }
  };

  const churnPresets = {
    critical_alpha: {
      id: 'critical_alpha',
      name: '🚨 Alpha Corp (Usage Collapse)',
      tag: 'Critical Churn (94%)',
      tagType: 'danger',
      company: 'Alpha Corp',
      mrr: 18500,
      riskScore: 94,
      keyDriver: 'Usage Collapse (-58%) & 7 Tickets',
      expectedPlaybook: 'PB-PROACTIVE-ONBOARDING-RESCUE',
      expectedAction: 'Executive Concierge Rescue',
      guardrailRule: 'POL-07 Margin Cap <= 20%',
      churnReason: 'Declining product usage (-58% over 30d), opened 7 support tickets',
      description: 'Usage dropped 58%, 7 unresolved tickets, NPS 2/10. High probability of imminent contract cancellation.',
      plan: 'Enterprise',
      industry: 'SaaS'
    },
    dataverse_renewal: {
      id: 'dataverse_renewal',
      name: '💼 DataVerse Co (Renewal Window)',
      tag: 'High Risk (78%)',
      tagType: 'warning',
      company: 'DataVerse Co',
      mrr: 24900,
      riskScore: 78,
      keyDriver: 'Contract Expiration & Competitor Bake-off',
      expectedPlaybook: 'PB-ANNUAL-LOCKIN-EXECUTIVE',
      expectedAction: '10% Annual Lock-in Proposal',
      guardrailRule: 'POL-07 Margin Cap <= 20%',
      churnReason: 'Contract renewal approaching + Competitor evaluation detected',
      description: 'Annual renewal in 18 days. Competitor bake-off detected in procurement.',
      plan: 'Business',
      industry: 'Analytics'
    },
    byteshift_inactive: {
      id: 'byteshift_inactive',
      name: '📉 ByteShift Labs (Zero Adoption)',
      tag: 'Adoption Plateau',
      tagType: 'info',
      company: 'ByteShift Labs',
      mrr: 12000,
      riskScore: 65,
      keyDriver: '16d Inactive & 18% Feature Adoption',
      expectedPlaybook: 'PB-PROACTIVE-ONBOARDING-RESCUE',
      expectedAction: 'Assign Success Engineer Hotline',
      guardrailRule: 'POL-05 Dunning Frequency Cap',
      churnReason: 'No team login in 16+ days; feature adoption stalled at 18%',
      description: 'Workspace abandoned for 16 days. Onboarding drop-off detected.',
      plan: 'Professional',
      industry: 'DevTools'
    },
    pulsepoint_price: {
      id: 'pulsepoint_price',
      name: '🔁 PulsePoint (Price Resistance)',
      tag: 'Self-Correction Loop',
      tagType: 'primary',
      company: 'PulsePoint Analytics',
      mrr: 16500,
      riskScore: 82,
      keyDriver: 'Downgrade / Voluntary Price Sensitivity',
      expectedPlaybook: 'PB-VOLUNTARY-PRICE-RESISTANCE',
      expectedAction: 'Concede 15% Courtesy Renewal',
      guardrailRule: 'POL-07 Margin Cap (25% -> 15% Reflection)',
      churnReason: 'Downgrade request initiated citing price sensitivity',
      description: 'User initiated voluntary downgrade. Strategist will propose 25% discount, Auditor margin cap will trigger reflection loop.',
      plan: 'Enterprise',
      industry: 'MarTech'
    }
  };

  function getPresets() {
    return presetScenarios;
  }

  function getChurnPresets() {
    return churnPresets;
  }

  // Simulate a Proactive Retention Multi-Agent Mission
  async function simulateChurnRetention(input) {
    let customer = typeof input === 'string' ? churnPresets[input] : input;
    if (!customer) customer = churnPresets.critical_alpha;

    const company = customer.company || customer.name || 'Target Account';
    const mrr = customer.mrr || 15000;
    const riskScore = customer.riskScore || 85;
    const reason = customer.churnReason || 'Declining usage pattern';
    const isPriceSensitive = reason.toLowerCase().includes('price') || customer.id === 'pulsepoint_price' || reason.toLowerCase().includes('downgrade') || reason.toLowerCase().includes('budget');
    const isHighValue = mrr > 20000;

    // Backend attempt if online
    if (backendConnected) {
      try {
        const res = await fetch(`${API_BASE}/api/recovery/churn-agent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: customer.id || 'cus_target',
            company: company,
            mrr: mrr,
            risk_score: riskScore,
            churn_reason: reason,
            auto_execute: false
          })
        });
        if (res.ok) {
          const backendData = await res.json();
          if (backendData && backendData.stages) {
            return backendData;
          }
        }
      } catch (e) {
        console.warn('Backend churn retention call failed, using client simulation', e);
      }
    }

    let playbook = 'PB-RETENTION-ONBOARDING';
    let action = 'schedule_csm_call';
    let discount = 0;
    let revisions = 0;
    let hitlStatus = isHighValue ? 'PENDING_AE_REVIEW' : 'AUTONOMOUS_APPROVED';
    let retainProb = Math.max(0.48, Math.min(0.92, (100 - riskScore) / 100 + 0.38));

    if (isPriceSensitive) {
      playbook = 'PB-VOLUNTARY-PRICE-RESISTANCE';
      action = 'offer_annual_discount';
      discount = 15;
      revisions = 1;
      retainProb = 0.76;
    } else if (reason.toLowerCase().includes('usage') || reason.toLowerCase().includes('login') || reason.toLowerCase().includes('adoption')) {
      playbook = 'PB-PROACTIVE-ONBOARDING-RESCUE';
      action = 'assign_success_engineer';
      retainProb = 0.82;
    } else if (reason.toLowerCase().includes('renewal') || reason.toLowerCase().includes('competitor')) {
      playbook = 'PB-ANNUAL-LOCKIN-EXECUTIVE';
      action = 'executive_concierge_lockin';
      discount = 10;
      retainProb = 0.85;
    } else if (reason.toLowerCase().includes('ticket') || reason.toLowerCase().includes('support')) {
      playbook = 'PB-VIP-ESCALATION-SLA';
      action = 'priority_support_hotline';
      retainProb = 0.79;
    }

    const erv = Math.round(mrr * retainProb * 12);

    const traces = [
      `[Detective] Ingesting real-time behavioral telemetry for ${company} (MRR: ₹${mrr.toLocaleString()}, Risk: ${riskScore}/100)...`,
      `[Detective] Root-cause forensics: "${reason}". Classification: ${isPriceSensitive ? 'VOLUNTARY INTENTIONAL CHURN' : 'PROACTIVE RETENTION THREAT'}.`,
      `[Detective] Querying customer health score & NPS -> Feature adoption: ${customer.featureAdoption || 24}%, Support tickets: ${customer.supportTickets || 5}.`,
      `[Strategist] Querying RAG Playbook Corpus -> Matched '${playbook}'.`
    ];

    if (isPriceSensitive) {
      traces.push(`[Strategist] Proposing aggressive 25% courtesy discount on annual renewal to stop cancellation.`);
      traces.push(`[Auditor] ❌ Policy Violation: POL-07-MARGIN-CAP (25% exceeds authorized corporate margin discount ceiling of 20%).`);
      traces.push(`[Loop] 🔁 Self-Correction iteration #1: Auditor critiques discount size ➔ Re-planning with Strategist...`);
      traces.push(`[Strategist] Revised retention package: 15% discount + 1-on-1 Quarterly Business Review with Lead Architect.`);
      traces.push(`[Auditor] ✅ Guardrail Audit Passed: 15% discount <= 20% cap. LTV margin preserved.`);
    } else if (isHighValue) {
      traces.push(`[Strategist] High-value enterprise account (MRR: ₹${mrr.toLocaleString()}). Proposing Executive Concierge with VP of Product.`);
      traces.push(`[Auditor] ✅ Compliance & SLA verified. Flagging for Human-in-the-Loop AE co-pilot review.`);
      traces.push(`[HITL Gate] 🛑 Account Executive intervention flagged for approval.`);
    } else {
      traces.push(`[Strategist] Proposing targeted retention package: '${action.replace(/_/g, ' ').toUpperCase()}'.`);
      traces.push(`[Auditor] ✅ Guardrail Audit Passed: Churn dunning frequency within limits. Approved.`);
      traces.push(`[HITL Gate] Cleared for autonomous concierge dispatch.`);
    }

    traces.push(`[Communicator] Generated personalized retention concierge draft & dynamic calendar booking link.`);
    traces.push(`[Communicator] Channel selected: ${isHighValue ? 'EXECUTIVE EMAIL + WHATSAPP' : 'EMAIL CONCIERGE'}. Delivered to account decision maker.`);

    return {
      company,
      customer_id: customer.id || `cus_${Math.random().toString(36).substring(2, 8)}`,
      mrr,
      riskScore,
      retainProb,
      expected_ltv_saved: erv,
      churn_category: isPriceSensitive ? 'voluntary_churn' : 'usage_drop',
      hitl_status: hitlStatus,
      revision_count: revisions,
      final_action: action,
      discount_offered: discount,
      playbook,
      diagnosis: `Detected ${reason.toLowerCase()}. Intervened with ${playbook}.`,
      agent_trace: traces,
      outreach: {
        channel: isHighValue ? 'Executive Email + WhatsApp' : 'Email Concierge',
        headline: isPriceSensitive ? 'Special Annual VIP Partnership Offer' : 'Dedicated Technical Advisory Session',
        magic_link: `https://reviveai.io/concierge/${customer.id || 'acct'}?action=${action}`
      },
      stages: [
        { name: 'Telemetry Detective', icon: '🕵️', status: 'completed', time: '16ms', details: `Forensics: ${reason}` },
        { name: 'Retention Strategist', icon: '🧠', status: 'completed', time: '34ms', details: `Playbook: ${playbook}` },
        { name: 'Retention Auditor', icon: '⚖️', status: 'completed', time: '12ms', details: revisions > 0 ? `Self-Corrected (1 Revision: Discount capped at 15%)` : 'POL-01..07 Guardrails Passed' },
        { name: 'HITL Review Gate', icon: '🛑', status: isHighValue ? 'blocked' : 'completed', time: '3ms', details: hitlStatus },
        { name: 'Concierge Communicator', icon: '✍️', status: 'completed', time: '22ms', details: 'VIP Concierge Outreach Dispatched' }
      ]
    };
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

    const txnId = 'sim_txn_' + Math.floor(Math.random() * 90000 + 10000);
    const amt = parseFloat(amount);
    const isHighValue = amt > 25000 || failure_reason === 'fraud_flag';
    const isVoluntary = failure_reason === 'customer_cancellation';
    const isExpired = failure_reason === 'card_expired';

    let action = 'retry';
    let hitlStatus = 'AUTONOMOUS_APPROVED';
    let revisions = 0;
    let category = 'involuntary_churn';
    let prob = 0.84;

    if (isHighValue) {
      action = 'escalate';
      hitlStatus = 'PENDING_OPERATOR_APPROVAL';
      prob = 0.15;
    } else if (isVoluntary) {
      action = 'offer_alternative';
      category = 'voluntary_churn';
      revisions = 1;
      prob = 0.72;
    } else if (isExpired) {
      action = 'update_payment';
      prob = 0.60;
    }

    const traces = [
      `[Detective] Fetching payment telemetry for ${txnId} (Method: ${payment_method.toUpperCase()}, Amount: ₹${amt.toLocaleString()})...`,
      `[Detective] Calling CRM tool -> Found customer tenure 320d, LTV ₹${(amt * 4).toLocaleString()}.`,
      `[Detective] Classification: ${category.toUpperCase()} — ${isVoluntary ? 'Intentional cancellation due to price sensitivity' : 'Payment rail interruption. User intent active'}.`,
      `[Strategist] Consulting RAG Long-term Playbooks -> Matched ${isVoluntary ? 'PB-VOLUNTARY-PRICE-RESISTANCE' : isExpired ? 'PB-EXPIRED-CARD' : 'PB-TECH-TIMEOUT'}.`,
    ];

    if (isVoluntary) {
      traces.push(`[Strategist] Proposed aggressive 25% courtesy discount with UPI AutoPay switch.`);
      traces.push(`[Auditor] ❌ Plan REJECTED. Violation: POL-07-MARGIN-CAP (25% exceeds authorized 20% limit).`);
      traces.push(`[Loop] 🔁 Self-Correction iteration #1: Feeding critique back to Strategist...`);
      traces.push(`[Strategist] Adjusted discount down to compliant ceiling: 15.0%.`);
      traces.push(`[Auditor] ✅ All guardrails, margin rules, and dunning caps passed.`);
    } else if (isHighValue) {
      traces.push(`[Strategist] High-ticket transaction (₹${amt.toLocaleString()} > ₹25,000). Proposing VIP Account Executive escalation.`);
      traces.push(`[Auditor] ✅ Compliance review passed. Flagged for Human-in-the-Loop review.`);
      traces.push(`[HITL Gate] 🛑 High-value / enterprise risk detected. Autonomous execution PAUSED.`);
    } else {
      traces.push(`[Strategist] Proposing bounded intervention: '${action}' (Delay: 2.0h).`);
      traces.push(`[Auditor] ✅ Validated against POL-01..06 guardrails. Approved.`);
      traces.push(`[HITL Gate] Standard transaction. Cleared for autonomous execution.`);
    }

    traces.push(`[Communicator] Generated dynamic Magic Link: https://pay.reviveai.io/magic/${txnId}?tok=${Math.random().toString(36).substring(2, 8)}${isVoluntary ? '&disc=15' : ''}`);
    traces.push(`[Communicator] Prepared communication via ${isVoluntary ? 'EMAIL/WHATSAPP' : 'WHATSAPP'}: '${isVoluntary ? 'Exclusive 15% Renewal Concession' : 'Friendly Payment Update'}'.`);

    return {
      event_id: 'evt_' + Math.random().toString(36).substring(2, 9),
      status: 'completed',
      message: 'Simulated failure ingested and processed by Multi-Agent Engine',
      transaction_id: txnId,
      agent_decision: {
        recovery_probability: prob,
        expected_recovery_value: Math.round(amt * prob),
        policy_approved: !isHighValue || action === 'escalate',
        final_action: action,
        churn_category: category,
        churn_hypothesis: isVoluntary ? 'Customer intent churn due to price resistance.' : 'Transient payment rail handshake timeout.',
        hitl_status: hitlStatus,
        revision_count: revisions,
        diagnosis: isVoluntary ? 'Voluntary cancellation mandate with price sensitivity.' : isHighValue ? 'High-value enterprise contract decline.' : 'Transient UPI PSP bank switch timeout.',
        agent_trace: traces,
        deliberation_log: [
          { agent: 'Detective', status: 'completed', churn: category },
          { agent: 'Strategist', proposed_action: action, revisions: revisions },
          { agent: 'Auditor', approved: true },
          { agent: 'HITL_Gate', status: hitlStatus },
          { agent: 'Communicator', dispatched: true }
        ],
        outreach: {
          channel: isVoluntary ? 'email_whatsapp' : 'whatsapp',
          headline: isVoluntary ? 'Exclusive 15% Renewal Concession' : 'Friendly Payment Update',
          magic_link: `https://pay.reviveai.io/magic/${txnId}?tok=tok_${Math.random().toString(36).substring(2, 8)}${isVoluntary ? '&disc=15' : ''}`,
        }
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
    getChurnPresets,
    processRecovery,
    simulateWebhook,
    simulateChurnRetention,
    fetchEscalations,
    submitOverride,
    streamResponse,
    generateDunningEmail,
    getSuggestions,
  };
})();
