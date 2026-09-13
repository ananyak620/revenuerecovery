/* ============================================
   ReviveAI — Churn Prediction & Proactive Retention
   Autonomous Multi-Agent Retention Swarm
   ============================================ */

const ChurnPage = (() => {
  let activeFilter = 'all';
  let activeRetentionExecution = null;
  let isExecutingRetention = false;
  let activePipelineStage = 5; // default all passed
  let selectedPresetKey = 'critical_alpha';
  let traceViewMode = 'simple'; // 'simple' or 'detailed'

  function getVolume() {
    return MockData.getVolume ? MockData.getVolume() : 1000000;
  }

  function setPortfolioVolume(vol) {
    if (MockData.setVolume) {
      MockData.setVolume(vol, MockData.getAOV ? MockData.getAOV() : 2500);
    }
    updateLiveMetrics();
  }

  function toggleTraceView(mode) {
    if (mode) {
      traceViewMode = mode;
    } else {
      traceViewMode = traceViewMode === 'simple' ? 'detailed' : 'simple';
    }
    App.render();
  }

  // Initialize default active execution on load
  function initDefaultExecution() {
    if (!activeRetentionExecution) {
      const presets = AIService.getChurnPresets ? AIService.getChurnPresets() : {};
      const p = presets.critical_alpha || {
        company: 'Alpha Corp',
        mrr: 18500,
        riskScore: 94,
        churnReason: 'Declining product usage (-58% over 30d), opened 7 support tickets'
      };

      activeRetentionExecution = {
        company: p.company,
        customer_id: 'cus_alpha_99',
        mrr: p.mrr,
        riskScore: p.riskScore,
        retainProb: 0.82,
        expected_ltv_saved: Math.round(p.mrr * 0.82 * 12),
        churn_category: 'usage_collapse',
        hitl_status: 'AUTONOMOUS_APPROVED',
        revision_count: 1,
        final_action: 'executive_concierge_rescue',
        discount_offered: 15,
        playbook: 'PB-PROACTIVE-ONBOARDING-RESCUE',
        diagnosis: p.churnReason,
        stages: [
          { name: 'Telemetry Detective', icon: '🕵️', status: 'completed', time: '16ms', details: 'Forensics: Critical Churn (94%)' },
          { name: 'Retention Strategist', icon: '🧠', status: 'completed', time: '34ms', details: 'Playbook: PB-PROACTIVE-ONBOARDING-RESCUE' },
          { name: 'Retention Auditor', icon: '⚖️', status: 'completed', time: '12ms', details: 'Self-Corrected (1 Revision: Discount capped at 15%)' },
          { name: 'HITL Review Gate', icon: '🛑', status: 'completed', time: '3ms', details: 'Autonomous Concierge Approved' },
          { name: 'Concierge Communicator', icon: '✍️', status: 'completed', time: '22ms', details: 'VIP Concierge Outreach Dispatched' }
        ],
        agent_trace: [
          "[Detective] Ingesting real-time behavioral telemetry for Alpha Corp (MRR: ₹18,500, Risk: 94/100)...",
          "[Detective] Root-cause forensics: Declining product usage (-58% over 30d), opened 7 support tickets. Classification: CRITICAL CHURN THREAT.",
          "[Detective] Querying customer health score & NPS -> Feature adoption: 18%, Support tickets: 7, NPS: 2/10.",
          "[Strategist] Querying RAG Playbook Corpus -> Matched 'PB-PROACTIVE-ONBOARDING-RESCUE'.",
          "[Strategist] Initial formulation: Propose 25% courtesy discount on annual renewal to stop churn.",
          "[Auditor] ❌ Policy Violation: POL-07-MARGIN-CAP (25% exceeds authorized corporate margin discount ceiling of 20%).",
          "[Loop] 🔁 Self-Correction iteration #1: Auditor critiques discount size ➔ Re-planning with Strategist...",
          "[Strategist] Revised retention package: 15% discount + 1-on-1 Quarterly Architecture Review with Lead Success Engineer.",
          "[Auditor] ✅ Guardrail Audit Passed: 15% discount <= 20% cap. LTV margin preserved.",
          "[HITL Gate] Cleared for autonomous concierge dispatch.",
          "[Communicator] Generated personalized retention concierge draft & dynamic calendar booking link: https://reviveai.io/concierge/alpha_corp?tok=9a4c1",
          "[Communicator] Channel selected: EXECUTIVE EMAIL + WHATSAPP. Delivered to account decision maker."
        ],
        outreach: {
          channel: 'Executive Email + WhatsApp',
          headline: 'Dedicated Technical Advisory Session',
          magic_link: 'https://reviveai.io/concierge/alpha_corp?tok=9a4c1'
        }
      };
    }
  }

  async function runRetentionPreset(presetKey) {
    selectedPresetKey = presetKey;
    const presets = AIService.getChurnPresets ? AIService.getChurnPresets() : {};
    const preset = presets[presetKey];
    if (!preset) return;

    isExecutingRetention = true;
    activePipelineStage = 1;
    Toast.info(`⚡ Proactive Retention Swarm Launched for ${preset.company}...`);
    App.render();

    // Stage 1: Detective
    await new Promise(r => setTimeout(r, 320));
    activePipelineStage = 2;
    App.render();

    // Stage 2: Strategist
    await new Promise(r => setTimeout(r, 360));
    activePipelineStage = 3;
    App.render();

    // Stage 3: Auditor Reflection Loop
    await new Promise(r => setTimeout(r, 340));
    activePipelineStage = 4;
    App.render();

    const result = await AIService.simulateChurnRetention(presetKey);

    // Stage 4: Communicator
    await new Promise(r => setTimeout(r, 300));
    activePipelineStage = 5;
    isExecutingRetention = false;

    activeRetentionExecution = result;
    Toast.success(`✓ Retention Swarm Complete: ${result.final_action.replace(/_/g, ' ').toUpperCase()}`);
    App.render();
  }

  async function runCustomerRetention(customerId) {
    const customer = MockData.customers.find(c => c.id === customerId);
    if (!customer) return;

    isExecutingRetention = true;
    activePipelineStage = 1;
    Toast.info(`⚡ Multi-Agent Swarm investigating ${customer.name} (${customer.company})...`);
    App.render();

    // Smooth scroll to retention console
    const consoleEl = document.getElementById('retention-agent-workspace');
    if (consoleEl) {
      consoleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Stage 1: Detective Forensics
    await new Promise(r => setTimeout(r, 300));
    activePipelineStage = 2;
    App.render();

    // Stage 2: Strategist Planning
    await new Promise(r => setTimeout(r, 350));
    activePipelineStage = 3;
    App.render();

    // Stage 3: Auditor Critique & Reflection
    await new Promise(r => setTimeout(r, 320));
    activePipelineStage = 4;
    App.render();

    const result = await AIService.simulateChurnRetention(customer);

    // Stage 4: Communicator Dispatch
    await new Promise(r => setTimeout(r, 280));
    activePipelineStage = 5;
    isExecutingRetention = false;

    activeRetentionExecution = result;
    Toast.success(`✓ Proactive Retention Package generated for ${customer.company}!`);
    App.render();
  }

  function triggerBatchRetention() {
    const critical = MockData.customers.filter(c => c.riskLevel === 'critical');
    const target = critical.length > 0 ? critical[0] : MockData.customers[0];
    Toast.info(`⚡ Launching Proactive Retention Swarm across ${critical.length} critical accounts...`);
    if (target) {
      runCustomerRetention(target.id);
    }
  }

  function updateLiveMetrics() {
    const isINR = Formatters.getCurrency() === 'INR';
    const currentVol = getVolume();

    // Update Volume Label
    const volDisplay = document.getElementById('churn-vol-val');
    if (volDisplay) {
      volDisplay.innerText = isINR
        ? `₹${(currentVol / 100000).toFixed(1)} Lakhs`
        : `$${Math.round(currentVol / 83.5).toLocaleString()}`;
    }

    const customers = MockData.customers;
    const critical = customers.filter(c => c.riskLevel === 'critical');
    const high = customers.filter(c => c.riskLevel === 'high');
    const medium = customers.filter(c => c.riskLevel === 'medium');
    const low = customers.filter(c => c.riskLevel === 'low');

    const filtered = activeFilter === 'all'
      ? customers
      : customers.filter(c => c.riskLevel === activeFilter);

    const cohortAtRiskMRR = activeFilter === 'all'
      ? MockData.getAtRiskMRR('at_risk')
      : filtered.reduce((s, c) => s + (c.mrr || 0), 0);

    const criticalMRR = critical.reduce((s, c) => s + (c.mrr || 0), 0);
    const recoverableMRR = Math.round(cohortAtRiskMRR * 0.742);
    const avgMRR = filtered.length > 0 ? Math.round(filtered.reduce((s, c) => s + (c.mrr || 0), 0) / filtered.length) : 0;

    // Update KPI Card Numbers
    const atRiskNumEl = document.getElementById('churn-val-at-risk');
    if (atRiskNumEl) atRiskNumEl.innerText = Formatters.currency(cohortAtRiskMRR);

    const recoverableNumEl = document.getElementById('churn-val-recoverable');
    if (recoverableNumEl) recoverableNumEl.innerText = Formatters.currency(recoverableMRR);

    const criticalNumEl = document.getElementById('churn-val-critical');
    if (criticalNumEl) criticalNumEl.innerText = Formatters.currency(criticalMRR);

    const avgNumEl = document.getElementById('churn-val-avg');
    if (avgNumEl) avgNumEl.innerText = Formatters.currency(avgMRR);

    // Update MRR cell in each table row in real time
    document.querySelectorAll('.churn-row-mrr').forEach((cell, idx) => {
      if (filtered[idx]) {
        cell.innerText = Formatters.currency(filtered[idx].mrr);
      }
    });
  }

  function render() {
    initDefaultExecution();

    const isINR = Formatters.getCurrency() === 'INR';
    const currentVol = getVolume();
    const customers = MockData.customers;

    const critical = customers.filter(c => c.riskLevel === 'critical');
    const high = customers.filter(c => c.riskLevel === 'high');
    const medium = customers.filter(c => c.riskLevel === 'medium');
    const low = customers.filter(c => c.riskLevel === 'low');

    const totalMRR = customers.reduce((s, c) => s + (c.mrr || 0), 0);
    const atRiskMRR = MockData.getAtRiskMRR('at_risk');
    const criticalMRR = critical.reduce((s, c) => s + (c.mrr || 0), 0);
    const highMRR = high.reduce((s, c) => s + (c.mrr || 0), 0);
    const mediumMRR = medium.reduce((s, c) => s + (c.mrr || 0), 0);
    const lowMRR = low.reduce((s, c) => s + (c.mrr || 0), 0);

    const filtered = activeFilter === 'all'
      ? customers
      : customers.filter(c => c.riskLevel === activeFilter);

    const activeCohortMRR = activeFilter === 'all'
      ? atRiskMRR
      : filtered.reduce((s, c) => s + (c.mrr || 0), 0);

    const recoverableMRR = Math.round(activeCohortMRR * 0.742);
    const avgMRR = filtered.length > 0 ? Math.round(filtered.reduce((s, c) => s + (c.mrr || 0), 0) / filtered.length) : 0;

    const filterTitle = activeFilter === 'all'
      ? 'Total At-Risk MRR'
      : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Tier MRR`;

    // Presets for volume
    const inrPresets = [
      { label: '₹5L', val: 500000 },
      { label: '₹10L (Default)', val: 1000000 },
      { label: '₹25L', val: 2500000 },
      { label: '₹50L', val: 5000000 },
    ];
    const usdPresets = [
      { label: '$6K', val: 500000 },
      { label: '$12K (Default)', val: 1000000 },
      { label: '$30K', val: 2500000 },
      { label: '$60K', val: 5000000 },
    ];
    const presets = isINR ? inrPresets : usdPresets;

    const presetButtonsHtml = presets.map(p => {
      const isSelected = Math.abs(currentVol - p.val) < 20000;
      return `
        <button class="curr-pill-btn ${isSelected ? 'active' : ''}" onclick="ChurnPage.setVolumePreset(${p.val})">
          ${p.label}
        </button>
      `;
    }).join('');

    const statCardsHtml = `
      <div class="stats-grid" style="margin-bottom: 24px;">
        <div class="stat-card danger">
          <div class="stat-header">
            <span class="stat-label">${filterTitle}</span>
            <div class="stat-icon" style="background: rgba(244, 63, 94, 0.18); color: var(--color-danger);">⚠️</div>
          </div>
          <div class="stat-value" id="churn-val-at-risk" style="color: var(--color-danger);">${Formatters.currency(activeCohortMRR)}</div>
          <div class="stat-change negative">
            <span>↓</span> ${activeFilter === 'all' ? `${critical.length + high.length} accounts in danger zone` : `${filtered.length} ${activeFilter} accounts`}
          </div>
        </div>

        <div class="stat-card success">
          <div class="stat-header">
            <span class="stat-label">AI Retainable Revenue</span>
            <div class="stat-icon" style="background: rgba(16, 185, 129, 0.18); color: var(--color-success);">⚡</div>
          </div>
          <div class="stat-value" id="churn-val-recoverable" style="color: var(--color-success);">${Formatters.currency(recoverableMRR)}</div>
          <div class="stat-change positive">
            <span>↑</span> 74.2% AI retention benchmark
          </div>
        </div>

        <div class="stat-card warning">
          <div class="stat-header">
            <span class="stat-label">Critical Tier Exposure</span>
            <div class="stat-icon" style="background: rgba(245, 158, 11, 0.18); color: var(--color-warning);">🚨</div>
          </div>
          <div class="stat-value" id="churn-val-critical" style="color: var(--color-warning);">${Formatters.currency(criticalMRR)}</div>
          <div class="stat-change negative">
            <span>↓</span> ${critical.length} critical accounts (&lt; 7d SLA)
          </div>
        </div>

        <div class="stat-card info">
          <div class="stat-header">
            <span class="stat-label">Avg Customer MRR</span>
            <div class="stat-icon" style="background: rgba(6, 182, 212, 0.18); color: var(--color-info);">📊</div>
          </div>
          <div class="stat-value" id="churn-val-avg" style="color: var(--color-info);">${Formatters.currency(avgMRR)}</div>
          <div class="stat-change positive">
            <span>●</span> Scaled with portfolio volume
          </div>
        </div>
      </div>
    `;

    // Retention Presets Sandbox HTML
    const churnPresets = AIService.getChurnPresets ? AIService.getChurnPresets() : {};
    const churnPresetKeys = Object.keys(churnPresets);
    const churnPresetsHtml = churnPresetKeys.map(k => {
      const p = churnPresets[k];
      const isSelected = selectedPresetKey === k;
      return `
        <div class="preset-card ${isSelected ? 'active' : ''}" onclick="ChurnPage.runRetentionPreset('${k}')">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${p.name}</span>
            <span class="badge ${p.tagType}">${p.tag}</span>
          </div>
          <div style="font-size: 0.76rem; color: var(--text-secondary); line-height: 1.4; margin-top: 4px;">
            ${p.description}
          </div>
          <div style="font-size: 0.72rem; color: #a78bfa; margin-top: 6px; line-height: 1.3;">
            <span style="color: var(--text-muted);">Key:</span> <strong>${p.keyDriver || 'Usage Collapse'}</strong> • <span style="color: var(--text-muted);">Action:</span> <strong>${p.expectedAction || 'Concierge'}</strong>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px; margin-top: 8px;">
            <span style="font-family: monospace; font-size: 0.84rem; font-weight: 600; color: var(--color-primary-light);">${Formatters.currency(p.mrr)}/mo</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">Run Swarm →</span>
          </div>
        </div>
      `;
    }).join('');

    // 5-Stage Pipeline Visualizer (Short & Simple)
    const stages = activeRetentionExecution?.stages || [];
    const stageKeywords = [
      'Forensics',
      'Playbook Planner',
      'Margin & Reflection',
      'HITL Gate',
      'Magic Link'
    ];

    const pipelineNodesHtml = stages.map((s, idx) => {
      const stageNum = idx + 1;
      let statusClass = 'completed';
      if (isExecutingRetention) {
        if (stageNum === activePipelineStage) statusClass = 'active';
        else if (stageNum > activePipelineStage) statusClass = '';
      } else if (s.status === 'blocked') {
        statusClass = 'blocked';
      }

      return `
        <div class="pipeline-node ${statusClass}" title="${s.details}">
          <div class="pipeline-node-icon">${s.icon}</div>
          <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">${s.name}</div>
          <div style="font-size: 0.65rem; color: #38bdf8; font-weight: 600;">${stageKeywords[idx] || 'Stage'}</div>
          <div style="display: flex; gap: 4px; align-items: center; margin-top: 2px;">
            <span class="badge ${statusClass === 'blocked' ? 'danger' : statusClass === 'active' ? 'primary' : 'success'}" style="font-size: 0.65rem; padding: 2px 6px;">
              ${statusClass === 'blocked' ? 'Policy Block' : statusClass === 'active' ? 'Running...' : 'Passed'}
            </span>
            <span style="font-size: 0.65rem; color: var(--text-muted); font-family: monospace;">${s.time}</span>
          </div>
        </div>
        ${idx < stages.length - 1 ? `<div class="pipeline-connector ${stageNum < activePipelineStage || !isExecutingRetention ? 'active' : ''}"></div>` : ''}
      `;
    }).join('');

    const traces = activeRetentionExecution?.agent_trace || [
      `[Detective] Classified telemetry: ${activeRetentionExecution?.company} (Risk: ${activeRetentionExecution?.riskScore}/100)`,
      `[Strategist] Queried RAG Playbooks -> Formulated: ${activeRetentionExecution?.final_action}`,
      `[Auditor] Evaluated Corporate Margin Guardrails -> Approved: 15% discount <= 20% cap`,
      `[Communicator] Generated personalized VIP Concierge outreach and calendar link`
    ];

    // 4 Summary Boxes Right After Pipeline Execution (Short & Simple)
    const pipelineDrawerHtml = activeRetentionExecution ? `
      <div class="pipeline-drawer" style="margin-bottom: 20px;">
        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Target Account</div>
          <div style="font-family: monospace; font-weight: 700; font-size: 0.95rem; color: var(--color-primary-light); margin-top: 2px;">
            ${activeRetentionExecution.company}
          </div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">
            MRR: <strong>${Formatters.currency(activeRetentionExecution.mrr)}</strong> | Risk: <strong style="color: #ef4444;">${activeRetentionExecution.riskScore}/100</strong>
          </div>
          <div style="margin-top: 4px;">
            <span class="badge ${activeRetentionExecution.churn_category === 'voluntary_churn' ? 'warning' : 'danger'}" style="font-size: 0.7rem;">
              🕵️ ${activeRetentionExecution.churn_category ? activeRetentionExecution.churn_category.replace('_', ' ').toUpperCase() : 'CRITICAL THREAT'}
            </span>
          </div>
        </div>

        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Preserved LTV & Retention</div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #34d399; margin-top: 2px;">
            ${Math.round((activeRetentionExecution.retainProb || 0.8) * 100)}% Retainable
          </div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">
            Protected LTV: <strong>${Formatters.currency(activeRetentionExecution.expected_ltv_saved || 0)}</strong>
          </div>
          <div style="font-size: 0.72rem; color: #38bdf8; margin-top: 4px;">
            🧠 RAG Playbooks Consulted
          </div>
        </div>

        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Strategist & Reflection Loop</div>
          <div style="font-size: 0.8rem; color: var(--text-primary); font-weight: 600; margin-top: 2px;">
            ${activeRetentionExecution.diagnosis || 'Proactive intervention formulated'}
          </div>
          <div style="font-size: 0.74rem; color: #a78bfa; margin-top: 4px; display: flex; align-items: center; gap: 6px;">
            <span>🔁 Reflection Loop:</span>
            <span class="badge primary" style="font-size: 0.65rem;">${activeRetentionExecution.revision_count || 0} Revisions</span>
          </div>
        </div>

        <div>
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Guardrail Policy & HITL</div>
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
            <span class="badge success">
              POL-07 MARGIN CAP APPROVED
            </span>
          </div>
          <div style="font-size: 0.78rem; font-weight: 600; color: var(--color-primary-light); margin-top: 4px;">
            Action: ${activeRetentionExecution.final_action ? activeRetentionExecution.final_action.replace(/_/g, ' ').toUpperCase() : 'SCHEDULE CSM'}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
            Gate: <strong style="color: #f59e0b;">${activeRetentionExecution.hitl_status || 'AUTONOMOUS'}</strong>
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
            ${(activeRetentionExecution.churn_category || 'churn_threat').replace('_', ' ').toUpperCase()}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
            ${activeRetentionExecution.churn_category === 'voluntary_churn' ? 'Price/intent churn detected' : 'Usage drop & ticket elevation detected'}
          </div>
        </div>

        <!-- Strategist Card -->
        <div style="background: rgba(167, 139, 250, 0.05); border: 1px solid rgba(167, 139, 250, 0.25); border-radius: 8px; padding: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 700; color: #a78bfa; font-size: 0.84rem;">🧠 Strategist</span>
            <span class="badge primary" style="font-size: 0.62rem;">Planner</span>
          </div>
          <div style="font-weight: 700; font-size: 0.82rem; color: #f1f5f9;">
            ACTION: ${(activeRetentionExecution.final_action || 'schedule_csm').replace(/_/g, ' ').toUpperCase()}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
            Playbook matched ➔ Optimized to protect LTV
          </div>
        </div>

        <!-- Auditor Card -->
        <div style="background: rgba(244, 63, 94, 0.05); border: 1px solid rgba(244, 63, 94, 0.25); border-radius: 8px; padding: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 700; color: #fb7185; font-size: 0.84rem;">⚖️ Auditor Critic</span>
            <span class="badge ${activeRetentionExecution.revision_count > 0 ? 'warning' : 'success'}" style="font-size: 0.62rem;">
              ${activeRetentionExecution.revision_count > 0 ? 'Self-Corrected' : 'Approved'}
            </span>
          </div>
          <div style="font-weight: 700; font-size: 0.82rem; color: #34d399;">
            POL-07 MARGIN CAP APPROVED
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
            ${activeRetentionExecution.revision_count > 0 ? 'Conceded discount to 15% (margin cap <= 20%)' : '0 guardrail violations; margin preserved'}
          </div>
        </div>

        <!-- Communicator Card -->
        <div style="background: rgba(52, 211, 153, 0.05); border: 1px solid rgba(52, 211, 153, 0.25); border-radius: 8px; padding: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-weight: 700; color: #34d399; font-size: 0.84rem;">✍️ Communicator</span>
            <span class="badge success" style="font-size: 0.62rem;">Dispatched</span>
          </div>
          <div style="font-weight: 700; font-size: 0.82rem; color: #f1f5f9;">
            ${activeRetentionExecution.outreach?.channel ? activeRetentionExecution.outreach.channel.toUpperCase() : 'EXECUTIVE EMAIL'}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
            1-Click VIP Concierge calendar link generated
          </div>
        </div>
      </div>

      <!-- Live Multi-Agent Deliberation Terminal (Short & Simple Toggle) -->
      <div style="background: #090d16; border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #38bdf8; font-weight: 700; font-size: 0.86rem;">⚡ Live Multi-Agent Retention Deliberation</span>
            <span style="font-size: 0.66rem; color: #34d399; background: rgba(52, 211, 153, 0.1); padding: 2px 8px; border-radius: 4px;">● Reflection Loop Active</span>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-sm ${traceViewMode === 'simple' ? 'btn-primary' : 'btn-secondary'}" style="font-size: 0.68rem; padding: 2px 8px;" onclick="ChurnPage.toggleTraceView('simple')">
              ✓ Short & Simple
            </button>
            <button class="btn btn-sm ${traceViewMode === 'detailed' ? 'btn-primary' : 'btn-secondary'}" style="font-size: 0.68rem; padding: 2px 8px;" onclick="ChurnPage.toggleTraceView('detailed')">
              Detailed Traces
            </button>
          </div>
        </div>

        ${traceViewMode === 'simple' ? `
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.8rem; line-height: 1.4;">
            <div style="display: flex; align-items: flex-start; gap: 8px; color: #e2e8f0;">
              <span style="font-size: 1rem; line-height: 1;">🕵️</span>
              <div>
                <strong style="color: #38bdf8;">[FORENSICS] Telemetry Detective:</strong>
                <span>Classified telemetry for <strong>${activeRetentionExecution.company}</strong> ➔ ${activeRetentionExecution.diagnosis || 'Active retention threat detected'}.</span>
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 8px; color: #e2e8f0;">
              <span style="font-size: 1rem; line-height: 1;">🧠</span>
              <div>
                <strong style="color: #a78bfa;">[RAG PLAYBOOK] Retention Strategist:</strong>
                <span>Matched RAG Playbook ➔ Formulated intervention: <strong>${(activeRetentionExecution.final_action || 'schedule_csm').replace(/_/g, ' ').toUpperCase()}</strong> (${Math.round((activeRetentionExecution.retainProb || 0.8) * 100)}% Retainable, Preserved LTV: ${Formatters.currency(activeRetentionExecution.expected_ltv_saved || 0)}).</span>
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 8px; color: #e2e8f0;">
              <span style="font-size: 1rem; line-height: 1;">⚖️</span>
              <div>
                <strong style="color: #fb7185;">[REFLECTION LOOP & MARGIN CAP] Retention Auditor:</strong>
                <span>${activeRetentionExecution.revision_count > 0 ? '<span style="color: #fbbf24;">Self-Correction Loop:</span> Rejected >20% discount ➔ Strategist revised to compliant 15% ➔ <span style="color: #34d399;">Approved</span>.' : 'Evaluated against corporate margin ceiling & dunning caps ➔ <span style="color: #34d399;">Approved (0 violations)</span>.'}</span>
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 8px; color: #e2e8f0;">
              <span style="font-size: 1rem; line-height: 1;">✍️</span>
              <div>
                <strong style="color: #34d399;">[MAGIC LINK DISPATCH] Concierge Communicator:</strong>
                <span>Dispatched <strong>1-Click VIP Concierge</strong> link via <strong>${activeRetentionExecution.outreach?.channel ? activeRetentionExecution.outreach.channel.toUpperCase() : 'EXECUTIVE EMAIL'}</strong>.</span>
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
      title: `Predicted Churn Customers (${filtered.length}) — Cohort MRR: ${Formatters.currency(activeCohortMRR)}`,
      columns: ['Customer', 'Company', 'MRR', 'Risk Score', 'Engagement', 'Churn Indicator', 'Retention Recommendation', 'Agent Action'],
      headerActions: `
        <div style="display: flex; align-items: center; gap: 8px;">
          <select class="select" onchange="ChurnPage.setFilter(this.value)" style="min-width: 220px;">
            <option value="all" ${activeFilter === 'all' ? 'selected' : ''}>All Risk Levels (${customers.length}) — ${Formatters.currency(totalMRR)}</option>
            <option value="critical" ${activeFilter === 'critical' ? 'selected' : ''}>Critical (${critical.length}) — ${Formatters.currency(criticalMRR)}</option>
            <option value="high" ${activeFilter === 'high' ? 'selected' : ''}>High (${high.length}) — ${Formatters.currency(highMRR)}</option>
            <option value="medium" ${activeFilter === 'medium' ? 'selected' : ''}>Medium (${medium.length}) — ${Formatters.currency(mediumMRR)}</option>
            <option value="low" ${activeFilter === 'low' ? 'selected' : ''}>Low (${low.length}) — ${Formatters.currency(lowMRR)}</option>
          </select>
        </div>
      `,
      data: filtered,
      rowRenderer: (c) => `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.75rem;">${c.avatar}</div>
              <div>
                <div style="font-weight: 600; color: var(--text-primary);">${c.name}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">${c.email}</div>
              </div>
            </div>
          </td>
          <td>${c.company}</td>
          <td style="font-weight: 600; color: var(--text-primary);" class="churn-row-mrr">${Formatters.currency(c.mrr)}</td>
          <td><span class="risk-score ${c.riskLevel}">${c.riskScore}</span></td>
          <td>
            <div style="width: 90px;">
              <div class="progress-bar">
                <div class="progress-fill ${c.riskScore > 60 ? 'danger' : 'success'}" style="width: ${c.featureAdoption}%;"></div>
              </div>
              <span style="font-size: 0.7rem; color: var(--text-muted);">${c.featureAdoption}% adoption</span>
            </div>
          </td>
          <td class="col-churn-indicator">
            <div class="churn-indicator-text">
              <span class="indicator-icon">⚠️</span>
              <span>${c.churnReason}</span>
            </div>
          </td>
          <td class="col-retention-action">
            <div class="retention-recommendation-badge">
              <span class="action-icon">💡</span>
              <span>${c.retentionAction}</span>
            </div>
          </td>
          <td style="white-space: nowrap; text-align: center;">
            <button class="btn btn-primary btn-sm" onclick="ChurnPage.runCustomerRetention('${c.id}')" title="Trigger 4-Agent Autonomous Retention Pipeline">
              🤖 Retain Account
            </button>
          </td>
        </tr>
      `
    });

    return `
      <div class="page-container">
        <div class="page-header" style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div>
            <h1>ML Churn Prediction & Proactive Retention Agent</h1>
            <p>Autonomous multi-agent retention swarm preventing customer attrition before payment failure.</p>
          </div>
          <div class="header-actions" style="margin-top: 0;">
            <button class="btn btn-primary" onclick="ChurnPage.triggerBatchRetention()">⚡ Trigger Auto-Retention Swarm</button>
          </div>
        </div>

        <!-- Interactive Volume & At-Risk Scale Bar -->
        <div class="card" style="margin-bottom: 24px; padding: 18px 22px; background: linear-gradient(145deg, rgba(14, 165, 233, 0.06) 0%, rgba(13, 18, 30, 0.85) 100%); border: 1px solid rgba(14, 165, 233, 0.25);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-primary-light);">
                📐 Portfolio Exposure / Failed Volume:
              </span>
              <strong id="churn-vol-val" style="font-family: 'Space Grotesk', monospace; font-size: 1.05rem; color: #fff;">
                ${isINR ? `₹${(currentVol / 100000).toFixed(1)} Lakhs` : `$${Math.round(currentVol / 83.5).toLocaleString()}`}
              </strong>
              <div style="display: flex; gap: 4px; background: rgba(0, 0, 0, 0.25); padding: 3px; border-radius: var(--radius-full); border: 1px solid var(--border-color);">
                ${presetButtonsHtml}
              </div>
            </div>

            <div style="display: align-items: center; gap: 12px; min-width: 260px; flex: 1; max-width: 420px;">
              <span style="font-size: 0.72rem; color: var(--text-muted); white-space: nowrap;">Scale Volume:</span>
              <input
                id="churn-vol-slider"
                type="range"
                min="100000"
                max="5000000"
                step="50000"
                value="${currentVol}"
                class="roi-range-input"
                style="flex: 1;"
                oninput="ChurnPage.onSliderInput(this.value)"
              />
            </div>
          </div>
        </div>

        <!-- Live MRR At Risk Metrics Grid -->
        ${statCardsHtml}

        <!-- ⚡ PROACTIVE RETENTION MULTI-AGENT SWARM WORKSPACE -->
        <div id="retention-agent-workspace" class="card" style="margin-bottom: 24px; border: 1px solid rgba(139, 92, 246, 0.35); background: linear-gradient(160deg, rgba(139, 92, 246, 0.05) 0%, rgba(13, 18, 30, 0.95) 100%);">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 14px; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; color: #c4b5fd;">
                  ⚡ Proactive Multi-Agent Retention Console
                </h2>
                <span class="badge primary" style="font-size: 0.7rem;">● 4-Agent Autonomous Swarm Active</span>
              </div>
              <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px; margin-bottom: 0;">
                Collaborative personas: Telemetry Detective ➔ Retention Strategist ➔ Retention Auditor ➔ Concierge Communicator
              </p>
            </div>
            <div style="font-size: 0.75rem; color: #34d399; background: rgba(52, 211, 153, 0.1); padding: 4px 10px; border-radius: 4px;">
              🛡️ POL-07 Margin Cap &lt;= 20% Self-Correction Guardrail
            </div>
          </div>

          <!-- Scenario Sandbox Presets -->
          <div style="margin-bottom: 18px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px;">
              🧪 One-Click Retention Scenario Sandboxes:
            </div>
            <div class="preset-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
              ${churnPresetsHtml}
            </div>
          </div>

          <!-- 5-Stage Pipeline Visualizer -->
          <div style="margin-bottom: 18px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px;">
              🔄 Autonomous Retention Pipeline Execution:
            </div>
            <div class="pipeline-visualizer" style="display: flex; align-items: center; justify-content: space-between; overflow-x: auto; padding: 12px 6px;">
              ${pipelineNodesHtml}
            </div>
          </div>

          <!-- Active Execution Drawer, Persona Cards & Deliberation Terminal -->
          ${pipelineDrawerHtml}
        </div>

        <div class="charts-grid-equal" style="margin-bottom: 24px;">
          <div class="chart-card">
            <div class="chart-header">
              <div class="chart-title">Customer Risk Distribution</div>
              <div class="chart-subtitle">Breakdown by current predictive risk tiers</div>
            </div>
            <div class="chart-container">
              <canvas id="churnRiskDonut"></canvas>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-header">
              <div class="chart-title">Top Churn Triggers Detected</div>
              <div class="chart-subtitle">Feature importance in recent risk elevation</div>
            </div>
            <div class="chart-container">
              <canvas id="churnTriggersBar"></canvas>
            </div>
          </div>
        </div>

        <div>
          ${tableHtml}
        </div>
      </div>
    `;
  }

  function init() {
    const customers = MockData.customers;
    const critical = customers.filter(c => c.riskLevel === 'critical').length;
    const high = customers.filter(c => c.riskLevel === 'high').length;
    const medium = customers.filter(c => c.riskLevel === 'medium').length;
    const low = customers.filter(c => c.riskLevel === 'low').length;

    ChartComponent.createDoughnutChart(
      'churnRiskDonut',
      ['Critical Risk', 'High Risk', 'Medium Risk', 'Low Risk'],
      [critical, high, medium, low],
      ['#ef4444', '#f59e0b', '#0ea5e9', '#10b981']
    );

    ChartComponent.createBarChart(
      'churnTriggersBar',
      ['Usage Decline', 'Failed Payments', 'Support Tickets', 'Negative NPS', 'Renewal Window'],
      [38, 26, 18, 12, 6],
      'Impact Score',
      '#8b5cf6'
    );
  }

  function setFilter(level) {
    activeFilter = level;
    App.render();
  }

  function onSliderInput(val) {
    const numeric = parseFloat(val);
    setPortfolioVolume(numeric);
  }

  function setVolumePreset(val) {
    setPortfolioVolume(val);
    App.render();
    Toast.success(`Portfolio volume set to ${Formatters.currency(val / 83.5, false, false)}. MRR values recalculated!`);
  }

  return {
    render,
    init,
    setFilter,
    onSliderInput,
    setVolumePreset,
    toggleTraceView,
    runRetentionPreset,
    runCustomerRetention,
    triggerBatchRetention
  };
})();
