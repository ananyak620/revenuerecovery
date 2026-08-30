/* ============================================
   ReviveAI — Dashboard Page
   ============================================ */

const DashboardPage = (() => {
  function render() {
    const stats = MockData.stats;
    const atRiskCount = MockData.customers.filter(c => c.riskScore >= 60).length;

    const statsCards = [
      StatCard.render({
        id: 'mrr',
        label: 'Monthly Recurring Revenue',
        value: Formatters.currency(stats.mrr),
        rawValue: stats.mrr,
        prefix: '$',
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
        prefix: '$',
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
        prefix: '$',
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
          ${item.amount ? `<span style="font-weight: 600; font-size: 0.82rem; color: ${item.amountType === 'positive' ? 'var(--color-success)' : 'var(--color-danger)'};">${item.amount}</span>` : ''}
          <span style="font-size: 0.72rem; color: var(--text-muted);">${item.time}</span>
        </div>
      </div>
    `).join('');

    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <h1>Autonomous Revenue Dashboard</h1>
            <p>Real-time ML churn detection, automated payment recovery, and smart retention.</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary" onclick="Toast.info('Refreshing real-time metrics...')">↻ Refresh</button>
            <button class="btn btn-primary" onclick="App.navigate('chat')">⚡ Open AI Copilot</button>
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

  return { render, init };
})();
