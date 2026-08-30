/* ============================================
   ReviveAI — Churn Prediction Page
   ============================================ */

const ChurnPage = (() => {
  let activeFilter = 'all';

  function render() {
    const customers = MockData.customers;
    const critical = customers.filter(c => c.riskLevel === 'critical');
    const high = customers.filter(c => c.riskLevel === 'high');
    const medium = customers.filter(c => c.riskLevel === 'medium');
    const low = customers.filter(c => c.riskLevel === 'low');

    const filtered = activeFilter === 'all'
      ? customers
      : customers.filter(c => c.riskLevel === activeFilter);

    const tableHtml = TableComponent.render({
      title: `Predicted Churn Customers (${filtered.length})`,
      columns: ['Customer', 'Company', 'MRR', 'Risk Score', 'Engagement', 'Churn Indicator', 'Retention Recommendation', 'Action'],
      headerActions: `
        <div style="display: flex; gap: 8px;">
          <select class="select" onchange="ChurnPage.setFilter(this.value)">
            <option value="all" ${activeFilter === 'all' ? 'selected' : ''}>All Risk Levels (${customers.length})</option>
            <option value="critical" ${activeFilter === 'critical' ? 'selected' : ''}>Critical (${critical.length})</option>
            <option value="high" ${activeFilter === 'high' ? 'selected' : ''}>High (${high.length})</option>
            <option value="medium" ${activeFilter === 'medium' ? 'selected' : ''}>Medium (${medium.length})</option>
            <option value="low" ${activeFilter === 'low' ? 'selected' : ''}>Low (${low.length})</option>
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
          <td style="font-weight: 600; color: var(--text-primary);">${Formatters.currency(c.mrr)}</td>
          <td><span class="risk-score ${c.riskLevel}">${c.riskScore}</span></td>
          <td>
            <div style="width: 90px;">
              <div class="progress-bar">
                <div class="progress-fill ${c.riskScore > 60 ? 'danger' : 'success'}" style="width: ${c.featureAdoption}%;"></div>
              </div>
              <span style="font-size: 0.7rem; color: var(--text-muted);">${c.featureAdoption}% adoption</span>
            </div>
          </td>
          <td style="font-size: 0.8rem; max-width: 180px;">${c.churnReason}</td>
          <td style="font-size: 0.8rem; color: var(--color-primary-light);">${c.retentionAction}</td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="Toast.success('Auto-outreach initiated for ${c.name}')">Retain</button>
          </td>
        </tr>
      `
    });

    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <h1>ML Churn Prediction & Retention</h1>
            <p>Predictive risk scoring using multi-signal customer behavior telemetry.</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="Toast.success('Batch retention playbooks triggered for 12 accounts')">⚡ Trigger Auto-Retention</button>
          </div>
        </div>

        <div class="charts-grid-equal">
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

        <div style="margin-top: 28px;">
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

  return { render, init, setFilter };
})();
