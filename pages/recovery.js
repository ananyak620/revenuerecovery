/* ============================================
   ReviveAI — Payment Recovery Page
   ============================================ */

const RecoveryPage = (() => {
  function render() {
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
        prefix: '$',
        icon: '💳',
        type: 'danger'
      }),
      StatCard.render({
        id: 'recovered-vol',
        label: 'Autonomous Recoveries',
        value: Formatters.currency(recoveredAmt),
        rawValue: recoveredAmt,
        prefix: '$',
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
              ? `<button class="btn btn-primary btn-sm" onclick="Toast.success('Immediate Smart Retry dispatched for ${p.id}')">Retry Now</button>`
              : p.status === 'recovered'
                ? `<span style="color: var(--color-success); font-size: 0.8rem;">✓ Resolved</span>`
                : `<button class="btn btn-secondary btn-sm" onclick="Toast.info('Escalated to customer success team')">Escalate</button>`
            }
          </td>
        </tr>
      `
    });

    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <h1>Autonomous Payment Recovery</h1>
            <p>Smart retries, card account updater integration, and AI failure diagnostics.</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="Toast.success('Batch AI retry scheduled across 8 pending payments')">⚡ Run Smart Retry Batch</button>
          </div>
        </div>

        <div class="stats-grid">
          ${statsCards}
        </div>

        <div class="charts-grid-equal">
          <div class="chart-card">
            <div class="chart-header">
              <div class="chart-title">Payment Failure Breakdown</div>
              <div class="chart-subtitle">Root causes of failed transactions</div>
            </div>
            <div class="chart-container">
              <canvas id="failureReasonsDonut"></canvas>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-header">
              <div class="chart-title">Recovery Success by Retry Attempt</div>
              <div class="chart-subtitle">Smart retry effectiveness by sequence position</div>
            </div>
            <div class="chart-container">
              <canvas id="retrySuccessBar"></canvas>
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

    ChartComponent.createDoughnutChart(
      'failureReasonsDonut',
      ['Card Expired', 'Insufficient Funds', 'Bank Declined', 'Network Error', 'Other'],
      [35, 28, 18, 12, 7],
      ['#ef4444', '#f59e0b', '#8b5cf6', '#0ea5e9', '#64748b']
    );

    ChartComponent.createBarChart(
      'retrySuccessBar',
      ['Attempt 1 (0h)', 'Attempt 2 (24h)', 'Attempt 3 (72h)', 'Attempt 4 (7d)'],
      [48, 28, 15, 9],
      'Recovery %',
      '#10b981'
    );
  }

  return { render, init };
})();
