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
  }

  function refreshMetrics() {
    updateROICalculations();
    StatCard.animateAll();
    if (typeof Toast !== 'undefined') {
      Toast.success('✓ Real-time revenue metrics refreshed & synchronized!');
    }
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
      columns: ['Customer', 'Company', 'Plan', 'MRR', 'Risk Score', 'Predicted Churn Reason', 'Action'],
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
          <td style="font-size: 0.8rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${c.churnReason}</td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="Toast.success('AI Retention playbook triggered for ${c.name}')">Save</button>
          </td>
        </tr>
      `
    });

    const feedHtml = MockData.feedItems.slice(0, 6).map(item => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="badge ${item.type}" style="width: 8px; height: 8px; padding: 0; border-radius: 50%;"></span>
          <span style="font-size: 0.82rem; color: var(--text-secondary);">${item.html}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          ${item.rawAmount ? `<span style="font-weight: 600; font-size: 0.82rem; font-family: 'Space Grotesk', monospace; color: ${item.amountType === 'positive' ? 'var(--color-success)' : 'var(--color-danger)'};">${item.amountType === 'positive' ? '+' : '-'}${Formatters.currency(item.rawAmount)}</span>` : ''}
          <span style="font-size: 0.72rem; color: var(--text-muted);">${item.time}</span>
        </div>
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
                <div class="chart-title">Live Recovery Feed</div>
                <div class="chart-subtitle">Real-time autonomous system events</div>
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
    ChartComponent.createRevenueChart('revenuePerformanceChart', MockData.revenueData);
  }

  return {
    render,
    init,
    onSliderChange: updateROICalculations,
    refreshMetrics,
  };
})();
