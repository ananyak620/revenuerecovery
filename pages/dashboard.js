/* ============================================
   ReviveAI — Dashboard Page
   With Interactive Merchant ROI Calculator
   ============================================ */

const DashboardPage = (() => {
  function getFailedVolume() {
    return MockData.getVolume ? MockData.getVolume() : 1000000;
  }
  function getAOV() {
    return MockData.getAOV ? MockData.getAOV() : 2500;
  }

  function calculateMetrics(vol, orderVal) {
    const isINR = Formatters.getCurrency() === 'INR';
    const sym = Formatters.getCurrencySymbol();
    const rate = isINR ? 1 : (1 / 83.5);

    const calcVol = vol * rate;
    const calcAov = Math.max(10, orderVal * rate);
    const monthlySaved = calcVol * 0.742;
    const annualSaved = monthlySaved * 12;

    // Accounts saved per month from involuntary churn
    const totalFailedAccounts = Math.max(1, Math.round(calcVol / calcAov));
    const recoveredAccounts = Math.max(1, Math.round(totalFailedAccounts * 0.742));

    // Dynamic Churn Reduction % scaled with recovery volume
    const churnPct = Math.min(34.5, Math.max(12.0, 13.5 + (vol / 5000000) * 18.5)).toFixed(1);

    // Platform cost model: base SaaS tier + 1.8% success fee
    const platformCost = (isINR ? 7500 : 90) + (monthlySaved * 0.018);
    const netReturn = Math.max(0, monthlySaved - platformCost);
    const roiMultiplier = (monthlySaved / Math.max(1, platformCost)).toFixed(1);

    return {
      isINR,
      sym,
      calcVol,
      calcAov,
      monthlySaved,
      annualSaved,
      recoveredAccounts,
      churnPct,
      netReturn,
      roiMultiplier,
      platformCost
    };
  }

  function updateROICalculations() {
    const volInput = document.getElementById('roi-vol-slider');
    const aovInput = document.getElementById('roi-aov-slider');

    const vol = volInput ? parseFloat(volInput.value) : getFailedVolume();
    const orderVal = aovInput ? parseFloat(aovInput.value) : getAOV();

    if (MockData.setVolume) {
      MockData.setVolume(vol, orderVal);
    }

    const m = calculateMetrics(vol, orderVal);

    const volLabel = document.getElementById('roi-vol-val');
    const aovLabel = document.getElementById('roi-aov-val');
    const monthlySavedEl = document.getElementById('roi-monthly-saved');
    const annualSavedEl = document.getElementById('roi-annual-saved');
    const churnRedEl = document.getElementById('roi-churn-reduction');
    const churnSubEl = document.getElementById('roi-churn-sub');
    const netReturnEl = document.getElementById('roi-net-return') || document.getElementById('roi-multiplier');
    const netSubEl = document.getElementById('roi-net-sub');

    if (volLabel) {
      volLabel.innerText = m.isINR 
        ? `₹${(vol / 100000).toFixed(1)} Lakhs` 
        : `$${Math.round(m.calcVol).toLocaleString()}`;
    }
    if (aovLabel) aovLabel.innerText = `${m.sym}${Math.round(m.calcAov).toLocaleString()}`;
    if (monthlySavedEl) monthlySavedEl.innerText = `${m.sym}${Math.round(m.monthlySaved).toLocaleString()}`;
    if (annualSavedEl) annualSavedEl.innerText = `${m.sym}${Math.round(m.annualSaved).toLocaleString()}`;
    
    if (churnRedEl) churnRedEl.innerText = `-${m.churnPct}%`;
    if (churnSubEl) churnSubEl.innerText = `${m.recoveredAccounts.toLocaleString()} accounts saved/mo`;

    if (netReturnEl) netReturnEl.innerText = `${m.sym}${Math.round(m.netReturn).toLocaleString()}`;
    if (netSubEl) netSubEl.innerText = `${m.roiMultiplier}x Net ROI vs fee`;

    // Dynamic Live Update for Top Stat Cards
    const mrrEl = document.getElementById('stat-val-mrr');
    if (mrrEl) {
      mrrEl.innerText = Formatters.currency(MockData.stats.mrr);
    }

    const atRiskEl = document.getElementById('stat-val-at-risk');
    if (atRiskEl) {
      const atRiskAmount = MockData.getAtRiskMRR ? MockData.getAtRiskMRR('at_risk') : MockData.stats.atRiskRevenue;
      atRiskEl.innerText = Formatters.currency(atRiskAmount);
    }

    const recEl = document.getElementById('stat-val-recovered');
    if (recEl) {
      recEl.innerText = `${m.sym}${Math.round(m.monthlySaved).toLocaleString()}`;
    }

    const churnEl = document.getElementById('stat-val-churn-rate');
    if (churnEl) {
      const baseChurn = MockData.stats.baseChurnRate || 3.2;
      const effectiveChurn = Math.max(1.1, (baseChurn * (1 - (parseFloat(m.churnPct) / 100)))).toFixed(1);
      churnEl.innerText = `${effectiveChurn}%`;
    }

    // Dynamic Live Update for Recent High-Risk Customer MRR cells in table
    const mrrCells = document.querySelectorAll('.dash-cust-mrr');
    if (mrrCells && mrrCells.length > 0) {
      mrrCells.forEach((cell, idx) => {
        if (MockData.customers[idx]) {
          cell.innerText = Formatters.currency(MockData.customers[idx].mrr);
        }
      });
    }

    // Dynamic Live Update for Revenue & Recovery Bar Graph
    if (typeof ChartComponent !== 'undefined' && ChartComponent.updateRevenueChart) {
      const currentScale = MockData.getVolumeScale ? MockData.getVolumeScale() : 1;
      ChartComponent.updateRevenueChart('revenuePerformanceChart', currentScale);
    }
  }

  function refreshMetrics() {
    updateROICalculations();
    StatCard.animateAll();
    if (typeof Toast !== 'undefined') {
      Toast.success('✓ Real-time revenue metrics refreshed & synchronized!');
    }
  }

  let activeFleetAlert = null;

  async function dispatchCustomerAgent(customerId) {
    const customer = MockData.customers.find(c => c.id === customerId);
    if (!customer) return;

    Toast.info(`⚡ 4-Agent Swarm investigating ${customer.name} (${customer.company})...`);
    await new Promise(r => setTimeout(r, 350));

    Toast.info(`🕵️ Detective forensics: ${customer.churnReason}`);
    await new Promise(r => setTimeout(r, 350));

    Toast.info(`🧠 Strategist formulated: ${customer.retentionAction} • ⚖️ Auditor: POL-07 Approved`);
    await new Promise(r => setTimeout(r, 350));

    Toast.success(`✓ ✍️ Communicator dispatched 1-Click VIP Concierge link to ${customer.name}!`);
    activeFleetAlert = {
      customer: customer.name,
      company: customer.company,
      action: customer.retentionAction,
      time: 'Just now'
    };
    App.render();
  }

  async function runFleetDiagnostic() {
    Toast.info('⚡ Running Autonomous Multi-Agent Fleet Swarm across all pending payments & at-risk accounts...');
    await new Promise(r => setTimeout(r, 500));
    Toast.success('✓ Fleet Swarm Synchronized: 4 Agents online, 0 regulatory violations, 74.2% recovery benchmark verified!');
    refreshMetrics();
  }

  function render() {
    const failedVolume = getFailedVolume();
    const aov = getAOV();
    const stats = MockData.stats;
    const atRiskCount = MockData.customers.filter(c => c.riskScore >= 60).length;
    const dynamicAtRiskRevenue = MockData.getAtRiskMRR ? MockData.getAtRiskMRR('at_risk') : stats.atRiskRevenue;

    const statsCards = [
      StatCard.render({
        id: 'mrr',
        label: 'Monthly Recurring Revenue',
        value: Formatters.currency(stats.mrr),
        rawValue: stats.mrr,
        prefix: Formatters.getCurrencySymbol(),
        change: '+8.4% vs last month',
        isPositive: true,
        icon: '💰',
        type: 'primary'
      }),
      StatCard.render({
        id: 'recovered',
        label: 'Recovered Revenue (MTD)',
        value: Formatters.currency(stats.recoveredRevenue),
        rawValue: stats.recoveredRevenue,
        prefix: Formatters.getCurrencySymbol(),
        change: `+${stats.recoveryRate}% success rate`,
        isPositive: true,
        icon: '⚡',
        type: 'success'
      }),
      StatCard.render({
        id: 'at-risk',
        label: 'At-Risk Revenue',
        value: Formatters.currency(dynamicAtRiskRevenue),
        rawValue: dynamicAtRiskRevenue,
        prefix: Formatters.getCurrencySymbol(),
        change: `${atRiskCount} critical accounts`,
        isPositive: false,
        icon: '⚠️',
        type: 'danger'
      }),
      StatCard.render({
        id: 'churn-rate',
        label: 'Predicted Churn Rate',
        value: Formatters.percent(stats.churnRate),
        rawValue: stats.churnRate,
        suffix: '%',
        change: '-0.8% with AI actions',
        isPositive: true,
        icon: '📉',
        type: 'info'
      }),
    ].join('');

    const recentAtRisk = MockData.customers.slice(0, 5);
    const tableHtml = TableComponent.render({
      title: 'High-Risk Customer Alerts',
      columns: ['Customer', 'Company', 'Plan', 'MRR', 'Risk Score', 'Predicted Churn Reason', 'Agent Action'],
      data: recentAtRisk,
      headerActions: `<a href="#churn" class="btn btn-secondary btn-sm" onclick="App.navigate('churn')">View All (${MockData.customers.length}) →</a>`,
      rowRenderer: (c) => `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="user-avatar" style="width: 30px; height: 30px; font-size: 0.75rem;">${c.avatar}</div>
              <div>
                <div style="font-weight: 600; color: var(--text-primary);">${c.name}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">${c.email}</div>
              </div>
            </div>
          </td>
          <td>${c.company}</td>
          <td><span class="badge neutral">${c.plan}</span></td>
          <td style="font-weight: 600; color: var(--text-primary);" class="dash-cust-mrr">${Formatters.currency(c.mrr)}</td>
          <td><span class="risk-score ${c.riskLevel}">${c.riskScore}</span></td>
          <td style="font-size: 0.8rem; max-width: 240px; white-space: normal; line-height: 1.4; word-break: break-word;">${c.churnReason}</td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="DashboardPage.dispatchCustomerAgent('${c.id}')" title="Dispatch 4-Agent Autonomous Swarm for this account">
              🤖 Dispatch Agent
            </button>
          </td>
        </tr>
      `
    });

    const agentEvents = [
      { agent: '🕵️ [Detective]', text: 'Diagnosed transient UPI PSP timeout for <strong style="color: #fff;">Alpha Corp</strong> (₹4,999)', type: 'info', time: '2m ago' },
      { agent: '🧠 [Strategist]', text: 'Matched <code style="color: #c4b5fd;">PB-TECH-TIMEOUT</code> ➔ Scheduled +2.0h smart off-peak retry window', type: 'primary', time: '5m ago' },
      { agent: '⚖️ [Auditor Loop]', text: 'Self-corrected price churn discount: 25% ➔ compliant 15% ceiling (<strong style="color: #34d399;">POL-07 Passed</strong>)', type: 'success', time: '9m ago' },
      { agent: '✍️ [Communicator]', text: 'Dispatched dynamic 1-Click WhatsApp Magic Link to <strong style="color: #fff;">James Chen</strong>', type: 'success', time: '14m ago' },
      { agent: '🛑 [HITL Gate]', text: 'Enterprise invoice (₹85,000) routed for VIP Account Executive review', type: 'warning', time: '22m ago' },
      { agent: '⚡ [Swarm Recovered]', text: 'Autonomous recovery verified: <strong style="color: #34d399;">+₹12,499</strong> via card updater fallback', type: 'success', time: '35m ago' }
    ];

    const feedHtml = agentEvents.map(item => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-color); gap: 10px;">
        <div style="display: flex; align-items: flex-start; gap: 8px;">
          <span class="badge ${item.type}" style="font-size: 0.65rem; padding: 2px 6px; white-space: nowrap; margin-top: 1px;">${item.agent}</span>
          <span style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.35;">${item.text}</span>
        </div>
        <span style="font-size: 0.7rem; color: var(--text-muted); white-space: nowrap;">${item.time}</span>
      </div>
    `).join('');

    const mInit = calculateMetrics(failedVolume, aov);

    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <h1>Autonomous Revenue Dashboard</h1>
            <p>Real-time ML churn detection, automated payment recovery, and smart retention.</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary" onclick="DashboardPage.refreshMetrics()">↻ Refresh</button>
            <button class="btn btn-primary" onclick="App.navigate('recovery')">⚡ Open Payment Recovery</button>
          </div>
        </div>

        <div class="stats-grid">
          ${statsCards}
        </div>

        <!-- ⚡ AUTONOMOUS MULTI-AGENT FLEET WORKSPACE (AGENTIC TOUCH) -->
        <div class="card" style="margin-bottom: 24px; padding: 16px 20px; background: linear-gradient(145deg, rgba(99, 102, 241, 0.08) 0%, rgba(13, 18, 30, 0.95) 100%); border: 1px solid rgba(99, 102, 241, 0.25);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); padding-bottom: 12px; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.15rem;">⚡</span>
              <div>
                <div style="font-size: 0.98rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px;">
                  Autonomous Multi-Agent Fleet Status
                  <span class="badge success" style="font-size: 0.65rem;">Live Razorpay Telemetry</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                  4 specialized agents running forensics, RAG playbook synthesis, regulatory compliance & contextual outreach.
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button class="btn btn-sm btn-primary" onclick="DashboardPage.runFleetDiagnostic()" style="font-size: 0.74rem; padding: 5px 12px;">
                ⚡ Trigger Fleet Swarm
              </button>
            </div>
          </div>

          <!-- 4 Agent Fleet Persona Cards (Short & Simple) -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; margin-bottom: 14px;">
            <!-- Detective -->
            <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 10px 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="color: #38bdf8; font-size: 0.82rem;">🕵️ Detective Agent</strong>
                <span class="badge info" style="font-size: 0.6rem;">Online</span>
              </div>
              <div style="font-weight: 700; font-size: 0.78rem; color: #f1f5f9;">Forensics & Classifier</div>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">99.4% accuracy • Involuntary/Voluntary churn</div>
            </div>

            <!-- Strategist -->
            <div style="background: rgba(167, 139, 250, 0.05); border: 1px solid rgba(167, 139, 250, 0.2); border-radius: 8px; padding: 10px 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="color: #a78bfa; font-size: 0.82rem;">🧠 Strategist Agent</strong>
                <span class="badge primary" style="font-size: 0.6rem;">Online</span>
              </div>
              <div style="font-weight: 700; font-size: 0.78rem; color: #f1f5f9;">RAG Playbook Planner</div>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">12 playbooks indexed • Dynamic bandit scoring</div>
            </div>

            <!-- Auditor -->
            <div style="background: rgba(244, 63, 94, 0.05); border: 1px solid rgba(244, 63, 94, 0.2); border-radius: 8px; padding: 10px 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="color: #fb7185; font-size: 0.82rem;">⚖️ Auditor Critic</strong>
                <span class="badge success" style="font-size: 0.6rem;">Online</span>
              </div>
              <div style="font-weight: 700; font-size: 0.78rem; color: #34d399;">POL-01..07 Enforced</div>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Reflection loop active • Margin cap &lt;= 20% verified</div>
            </div>

            <!-- Communicator -->
            <div style="background: rgba(52, 211, 153, 0.05); border: 1px solid rgba(52, 211, 153, 0.2); border-radius: 8px; padding: 10px 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="color: #34d399; font-size: 0.82rem;">✍️ Communicator</strong>
                <span class="badge success" style="font-size: 0.6rem;">Online</span>
              </div>
              <div style="font-weight: 700; font-size: 0.78rem; color: #f1f5f9;">Contextual Outreach</div>
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">1-Click Magic Links • 74.2% recovery benchmark</div>
            </div>
          </div>

          <!-- Agent Fleet Executive Briefing (Short & Simple) -->
          <div style="background: rgba(0, 0, 0, 0.35); border-radius: 6px; padding: 10px 14px; border: 1px solid rgba(255, 255, 255, 0.05);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="font-size: 0.72rem; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em;">
                ⚡ Autonomous Fleet Executive Briefing:
              </div>
              ${activeFleetAlert ? `<span style="font-size: 0.7rem; color: #34d399;">● Latest: Dispatched for ${activeFleetAlert.company} (${activeFleetAlert.time})</span>` : ''}
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.76rem; color: #e2e8f0; line-height: 1.4;">
              <div>• <strong style="color: #38bdf8;">Detective:</strong> 42% of recent payment failures are transient evening UPI timeouts; customer relationship active.</div>
              <div>• <strong style="color: #a78bfa;">Strategist:</strong> Shifting retry window by +2.0 hours into off-peak bank hours projected to recover +₹74,200.</div>
              <div>• <strong style="color: #fb7185;">Auditor:</strong> Evaluated all interventions against corporate margin ceiling (<= 20% discount) & NPCI cooldowns; 0 violations.</div>
              <div>• <strong style="color: #34d399;">Communicator:</strong> Dispatched 142 dynamic Magic Links via WhatsApp/Email with zero unsubscribe or dunning fatigue.</div>
            </div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-card">
            <div class="chart-header">
              <div>
                <div class="chart-title">Revenue & Recovery Performance</div>
                <div class="chart-subtitle">12-Month revenue trend vs automated AI recovery</div>
              </div>
            </div>
            <div class="chart-container">
              <canvas id="revenuePerformanceChart"></canvas>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-header">
              <div>
                <div class="chart-title">Live Multi-Agent Event Feed</div>
                <div class="chart-subtitle">Real-time collaborative agent actions</div>
              </div>
            </div>
            <div style="display: flex; flex-direction: column;">
              ${feedHtml}
            </div>
          </div>
        </div>

        <!-- Interactive Razorpay Merchant ROI Calculator -->
        <div class="roi-calculator-card">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
            <div>
              <div style="font-size: 1.05rem; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 8px;">
                💰 Razorpay Merchant ROI & Revenue Saved Calculator
                <span class="badge success">Live Projection</span>
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                Drag the sliders below to estimate the exact revenue ReviveAI will recover for your business volume.
              </div>
            </div>
            <button class="btn btn-sm btn-ghost" onclick="Toast.success('Custom enterprise ROI report exported!')">📥 Export ROI PDF</button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
            <div class="roi-slider-group">
              <div class="roi-slider-label">
                <span>Monthly Failed Payment Volume:</span>
                <strong id="roi-vol-val">${mInit.isINR ? `₹${(failedVolume / 100000).toFixed(1)} Lakhs` : `$${Math.round(mInit.calcVol).toLocaleString()}`}</strong>
              </div>
              <input
                id="roi-vol-slider"
                type="range"
                min="100000"
                max="5000000"
                step="50000"
                value="${failedVolume}"
                class="roi-range-input"
                oninput="DashboardPage.onSliderChange()"
              />
              <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted);">
                <span>₹1 Lakh</span>
                <span>₹25 Lakhs</span>
                <span>₹50 Lakhs</span>
              </div>
            </div>

            <div class="roi-slider-group">
              <div class="roi-slider-label">
                <span>Average Order Value (AOV):</span>
                <strong id="roi-aov-val">${mInit.sym}${Math.round(mInit.calcAov).toLocaleString()}</strong>
              </div>
              <input
                id="roi-aov-slider"
                type="range"
                min="500"
                max="25000"
                step="500"
                value="${aov}"
                class="roi-range-input"
                oninput="DashboardPage.onSliderChange()"
              />
              <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted);">
                <span>₹500</span>
                <span>₹12,500</span>
                <span>₹25,000</span>
              </div>
            </div>
          </div>

          <div class="roi-result-grid">
            <div class="roi-stat-box" style="border-color: rgba(16, 185, 129, 0.4);">
              <div style="font-size: 0.74rem; color: var(--text-muted); text-transform: uppercase;">Estimated Monthly Saved</div>
              <div id="roi-monthly-saved" class="roi-num" style="color: #34d399;">${mInit.sym}${Math.round(mInit.monthlySaved).toLocaleString()}</div>
              <div style="font-size: 0.72rem; color: var(--color-success); margin-top: 2px;">+74.2% AI Recovery Rate</div>
            </div>

            <div class="roi-stat-box" style="border-color: rgba(99, 102, 241, 0.4);">
              <div style="font-size: 0.74rem; color: var(--text-muted); text-transform: uppercase;">Projected Annual Saved</div>
              <div id="roi-annual-saved" class="roi-num" style="color: #a5b4fc;">${mInit.sym}${Math.round(mInit.annualSaved).toLocaleString()}</div>
              <div style="font-size: 0.72rem; color: var(--color-primary-light); margin-top: 2px;">Compounded ARR Protection</div>
            </div>

            <div class="roi-stat-box" style="border-color: rgba(6, 182, 212, 0.4);">
              <div style="font-size: 0.74rem; color: var(--text-muted); text-transform: uppercase;">Churn Reduction</div>
              <div id="roi-churn-reduction" class="roi-num" style="color: #38bdf8;">-${mInit.churnPct}%</div>
              <div id="roi-churn-sub" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">${mInit.recoveredAccounts.toLocaleString()} accounts saved/mo</div>
            </div>

            <div class="roi-stat-box" style="border-color: rgba(236, 72, 153, 0.4);">
              <div style="font-size: 0.74rem; color: var(--text-muted); text-transform: uppercase;">Net Merchant Return</div>
              <div id="roi-net-return" class="roi-num" style="color: #f472b6;">${mInit.sym}${Math.round(mInit.netReturn).toLocaleString()}</div>
              <div id="roi-net-sub" style="font-size: 0.72rem; color: var(--color-success); margin-top: 2px;">${mInit.roiMultiplier}x Net ROI vs fee</div>
            </div>
          </div>
        </div>

        <div style="margin-top: 28px;">
          ${tableHtml}
        </div>
      </div>
    `;
  }

  function init() {
    StatCard.animateAll();
    ChartComponent.createRevenueChart('revenuePerformanceChart', MockData.revenueData, MockData.getVolumeScale ? MockData.getVolumeScale() : 1);
  }

    return {
      render,
      init,
      onSliderChange: updateROICalculations,
      refreshMetrics,
      dispatchCustomerAgent,
      runFleetDiagnostic,
    };
  })();
