/* ============================================
   ReviveAI — Dashboard Page
   With Interactive Merchant ROI Calculator
   ============================================ */

const DashboardPage = (() => {
  let failedVolume = 1000000;
  let aov = 2500;

  function updateROICalculations() {
    const volInput = document.getElementById('roi-vol-slider');
    const aovInput = document.getElementById('roi-aov-slider');

    if (volInput) failedVolume = parseFloat(volInput.value);
    if (aovInput) aov = parseFloat(aovInput.value);

    const isINR = Formatters.getCurrency() === 'INR';
    const sym = Formatters.getCurrencySymbol();
    const rate = isINR ? 1 : (1 / 83.5);

    const calcVol = failedVolume * rate;
    const calcAov = aov * rate;
    const monthlySaved = calcVol * 0.742;
    const annualSaved = monthlySaved * 12;
    const estimatedExtra = calcVol * (0.742 - 0.28);
    const estimatedCost = Math.max(isINR ? 5000 : 60, calcVol * 0.03);
    const roiMultiplier = Math.max(8.5, (estimatedExtra / estimatedCost)).toFixed(1);

    const volLabel = document.getElementById('roi-vol-val');
    const aovLabel = document.getElementById('roi-aov-val');
    const monthlySavedEl = document.getElementById('roi-monthly-saved');
    const annualSavedEl = document.getElementById('roi-annual-saved');
    const roiMultEl = document.getElementById('roi-multiplier');

    if (volLabel) {
      volLabel.innerText = isINR 
        ? `₹${(failedVolume / 100000).toFixed(1)} Lakhs` 
        : `$${Math.round(calcVol).toLocaleString()}`;
    }
    if (aovLabel) aovLabel.innerText = `${sym}${Math.round(calcAov).toLocaleString()}`;
    if (monthlySavedEl) monthlySavedEl.innerText = `${sym}${Math.round(monthlySaved).toLocaleString()}`;
    if (annualSavedEl) annualSavedEl.innerText = `${sym}${Math.round(annualSaved).toLocaleString()}`;
    if (roiMultEl) roiMultEl.innerText = `${roiMultiplier}x ROI`;
  }

  function render() {
    const stats = MockData.stats;
    const atRiskCount = MockData.customers.filter(c => c.riskScore >= 60).length;

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
        value: Formatters.currency(stats.atRiskRevenue),
        rawValue: stats.atRiskRevenue,
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
          <td style="font-weight: 600; color: var(--text-primary);">${Formatters.currency(c.mrr)}</td>
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

    const monthlySavedInit = failedVolume * 0.742;
    const annualSavedInit = monthlySavedInit * 12;

    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <h1>Autonomous Revenue Dashboard</h1>
            <p>Real-time ML churn detection, automated payment recovery, and smart retention.</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary" onclick="Toast.info('Refreshing real-time metrics...')">↻ Refresh</button>
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
                <strong id="roi-vol-val">₹10.0 Lakhs</strong>
              </div>
              <input
                id="roi-vol-slider"
                type="range"
                min="100000"
                max="5000000"
                step="50000"
                value="1000000"
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
                <strong id="roi-aov-val">₹2,500</strong>
              </div>
              <input
                id="roi-aov-slider"
                type="range"
                min="500"
                max="25000"
                step="500"
                value="2500"
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
              <div id="roi-monthly-saved" class="roi-num" style="color: #34d399;">₹${Math.round(monthlySavedInit).toLocaleString()}</div>
              <div style="font-size: 0.72rem; color: var(--color-success); margin-top: 2px;">+74.2% AI Recovery Rate</div>
            </div>

            <div class="roi-stat-box" style="border-color: rgba(99, 102, 241, 0.4);">
              <div style="font-size: 0.74rem; color: var(--text-muted); text-transform: uppercase;">Projected Annual Saved</div>
              <div id="roi-annual-saved" class="roi-num" style="color: #a5b4fc;">₹${Math.round(annualSavedInit).toLocaleString()}</div>
              <div style="font-size: 0.72rem; color: var(--color-primary-light); margin-top: 2px;">Compounded ARR Protection</div>
            </div>

            <div class="roi-stat-box" style="border-color: rgba(6, 182, 212, 0.4);">
              <div style="font-size: 0.74rem; color: var(--text-muted); text-transform: uppercase;">Churn Reduction</div>
              <div class="roi-num" style="color: #38bdf8;">-18.4%</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Involuntary Churn Prevented</div>
            </div>

            <div class="roi-stat-box" style="border-color: rgba(236, 72, 153, 0.4);">
              <div style="font-size: 0.74rem; color: var(--text-muted); text-transform: uppercase;">Net Merchant Return</div>
              <div id="roi-multiplier" class="roi-num" style="color: #f472b6;">14.8x ROI</div>
              <div style="font-size: 0.72rem; color: var(--color-success); margin-top: 2px;">vs ReviveAI Platform Fee</div>
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
  };
})();
