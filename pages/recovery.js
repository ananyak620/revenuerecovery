/* ============================================
   ReviveAI — Payment Recovery & Agent Sandbox Page
   Razorpay Hackathon Live Interactive Showcase
   ============================================ */

const RecoveryPage = (() => {
  let activePipelineStage = 5; // default all completed
  let selectedPresetKey = 'upi_timeout';
  let recentExecution = null;
  let isExecuting = false;

  // Initial execution state on load
  function initDefaultExecution() {
    if (!recentExecution) {
      const presets = AIService.getPresets();
      const p = presets.upi_timeout;
      recentExecution = {
        transaction_id: 'pay_rzp_99018',
        amount: p.amount,
        payment_method: p.payment_method,
        failure_reason: p.failure_reason,
        status: 'completed',
        stages: [
          { name: 'Gateway Ingestion', icon: '⚡', status: 'completed', time: '12ms', details: 'Razorpay webhook payment.failed ingested & validated' },
          { name: 'Calibrated ML', icon: '📊', status: 'completed', time: '28ms', details: 'XGBoost P(Recovery): 89.2% | ERV: ₹4,459' },
          { name: 'LLM Strategy', icon: '🧠', status: 'completed', time: '115ms', details: 'Gemini 1.5 Flash: Transient UPI timeout. Recommend 1.5h retry.' },
          { name: 'Safety Guardrail', icon: '🛡️', status: 'completed', time: '4ms', details: 'Policy POL-01 & POL-02 Passed (0 prior retries, no fraud)' },
          { name: 'Action Dispatched', icon: '🚀', status: 'completed', time: '16ms', details: 'Scheduled Smart Retry for 1.5h optimal banking window' }
        ],
        agent_decision: {
          final_action: 'retry',
          recovery_probability: 0.89,
          expected_recovery_value: 4459,
          policy_approved: true,
          diagnosis: 'Temporary UPI switch timeout. 3DS handshake did not complete.',
          reasoning: 'Transient network failure during banking peak hours. 1.5h retry window has highest historical recovery.'
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
    Toast.info(`⚡ Running Scenario: ${preset.name}...`);
    App.render();

    // Step 1: Ingest Webhook
    await new Promise(r => setTimeout(r, 250));
    activePipelineStage = 2;
    App.render();

    // Step 2: ML Scoring
    await new Promise(r => setTimeout(r, 300));
    activePipelineStage = 3;
    App.render();

    // Step 3 & 4: LLM Diagnosis & Policy Check
    const result = await AIService.simulateWebhook({
      amount: preset.amount,
      payment_method: preset.payment_method,
      failure_reason: preset.failure_reason,
    });

    activePipelineStage = 4;
    App.render();
    await new Promise(r => setTimeout(r, 250));

    // Step 5: Final action
    activePipelineStage = 5;
    isExecuting = false;

    const action = result.agent_decision?.final_action || (presetKey === 'fraud_alert' ? 'escalate' : 'retry');
    const isApproved = presetKey !== 'fraud_alert';

    recentExecution = {
      transaction_id: result.transaction_id || `sim_${presetKey}_${Math.floor(Math.random() * 9000 + 1000)}`,
      amount: preset.amount,
      payment_method: preset.payment_method,
      failure_reason: preset.failure_reason,
      status: 'completed',
      stages: [
        { name: 'Gateway Ingestion', icon: '⚡', status: 'completed', time: '14ms', details: `Razorpay webhook event ${result.event_id || 'evt_live'} parsed` },
        { name: 'Calibrated ML', icon: '📊', status: 'completed', time: '32ms', details: `XGBoost P(Recovery): ${Math.round(preset.prob * 100)}% | ERV: ₹${preset.erv.toLocaleString()}` },
        { name: 'LLM Strategy', icon: '🧠', status: 'completed', time: '124ms', details: `${AIService.getLLMInfo().active_provider.toUpperCase()}: ${preset.description}` },
        { name: 'Safety Guardrail', icon: '🛡️', status: isApproved ? 'completed' : 'blocked', time: '5ms', details: preset.policyStatus },
        { name: 'Action Dispatched', icon: '🚀', status: isApproved ? 'completed' : 'blocked', time: '18ms', details: preset.expectedAction }
      ],
      agent_decision: {
        final_action: action,
        recovery_probability: preset.prob,
        expected_recovery_value: preset.erv,
        policy_approved: isApproved,
        diagnosis: preset.description,
        reasoning: `Executed bounded action '${action}' under Policy Engine rules.`
      }
    };

    Toast.success(`✓ ${preset.name} Processed! → Action: ${action.toUpperCase()}`);
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

    const pipelineDrawerHtml = recentExecution ? `
      <div class="pipeline-drawer">
        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Active Transaction</div>
          <div style="font-family: monospace; font-weight: 700; font-size: 0.95rem; color: var(--color-primary-light); margin-top: 2px;">
            ${recentExecution.transaction_id}
          </div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">
            Amount: <strong>₹${recentExecution.amount.toLocaleString()}</strong> (${recentExecution.payment_method.toUpperCase()})
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
        </div>

        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">LLM Reasoning</div>
          <div style="font-size: 0.8rem; color: var(--text-primary); font-weight: 600; margin-top: 2px;">
            ${recentExecution.agent_decision.diagnosis || 'Diagnosis generated'}
          </div>
          <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">
            Engine: ${llmInfo.active_provider.toUpperCase()}
          </div>
        </div>

        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Policy Engine Outcome</div>
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
            <span class="badge ${recentExecution.agent_decision.policy_approved ? 'success' : 'danger'}">
              ${recentExecution.agent_decision.policy_approved ? 'POL-01..06 APPROVED' : 'POL-02 / POL-03 INTERCEPT'}
            </span>
          </div>
          <div style="font-size: 0.78rem; font-weight: 600; color: var(--color-primary-light); margin-top: 4px;">
            Dispatched: ${recentExecution.agent_decision.final_action?.toUpperCase() || 'RETRY'}
          </div>
        </div>
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
        <table class="data-table">
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
    `;

    return `
      <div class="page-container">
        <div class="page-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div>
            <h2 class="page-title">💳 Autonomous Payment Recovery</h2>
            <p class="page-subtitle">Razorpay Failure Ingestion, Calibrated XGBoost Scoring & Policy-Bounded Action Execution</p>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.04); padding: 6px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <span style="font-size: 0.78rem; color: var(--text-secondary);">LLM Engine:</span>
            <select id="llm-engine-select" style="background: rgba(0,0,0,0.4); border: 1px solid var(--border-color); color: var(--color-primary-light); font-size: 0.78rem; padding: 4px 8px; border-radius: 6px; outline: none; cursor: pointer;" onchange="RecoveryPage.handleEngineChange(this.value)">
              <option value="gemini" ${llmInfo.active_provider === 'gemini' ? 'selected' : ''}>⚡ Google Gemini 1.5 Flash (Cloud)</option>
              <option value="ollama" ${llmInfo.active_provider === 'ollama' ? 'selected' : ''}>🔒 Qwen 2.5 7B (Local Privacy)</option>
              <option value="heuristic" ${llmInfo.active_provider === 'heuristic' ? 'selected' : ''}>🛡️ Deterministic Heuristic (Offline)</option>
            </select>
          </div>
        </div>

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
    handleRetry: handleRetryClick,
    handleOverride: handleOverrideClick,
  };
})();
