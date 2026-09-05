/* ============================================
   ReviveAI — Churn Prediction & Retention Page
   With Live Reactive MRR-at-Risk Telemetry
   ============================================ */

const ChurnPage = (() => {
  let activeFilter = 'all';

  function getVolume() {
    return MockData.getVolume ? MockData.getVolume() : 1000000;
  }

  function setPortfolioVolume(vol) {
    if (MockData.setVolume) {
      MockData.setVolume(vol, MockData.getAOV ? MockData.getAOV() : 2500);
    }
    updateLiveMetrics();
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
            <span>↑</span> 74.2% AI recovery benchmark
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

    const tableHtml = TableComponent.render({
      title: `Predicted Churn Customers (${filtered.length}) — Cohort MRR: ${Formatters.currency(activeCohortMRR)}`,
      columns: ['Customer', 'Company', 'MRR', 'Risk Score', 'Engagement', 'Churn Indicator', 'Retention Recommendation', 'Action'],
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
            <button class="btn btn-primary btn-sm" onclick="Toast.success('Auto-outreach initiated for ${c.name}')">Retain</button>
          </td>
        </tr>
      `
    });

    return `
      <div class="page-container">
        <div class="page-header" style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div>
            <h1>ML Churn Prediction & Retention</h1>
            <p>Predictive risk scoring & dynamic MRR-at-risk modeling across customer portfolios.</p>
          </div>
          <div class="header-actions" style="margin-top: 0;">
            <button class="btn btn-primary" onclick="Toast.success('Batch retention playbooks triggered for at-risk accounts!')">⚡ Trigger Auto-Retention</button>
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

            <div style="display: flex; align-items: center; gap: 12px; min-width: 260px; flex: 1; max-width: 420px;">
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
    setVolumePreset
  };
})();
