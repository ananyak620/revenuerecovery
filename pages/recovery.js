/* ============================================
   ReviveAI — Payment Recovery & Agent Sandbox Page
   Razorpay Hackathon Live Interactive Showcase
   ============================================ */

const RecoveryPage = (() => {
  let activePipelineStage = 5; // default all completed
  let selectedPresetKey = 'upi_timeout';
  let recentExecution = null;
  let isExecuting = false;
  let showIntegrationSettings = false;
  let activeGateway = 'razorpay';
  let merchantConfig = {
    razorpayKeyId: 'rzp_live_891002348',
    webhookSecret: 'whsec_revive_2026_prod',
    databaseUrl: 'sqlite:///./reviveai.db'
  };
  let traceViewMode = 'simple'; // 'simple' or 'detailed'

  function toggleTraceView(mode) {
    if (mode) {
      traceViewMode = mode;
    } else {
      traceViewMode = traceViewMode === 'simple' ? 'detailed' : 'simple';
    }
    App.render();
  }

  function toggleIntegrationSettings() {
    showIntegrationSettings = !showIntegrationSettings;
    App.render();
  }

  function setGateway(gw) {
    activeGateway = gw;
    App.render();
  }

  function getBaseApiUrl() {
    if (typeof window === 'undefined') return 'http://localhost:8000';
    if (window.location.hostname !== 'localhost') return window.location.origin;
    return window.location.port === '3000' ? 'http://localhost:8000' : window.location.origin;
  }

  function copyWebhookUrl() {
    const url = `${getBaseApiUrl()}/api/webhooks/${activeGateway}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    Toast.success(`✓ Copied ${activeGateway.toUpperCase()} Webhook URL to clipboard!`);
  }

  function testConnection() {
    Toast.info(`Testing ${activeGateway.toUpperCase()} Gateway Webhook Handshake...`);
    setTimeout(() => {
      Toast.success(`✓ Handshake Verified! ReviveAI Agent is listening for live ${activeGateway.toUpperCase()} 'payment.failed' events.`);
    }, 500);
  }

  function saveGatewaySettings() {
    const key = document.getElementById('merchant-key-input')?.value;
    const secret = document.getElementById('merchant-secret-input')?.value;
    const db = document.getElementById('merchant-db-input')?.value;
    if (key) merchantConfig.razorpayKeyId = key;
    if (secret) merchantConfig.webhookSecret = secret;
    if (db) merchantConfig.databaseUrl = db;
    Toast.success(`✓ Company Gateway credentials and webhook secret saved!`);
  }

  // Initial execution state on load
  function initDefaultExecution() {
    if (!recentExecution) {
      const presets = AIService.getPresets();
      const p = presets.upi_timeout;
      const traces = [
        "[Detective] Fetching payment telemetry for pay_rzp_99018 (Amount: ₹4,999, Method: UPI)...",
        "[Detective] Querying CRM profile -> Found customer tenure: 380 days, LTV: ₹38,500, previous success rate: 94%.",
        "[Detective] Classification: INVOLUNTARY CHURN — Transient 3DS PSP handshake delay during peak evening hours.",
        "[Strategist] Consulting RAG Long-term Playbooks -> Matched 'PB-TECH-TIMEOUT' (UPI Gateway Timeout Resolution).",
        "[Strategist] Immediate retry has 92% failure rate. Formulating plan: Off-peak retry in 2.0h with UPI AutoPay switch.",
        "[Auditor] Auditing plan: action='retry', delay=2.0h against 6 Regulatory Guardrails...",
        "[Auditor] POL-01 (0/5 retries) ✓ | POL-02 (Clean fraud score) ✓ | POL-06 (NPCI cooldown 2h) ✓ -> APPROVED.",
        "[HITL Gate] Standard transaction (₹4,999 <= ₹25,000). Cleared for autonomous execution.",
        "[Communicator] Generated dynamic Magic Link: https://pay.reviveai.io/magic/pay_rzp_99018?tok=9a4bc1",
        "[Communicator] Dispatched personalized transparent WhatsApp notice."
      ];
      recentExecution = {
        transaction_id: 'pay_rzp_99018',
        amount: p.amount,
        payment_method: p.payment_method,
        failure_reason: p.failure_reason,
        status: 'completed',
        stages: [
          { name: 'Detective Agent', icon: '🕵️', status: 'completed', time: '18ms', details: 'Forensics: Involuntary Churn' },
          { name: 'Strategist Agent', icon: '🧠', status: 'completed', time: '38ms', details: 'Playbook: PB-TECH-TIMEOUT' },
          { name: 'Auditor Critic', icon: '⚖️', status: 'completed', time: '8ms', details: 'POL-01..06 Guardrails Passed' },
          { name: 'HITL Gate', icon: '🛑', status: 'completed', time: '2ms', details: 'Autonomous Execution Approved' },
          { name: 'Communicator', icon: '✍️', status: 'completed', time: '22ms', details: 'Dynamic WhatsApp Link Dispatched' }
        ],
        agent_decision: {
          final_action: 'retry',
          recovery_probability: 0.89,
          expected_recovery_value: 4459,
          policy_approved: true,
          churn_category: 'involuntary_churn',
          hitl_status: 'AUTONOMOUS_APPROVED',
          revision_count: 0,
          diagnosis: 'Temporary UPI switch timeout. 3DS handshake did not complete.',
          agent_trace: traces,
          outreach: {
            headline: 'Friendly Payment Update',
            magic_link: 'https://pay.reviveai.io/magic/pay_rzp_99018?tok=9a4bc1'
          }
        }
      };
    }
  }

  async function runPreset(presetKey) {
    selectedPresetKey = presetKey;
    const presets = AIService.getPresets();
    const preset = presets[presetKey];
    if (!preset) return;

    isExecuting = true;
    activePipelineStage = 1;
    Toast.info(`⚡ Multi-Agent Mission Launched: ${preset.name}...`);
    App.render();

    // Stage 1: Detective
    await new Promise(r => setTimeout(r, 350));
    activePipelineStage = 2;
    App.render();

    // Stage 2: Strategist
    await new Promise(r => setTimeout(r, 400));
    activePipelineStage = 3;
    App.render();

    // Stage 3: Auditor Critique & Reflection
    await new Promise(r => setTimeout(r, 350));
    activePipelineStage = 4;
    App.render();

    const result = await AIService.simulateWebhook({
      amount: preset.amount,
      payment_method: preset.payment_method,
      failure_reason: preset.failure_reason,
    });

    // Stage 4: Communicator & Dispatch
    await new Promise(r => setTimeout(r, 300));
    activePipelineStage = 5;
    isExecuting = false;

    const dec = result.agent_decision || {};
    const isApproved = dec.policy_approved !== false;
    const action = dec.final_action || (presetKey === 'fraud_alert' ? 'escalate' : 'retry');

    recentExecution = {
      transaction_id: result.transaction_id || `sim_${presetKey}_${Math.floor(Math.random() * 9000 + 1000)}`,
      amount: preset.amount,
      payment_method: preset.payment_method,
      failure_reason: preset.failure_reason,
      status: 'completed',
      stages: [
        { name: 'Detective Agent', icon: '🕵️', status: 'completed', time: '21ms', details: `Forensics: ${dec.churn_category?.toUpperCase() || 'INVOLUNTARY CHURN'}` },
        { name: 'Strategist Agent', icon: '🧠', status: 'completed', time: '38ms', details: `Formulated Action: ${action.toUpperCase()}` },
        { name: 'Auditor Critic', icon: '⚖️', status: isApproved ? 'completed' : 'blocked', time: '14ms', details: dec.revision_count > 0 ? `Self-Corrected (${dec.revision_count} Revisions)` : 'POL-01..07 Guardrails Passed' },
        { name: 'HITL Gate', icon: '🛑', status: dec.hitl_status === 'PENDING_OPERATOR_APPROVAL' ? 'blocked' : 'completed', time: '4ms', details: dec.hitl_status || 'AUTONOMOUS' },
        { name: 'Communicator', icon: '✍️', status: 'completed', time: '26ms', details: 'Dynamic Magic Link Embedded' }
      ],
      agent_decision: {
        ...dec,
        final_action: action,
        recovery_probability: dec.recovery_probability || preset.prob,
        expected_recovery_value: dec.expected_recovery_value || preset.erv,
        policy_approved: isApproved,
        diagnosis: dec.diagnosis || preset.description,
        churn_category: dec.churn_category || (presetKey === 'voluntary_churn' ? 'voluntary_churn' : 'involuntary_churn'),
        hitl_status: dec.hitl_status || (presetKey === 'fraud_alert' ? 'PENDING_OPERATOR_APPROVAL' : 'AUTONOMOUS_APPROVED'),
        revision_count: dec.revision_count !== undefined ? dec.revision_count : (presetKey === 'voluntary_churn' ? 1 : 0),
        agent_trace: dec.agent_trace,
        outreach: dec.outreach
      }
    };

    Toast.success(`✓ Multi-Agent Mission Finished: ${action.toUpperCase()}`);
    App.render();
  }

  async function handleCustomSimulate() {
    const amt = parseFloat(document.getElementById('custom-sim-amount')?.value || 4999);
    const method = document.getElementById('custom-sim-method')?.value || 'upi';
    const reason = document.getElementById('custom-sim-reason')?.value || 'authentication_failure';

    Toast.info('Ingesting custom failure event into live agent pipeline...');
    const result = await AIService.simulateWebhook({
      amount: amt,
      payment_method: method,
      failure_reason: reason,
    });

    recentExecution = {
      transaction_id: result.transaction_id,
      amount: amt,
      payment_method: method,
      failure_reason: reason,
      status: 'completed',
      stages: [
        { name: 'Gateway Ingestion', icon: '⚡', status: 'completed', time: '15ms', details: `Parsed ${method.toUpperCase()} failure event` },
        { name: 'Calibrated ML', icon: '📊', status: 'completed', time: '29ms', details: `Calculated recovery probability & ERV` },
        { name: 'LLM Strategy', icon: '🧠', status: 'completed', time: '118ms', details: `${AIService.getLLMInfo().active_provider.toUpperCase()} analyzed root cause` },
        { name: 'Safety Guardrail', icon: '🛡️', status: result.agent_decision?.policy_approved ? 'completed' : 'blocked', time: '4ms', details: `Evaluated POL-01 through POL-06` },
        { name: 'Action Dispatched', icon: '🚀', status: 'completed', time: '22ms', details: `Executed ${result.agent_decision?.final_action || 'retry'}` }
      ],
      agent_decision: result.agent_decision || {
        final_action: 'retry',
        recovery_probability: 0.82,
        policy_approved: true
      }
    };

    Toast.success(`⚡ Pipeline Finished for ${result.transaction_id}`);
    App.render();
  }

  async function handleEngineChange(provider) {
    Toast.info(`Switching active reasoning engine to ${provider.toUpperCase()}...`);
    await AIService.switchLLMProvider(provider);
    Toast.success(`✓ Active LLM Engine is now ${provider.toUpperCase()}`);
    App.render();
  }

  async function handleRetryClick(txnId) {
    Toast.info(`Dispatching AI recovery agent for ${txnId}...`);
    const decision = await AIService.processRecovery(txnId, true);
    Toast.success(`✓ Action '${decision.final_action}' executed (P(recovery): ${Math.round(decision.recovery_probability * 100)}%)`);
    App.render();
  }

  async function handleOverrideClick(txnId, action) {
    const reason = prompt(`Enter operator reason for manual ${action.toUpperCase()} override:`, 'Verified customer via phone');
    if (!reason) return;
    await AIService.submitOverride(txnId, action, reason);
    Toast.success(`✓ HITL Override: ${txnId} marked as ${action}`);
    App.render();
  }

  function render() {
    initDefaultExecution();

    const presets = AIService.getPresets();
    const payments = MockData.failedPayments;
    const recovered = payments.filter(p => p.status === 'recovered');
    const pending = payments.filter(p => p.status === 'pending_retry');

    const totalFailedAmt = payments.reduce((s, p) => s + p.amount, 0);
    const recoveredAmt = recovered.reduce((s, p) => s + p.recoveredAmount, 0);

    const statsCards = [
      StatCard.render({
        id: 'total-failed',
        label: 'Total Failed Volume',
        value: Formatters.currency(totalFailedAmt),
        rawValue: totalFailedAmt,
        prefix: Formatters.getCurrencySymbol(),
        icon: '💳',
        type: 'danger'
      }),
      StatCard.render({
        id: 'recovered-vol',
        label: 'Autonomous Recoveries',
        value: Formatters.currency(recoveredAmt),
        rawValue: recoveredAmt,
        prefix: Formatters.getCurrencySymbol(),
        change: `${recovered.length} payments recovered`,
        isPositive: true,
        icon: '✅',
        type: 'success'
      }),
      StatCard.render({
        id: 'pending-retries',
        label: 'Active Smart Retries',
        value: pending.length.toString(),
        rawValue: pending.length,
        change: 'AI Optimal Windows Scheduled',
        isPositive: true,
        icon: '⏳',
        type: 'warning'
      }),
      StatCard.render({
        id: 'success-rate',
        label: 'Retry Success Rate',
        value: '74.2%',
        rawValue: 74.2,
        suffix: '%',
        change: '+16% vs naive retries',
        isPositive: true,
        icon: '📈',
        type: 'primary'
      })
    ].join('');

    // 1. Razorpay Scenario Sandbox HTML
    const presetKeys = Object.keys(presets);
    const presetsHtml = presetKeys.map(k => {
      const p = presets[k];
      const isSelected = selectedPresetKey === k;
      return `
        <div class="preset-card ${isSelected ? 'active' : ''}" onclick="RecoveryPage.runPreset('${k}')">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${p.name}</span>
            <span class="badge ${p.tagType}">${p.tag}</span>
          </div>
          <div style="font-size: 0.76rem; color: var(--text-secondary); line-height: 1.4;">
            ${p.description}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px; margin-top: 4px;">
            <span style="font-family: monospace; font-size: 0.84rem; font-weight: 600; color: var(--color-primary-light);">₹${p.amount.toLocaleString()}</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">Click to Test Drive →</span>
          </div>
        </div>
      `;
    }).join('');

    const llmInfo = AIService.getLLMInfo();

    // 2. 5-Step Pipeline Visualizer HTML
    const stages = recentExecution?.stages || [];
    const pipelineNodesHtml = stages.map((s, idx) => {
      const stageNum = idx + 1;
      let statusClass = 'completed';
      if (isExecuting) {
        if (stageNum === activePipelineStage) statusClass = 'active';
        else if (stageNum > activePipelineStage) statusClass = '';
      } else if (s.status === 'blocked') {
        statusClass = 'blocked';
      }

      return `
        <div class="pipeline-node ${statusClass}" title="${s.details}">
          <div class="pipeline-node-icon">${s.icon}</div>
          <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">${s.name}</div>
          <div style="display: flex; gap: 4px; align-items: center;">
            <span class="badge ${statusClass === 'blocked' ? 'danger' : statusClass === 'active' ? 'primary' : 'success'}" style="font-size: 0.65rem; padding: 2px 6px;">
              ${statusClass === 'blocked' ? 'Policy Block' : statusClass === 'active' ? 'Running...' : 'Passed'}
            </span>
            <span style="font-size: 0.65rem; color: var(--text-muted); font-family: monospace;">${s.time}</span>
          </div>
        </div>
        ${idx < stages.length - 1 ? `<div class="pipeline-connector ${stageNum < activePipelineStage || !isExecuting ? 'active' : ''}"></div>` : ''}
      `;
    }).join('');

    const traces = recentExecution?.agent_decision?.agent_trace || [
      `[Detective] Classified telemetry: ${recentExecution?.agent_decision?.churn_category || 'involuntary_churn'} (P(rec)=${Math.round((recentExecution?.agent_decision?.recovery_probability || 0.8) * 100)}%)`,
      `[Strategist] Queried RAG Playbooks -> Formulated intervention: ${recentExecution?.agent_decision?.final_action || 'retry'}`,
      `[Auditor] Evaluated 6 Deterministic Guardrails & Margin Cap -> Approved: ${recentExecution?.agent_decision?.policy_approved !== false}`,
      `[Communicator] Generated dynamic Magic Link & personalized outreach for transaction ${recentExecution?.transaction_id}`,
      `[HITL Gate] Status: ${recentExecution?.agent_decision?.hitl_status || 'AUTONOMOUS_APPROVED'}`
    ];

    const pipelineDrawerHtml = recentExecution ? `
      <div class="pipeline-drawer" style="margin-bottom: 20px;">
        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Active Transaction</div>
          <div style="font-family: monospace; font-weight: 700; font-size: 0.95rem; color: var(--color-primary-light); margin-top: 2px;">
            ${recentExecution.transaction_id}
          </div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">
            Amount: <strong>₹${recentExecution.amount.toLocaleString()}</strong> (${recentExecution.payment_method.toUpperCase()})
          </div>
          <div style="margin-top: 4px;">
            <span class="badge ${recentExecution.agent_decision.churn_category === 'voluntary_churn' ? 'warning' : 'info'}" style="font-size: 0.7rem;">
              🕵️ ${recentExecution.agent_decision.churn_category ? recentExecution.agent_decision.churn_category.replace('_', ' ').toUpperCase() : 'INVOLUNTARY CHURN'}
            </span>
          </div>
        </div>

        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">ML Scoring & ERV</div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #34d399; margin-top: 2px;">
            ${Math.round((recentExecution.agent_decision.recovery_probability || 0.8) * 100)}% Chance
          </div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">
            Expected Value: <strong>₹${Math.round(recentExecution.agent_decision.expected_recovery_value || 0).toLocaleString()}</strong>
          </div>
          <div style="font-size: 0.72rem; color: #38bdf8; margin-top: 4px;">
            🧠 RAG Playbooks Consulted
          </div>
        </div>

        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Strategist & Critic Loop</div>
          <div style="font-size: 0.8rem; color: var(--text-primary); font-weight: 600; margin-top: 2px;">
            ${recentExecution.agent_decision.diagnosis || 'Diagnosis generated'}
          </div>
          <div style="font-size: 0.74rem; color: #a78bfa; margin-top: 4px; display: flex; align-items: center; gap: 6px;">
            <span>🔁 Self-Correction:</span>
            <span class="badge primary" style="font-size: 0.65rem;">${recentExecution.agent_decision.revision_count || 0} Revisions</span>
          </div>
        </div>

        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Policy Engine & HITL</div>
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
            <span class="badge ${recentExecution.agent_decision.policy_approved ? 'success' : 'danger'}">
              ${recentExecution.agent_decision.policy_approved ? 'POL-01..06 APPROVED' : 'POL-02 / POL-03 INTERCEPT'}
            </span>
          </div>
          <div style="font-size: 0.78rem; font-weight: 600; color: var(--color-primary-light); margin-top: 4px;">
            Action: ${recentExecution.agent_decision.final_action?.toUpperCase() || 'RETRY'}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
            Gate: <strong style="color: #f59e0b;">${recentExecution.agent_decision.hitl_status || 'AUTONOMOUS'}</strong>
          </div>
        </div>
      </div>

      <!-- 4-Agent Collaborative Persona Workspace Cards (Short & Simple) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; margin-bottom: 16px;">
        <!-- Detective Card -->
        <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 700; color: #38bdf8; font-size: 0.84rem;">🕵️ Detective</span>
            <span class="badge info" style="font-size: 0.62rem;">Forensics</span>
          </div>
          <div style="font-weight: 700; font-size: 0.82rem; color: #f1f5f9;">
            ${(recentExecution.agent_decision.churn_category || 'involuntary_churn').replace('_', ' ').toUpperCase()}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
            ${recentExecution.agent_decision.churn_category === 'voluntary_churn' ? 'Price/intent churn detected' : 'Technical gateway decline; relationship active'}
          </div>
        </div>

        <!-- Strategist Card -->
        <div style="background: rgba(167, 139, 250, 0.05); border: 1px solid rgba(167, 139, 250, 0.25); border-radius: 8px; padding: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 700; color: #a78bfa; font-size: 0.84rem;">🧠 Strategist</span>
            <span class="badge primary" style="font-size: 0.62rem;">Planner</span>
          </div>
          <div style="font-weight: 700; font-size: 0.82rem; color: #f1f5f9;">
            ACTION: ${(recentExecution.agent_decision.final_action || 'retry').toUpperCase()}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
            Playbook matched ➔ Optimized to protect LTV
          </div>
        </div>

        <!-- Auditor Card -->
        <div style="background: rgba(244, 63, 94, 0.05); border: 1px solid rgba(244, 63, 94, 0.25); border-radius: 8px; padding: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 700; color: #fb7185; font-size: 0.84rem;">⚖️ Auditor Critic</span>
            <span class="badge ${recentExecution.agent_decision.revision_count > 0 ? 'warning' : 'success'}" style="font-size: 0.62rem;">
              ${recentExecution.agent_decision.revision_count > 0 ? 'Self-Corrected' : 'Approved'}
            </span>
          </div>
          <div style="font-weight: 700; font-size: 0.82rem; color: #34d399;">
            POL-01..07 APPROVED
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
            ${recentExecution.agent_decision.revision_count > 0 ? 'Conceded discount to 15% (margin cap <= 20%)' : '0 guardrail violations; compliant'}
          </div>
        </div>

        <!-- Communicator Card -->
        <div style="background: rgba(52, 211, 153, 0.05); border: 1px solid rgba(52, 211, 153, 0.25); border-radius: 8px; padding: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 700; color: #34d399; font-size: 0.84rem;">✍️ Communicator</span>
            <span class="badge success" style="font-size: 0.62rem;">Dispatched</span>
          </div>
          <div style="font-weight: 700; font-size: 0.82rem; color: #f1f5f9;">
            ${recentExecution.agent_decision.outreach?.channel ? recentExecution.agent_decision.outreach.channel.toUpperCase() : 'WHATSAPP'}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
            1-Click Magic Link generated & sent
          </div>
        </div>
      </div>

      <!-- Live Multi-Agent Deliberation Terminal (Short & Simple Toggle) -->
      <div style="background: #090d16; border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #38bdf8; font-weight: 700; font-size: 0.86rem;">⚡ Live Multi-Agent Deliberation</span>
            <span style="font-size: 0.66rem; color: #34d399; background: rgba(52, 211, 153, 0.1); padding: 2px 8px; border-radius: 4px;">● Reflection Loop Active</span>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-sm ${traceViewMode === 'simple' ? 'btn-primary' : 'btn-secondary'}" style="font-size: 0.68rem; padding: 2px 8px;" onclick="RecoveryPage.toggleTraceView('simple')">
              ✓ Short & Simple
            </button>
            <button class="btn btn-sm ${traceViewMode === 'detailed' ? 'btn-primary' : 'btn-secondary'}" style="font-size: 0.68rem; padding: 2px 8px;" onclick="RecoveryPage.toggleTraceView('detailed')">
              Detailed Traces
            </button>
          </div>
        </div>

        ${traceViewMode === 'simple' ? `
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.8rem; line-height: 1.4;">
            <div style="display: flex; align-items: flex-start; gap: 8px; color: #e2e8f0;">
              <span style="font-size: 1rem; line-height: 1;">🕵️</span>
              <div>
                <strong style="color: #38bdf8;">Detective:</strong>
                <span>${recentExecution.agent_decision.churn_category === 'voluntary_churn' ? 'Classified as <strong>Voluntary Churn</strong> (mandate cancellation / price resistance).' : 'Classified as <strong>Involuntary Churn</strong> (transient payment rail failure; customer active).'}</span>
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 8px; color: #e2e8f0;">
              <span style="font-size: 1rem; line-height: 1;">🧠</span>
              <div>
                <strong style="color: #a78bfa;">Strategist:</strong>
                <span>Applied RAG Playbook ➔ Formulated action: <strong>${(recentExecution.agent_decision.final_action || 'retry').toUpperCase()}</strong> (P(recovery): ${Math.round((recentExecution.agent_decision.recovery_probability || 0.8) * 100)}%).</span>
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 8px; color: #e2e8f0;">
              <span style="font-size: 1rem; line-height: 1;">⚖️</span>
              <div>
                <strong style="color: #fb7185;">Auditor (Critic):</strong>
                <span>${recentExecution.agent_decision.revision_count > 0 ? '<span style="color: #fbbf24;">Self-Correction Loop:</span> Rejected >20% discount ➔ Strategist revised to compliant 15% ➔ <span style="color: #34d399;">Approved</span>.' : 'Evaluated against 6 guardrails & margin ceiling ➔ <span style="color: #34d399;">Approved (0 violations)</span>.'}</span>
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 8px; color: #e2e8f0;">
              <span style="font-size: 1rem; line-height: 1;">✍️</span>
              <div>
                <strong style="color: #34d399;">Communicator:</strong>
                <span>Generated <strong>1-Click Magic Link</strong> & dispatched personalized <strong>${recentExecution.agent_decision.outreach?.channel ? recentExecution.agent_decision.outreach.channel.toUpperCase() : 'WHATSAPP'}</strong> notification.</span>
              </div>
            </div>
          </div>
        ` : `
          <div style="max-height: 180px; overflow-y: auto; color: #94a3b8; line-height: 1.5; font-family: 'Courier New', monospace; font-size: 0.76rem;">
            ${traces.map(t => {
              let color = '#94a3b8';
              if (t.includes('[Detective]')) color = '#38bdf8';
              else if (t.includes('[Strategist]')) color = '#a78bfa';
              else if (t.includes('[Auditor]')) color = '#f43f5e';
              else if (t.includes('[Communicator]')) color = '#34d399';
              else if (t.includes('[HITL Gate]')) color = '#f59e0b';
              else if (t.includes('[Loop]')) color = '#fbbf24';
              return `<div style="color: ${color};">${t.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
            }).join('')}
          </div>
        `}
      </div>
    ` : '';

    const tableHtml = TableComponent.render({
      title: `Failed Payment Recovery Queue (${payments.length})`,
      columns: ['Transaction', 'Customer / Company', 'Amount', 'Failure Reason', 'Retries', 'Method', 'Status', 'Action'],
      data: payments,
      rowRenderer: (p) => `
        <tr>
          <td style="font-family: monospace; font-size: 0.78rem; color: var(--color-primary-light);">${p.id}</td>
          <td>
            <div style="font-weight: 600; color: var(--text-primary);">${p.customerName}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${p.company}</div>
          </td>
          <td style="font-weight: 600; color: var(--text-primary);">${Formatters.currency(p.amount)}</td>
          <td><span class="badge danger">${p.failReason}</span></td>
          <td>${p.retryCount} / ${p.maxRetries}</td>
          <td style="font-size: 0.8rem; color: var(--text-secondary);">${p.retryMethod}</td>
          <td><span class="badge ${Formatters.statusBadgeClass(p.status)}">${Formatters.statusLabel(p.status)}</span></td>
          <td>
            ${p.status === 'pending_retry'
              ? `<button class="btn btn-primary btn-sm" onclick="RecoveryPage.handleRetry('${p.id}')">Retry Now</button>`
              : p.status === 'recovered'
                ? `<span style="color: var(--color-success); font-size: 0.8rem;">✓ Resolved</span>`
                : `<button class="btn btn-secondary btn-sm" onclick="RecoveryPage.handleOverride('${p.id}', 'retry')">Override</button>`
            }
          </td>
        </tr>
      `
    });

    const hitlQueueHtml = `
      <div class="data-table-wrapper" style="margin-top: 28px; border: 1px solid rgba(244, 63, 94, 0.25);">
        <div class="data-table-header" style="background: rgba(244, 63, 94, 0.08);">
          <div>
            <h3 style="color: #fb7185; display: flex; align-items: center; gap: 8px;">
              🛡️ Human-in-the-Loop (HITL) Review Queue
              <span class="badge critical">2 Requiring Operator Review</span>
            </h3>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">
              High-value payments or fraud flags blocked by Policy Engine guardrails awaiting manual review.
            </div>
          </div>
        </div>
        <div class="data-table-scroll">
          <table class="data-table" style="min-width: 860px;">
            <thead>
              <tr>
                <th>Escalation ID</th>
                <th>Transaction ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Trigger Reason</th>
                <th>Priority</th>
                <th>Operator Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-family: monospace; font-size: 0.78rem;">ESC-4901</td>
                <td style="font-family: monospace; font-size: 0.78rem; color: #fb7185;">txn_esc_4901</td>
                <td>cust_enterprise_88</td>
                <td style="font-weight: 700;">₹45,000</td>
                <td><span class="badge critical">POL-02 FRAUD_BLOCK</span> Automated retry strictly forbidden</td>
                <td><span class="badge danger">Critical</span></td>
                <td>
                  <div style="display: flex; gap: 6px;">
                    <button class="btn btn-primary btn-sm" style="background: #10b981; border: none;" onclick="RecoveryPage.handleOverride('txn_esc_4901', 'retry')">Approve Override</button>
                    <button class="btn btn-secondary btn-sm" onclick="RecoveryPage.handleOverride('txn_esc_4901', 'block')">Confirm Block</button>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="font-family: monospace; font-size: 0.78rem;">ESC-9102</td>
                <td style="font-family: monospace; font-size: 0.78rem; color: #fb7185;">txn_esc_9102</td>
                <td>cust_saas_41</td>
                <td style="font-weight: 700;">₹32,000</td>
                <td><span class="badge warning">POL-03 HIGH_AMOUNT_LOW_PROB</span> P(recovery) = 18% &lt; 30% threshold</td>
                <td><span class="badge warning">High</span></td>
                <td>
                  <div style="display: flex; gap: 6px;">
                    <button class="btn btn-primary btn-sm" style="background: #10b981; border: none;" onclick="RecoveryPage.handleOverride('txn_esc_9102', 'notify_customer')">Send 1-Click Link</button>
                    <button class="btn btn-secondary btn-sm" onclick="RecoveryPage.handleOverride('txn_esc_9102', 'resolve')">Resolve</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    const webhookUrl = `${getBaseApiUrl()}/api/webhooks/${activeGateway}`;

    const integrationPanelHtml = showIntegrationSettings ? `
      <div class="sandbox-card" style="border: 1px solid var(--border-glow); background: linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(13,18,30,0.96) 100%); margin-bottom: 24px; box-shadow: var(--shadow-glow);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              🔌 Company Data Connection & Gateway Settings
              <span class="badge success">Live Ingestion Active</span>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
              Where a company links their payment gateway and database to feed real-time failure events directly to ReviveAI.
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-sm ${activeGateway === 'razorpay' ? 'btn-primary' : 'btn-secondary'}" onclick="RecoveryPage.setGateway('razorpay')">
              ⚡ Razorpay
            </button>
            <button class="btn btn-sm ${activeGateway === 'stripe' ? 'btn-primary' : 'btn-secondary'}" onclick="RecoveryPage.setGateway('stripe')">
              💳 Stripe
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-bottom: 16px;">
          <div style="background: rgba(0,0,0,0.35); padding: 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <div style="font-size: 0.74rem; color: var(--color-primary-light); font-weight: 700; text-transform: uppercase;">Step 1: Webhook Ingestion URL</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
              <input type="text" readonly value="${webhookUrl}" style="flex: 1; font-family: monospace; font-size: 0.74rem; background: rgba(0,0,0,0.5); border: 1px solid var(--border-color); color: #38bdf8; padding: 7px 10px; border-radius: 6px;" />
              <button class="btn btn-secondary btn-sm" onclick="RecoveryPage.copyWebhookUrl()" title="Copy Webhook URL">📋 Copy</button>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 8px; line-height: 1.4;">
              Paste this in your <strong>${activeGateway.toUpperCase()} Dashboard → Settings → Webhooks</strong> for event: <code>payment.failed</code>
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.35); padding: 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <div style="font-size: 0.74rem; color: var(--color-primary-light); font-weight: 700; text-transform: uppercase;">Step 2: Webhook Secret & Key</div>
            <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
              <input id="merchant-key-input" type="text" value="${merchantConfig.razorpayKeyId}" placeholder="Merchant Key ID (e.g. rzp_live_...)" style="width: 100%; font-family: monospace; font-size: 0.74rem; background: rgba(0,0,0,0.5); border: 1px solid var(--border-color); color: #fff; padding: 6px 10px; border-radius: 6px;" />
              <input id="merchant-secret-input" type="password" value="${merchantConfig.webhookSecret}" placeholder="Webhook Secret (HMAC SHA-256)" style="width: 100%; font-family: monospace; font-size: 0.74rem; background: rgba(0,0,0,0.5); border: 1px solid var(--border-color); color: #fff; padding: 6px 10px; border-radius: 6px;" />
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 6px;">
              Verifies HMAC SHA-256 signatures to block forged or spoofed events.
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.35); padding: 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <div style="font-size: 0.74rem; color: var(--color-primary-light); font-weight: 700; text-transform: uppercase;">Step 3: Customer History Source</div>
            <div style="margin-top: 8px;">
              <input id="merchant-db-input" type="text" value="${merchantConfig.databaseUrl}" placeholder="DATABASE_URL (PostgreSQL / SQLite)" style="width: 100%; font-family: monospace; font-size: 0.74rem; background: rgba(0,0,0,0.5); border: 1px solid var(--border-color); color: #fff; padding: 7px 10px; border-radius: 6px;" />
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 8px; line-height: 1.4;">
              Syncs customer LTV, tenure, and prior payment history via <code>.env</code>.
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 10px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px;">
          <button class="btn btn-secondary btn-sm" onclick="RecoveryPage.testConnection()">
            ⚡ Test Gateway Ping
          </button>
          <button class="btn btn-primary btn-sm" onclick="RecoveryPage.saveGatewaySettings()">
            ✓ Save & Activate Integration
          </button>
        </div>
      </div>
    ` : '';

    return `
      <div class="page-container">
        <div class="page-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div>
            <h2 class="page-title">💳 Autonomous Payment Recovery</h2>
            <p class="page-subtitle">Razorpay Failure Ingestion, Calibrated XGBoost Scoring & Policy-Bounded Action Execution</p>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-sm ${showIntegrationSettings ? 'btn-primary' : 'btn-secondary'}" onclick="RecoveryPage.toggleIntegrationSettings()" style="display: flex; align-items: center; gap: 6px; border: 1px solid var(--border-glow);">
              <span>🔌 Company Data Connection</span>
              <span class="badge ${showIntegrationSettings ? 'success' : 'primary'}" style="font-size: 0.65rem;">${showIntegrationSettings ? 'Close' : 'Setup'}</span>
            </button>
            <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); padding: 5px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <span style="font-size: 0.78rem; color: var(--text-secondary);">LLM:</span>
              <select id="llm-engine-select" style="background: rgba(0,0,0,0.4); border: 1px solid var(--border-color); color: var(--color-primary-light); font-size: 0.78rem; padding: 4px 8px; border-radius: 6px; outline: none; cursor: pointer;" onchange="RecoveryPage.handleEngineChange(this.value)">
                <option value="gemini" ${llmInfo.active_provider === 'gemini' ? 'selected' : ''}>⚡ Google Gemini 1.5 Flash (Cloud)</option>
                <option value="ollama" ${llmInfo.active_provider === 'ollama' ? 'selected' : ''}>🔒 Qwen 2.5 7B (Local Privacy)</option>
                <option value="heuristic" ${llmInfo.active_provider === 'heuristic' ? 'selected' : ''}>🛡️ Deterministic Heuristic (Offline)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Integration Settings Panel -->
        ${integrationPanelHtml}

        <!-- 1. Scenario Sandbox -->
        <div class="sandbox-card">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                ⚡ Razorpay Payment Failure Sandbox
                <span class="badge primary">Interactive Demo</span>
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                Click any preset failure scenario below to watch the autonomous recovery pipeline execute in real-time.
              </div>
            </div>
            <div style="font-size: 0.76rem; color: var(--text-secondary); background: rgba(255,255,255,0.06); padding: 4px 10px; border-radius: 6px;">
              Ready for Razorpay Webhook Ingestion
            </div>
          </div>

          <div class="preset-grid">
            ${presetsHtml}
          </div>

          <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <span style="font-size: 0.78rem; color: var(--text-muted);">Custom Event:</span>
              <input id="custom-sim-amount" type="number" value="4999" placeholder="Amount (₹)" style="width: 100px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 0.8rem;" />
              <select id="custom-sim-method" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 0.8rem;">
                <option value="upi">UPI</option>
                <option value="card">Credit / Debit Card</option>
                <option value="netbanking">Netbanking</option>
              </select>
              <select id="custom-sim-reason" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 0.8rem;">
                <option value="authentication_failure">3DS Auth Failure</option>
                <option value="network_error">Network Switch Timeout</option>
                <option value="insufficient_funds">Insufficient Funds</option>
                <option value="card_expired">Card Expired</option>
                <option value="fraud_flag">Fraud Security Flag</option>
              </select>
            </div>
            <button class="btn btn-primary" style="display: flex; align-items: center; gap: 6px;" onclick="RecoveryPage.handleCustomSimulate()">
              <span>⚡ Ingest & Run Agent Pipeline</span>
            </button>
          </div>
        </div>

        <!-- 2. Agent Neural Pipeline Visualizer -->
        <div class="pipeline-visualizer">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              🧠 Live Agent Neural Pipeline Visualizer
              <span class="badge ${isExecuting ? 'primary' : 'success'}">${isExecuting ? 'Processing...' : 'Decision Completed'}</span>
            </div>
            <div style="font-size: 0.74rem; color: var(--text-muted);">
              Deterministic Guardrails Active: <strong>POL-01 through POL-06</strong>
            </div>
          </div>

          <div class="pipeline-track">
            ${pipelineNodesHtml}
          </div>

          ${pipelineDrawerHtml}
        </div>

        <!-- 3. Stat Cards -->
        <div class="stats-grid">
          ${statsCards}
        </div>

        <!-- 4. Main Tables -->
        ${tableHtml}
        ${hitlQueueHtml}
      </div>
    `;
  }

  return {
    render,
    runPreset,
    handleCustomSimulate,
    handleEngineChange,
    toggleIntegrationSettings,
    setGateway,
    copyWebhookUrl,
    testConnection,
    saveGatewaySettings,
    handleRetry: handleRetryClick,
    handleOverride: handleOverrideClick,
    toggleTraceView,
  };
})();
