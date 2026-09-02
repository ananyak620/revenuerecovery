/* ============================================
   ReviveAI — Pricing Optimizer Page
   ============================================ */

const PricingPage = (() => {
  let simulatedPrice = 89;

  function render() {
    const data = MockData.pricingData;
    const projection = data.revenueProjections(simulatedPrice);

    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <h1>AI Pricing & Elasticity Optimizer</h1>
            <p>Simulate price elasticity, analyze competitor benchmarks, and optimize revenue per user.</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="Toast.success('Pricing recommendations saved to strategy backlog')">💾 Save Strategy</button>
          </div>
        </div>

        <div class="charts-grid-equal" style="margin-bottom: 28px;">
          <div class="card">
            <h3 style="font-size: 1rem; margin-bottom: 8px;">Interactive Price Elasticity Simulator</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 24px;">Adjust price to see projected impact on MRR and customer volume</p>

            <div style="margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 0.85rem; color: var(--text-secondary);">Simulated Price:</span>
                <span style="font-family: 'Space Grotesk', sans-serif; font-size: 1.6rem; font-weight: 700; color: var(--color-primary-light);">${Formatters.currency(simulatedPrice)}/mo</span>
              </div>
              <input type="range" min="49" max="149" value="${simulatedPrice}" style="width: 100%; accent-color: var(--color-primary); cursor: pointer;" oninput="PricingPage.updatePrice(this.value)">
              <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
                <span>${Formatters.currency(49)} (Floor)</span>
                <span>${Formatters.currency(79)} (Current)</span>
                <span>${Formatters.currency(89)} (AI Optimal)</span>
                <span>${Formatters.currency(149)} (Ceiling)</span>
              </div>
            </div>

            <div class="stats-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 0;">
              <div style="padding: 16px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">Projected MRR</div>
                <div style="font-family: 'Space Grotesk'; font-size: 1.3rem; font-weight: 700; color: var(--text-primary);">${Formatters.currency(projection.projected)}</div>
                <div style="font-size: 0.72rem; color: ${parseFloat(projection.change) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 500;">
                  ${parseFloat(projection.change) >= 0 ? '↑' : '↓'} ${projection.change}% net impact
                </div>
              </div>

              <div style="padding: 16px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">Projected Customers</div>
                <div style="font-family: 'Space Grotesk'; font-size: 1.3rem; font-weight: 700; color: var(--text-primary);">${projection.customers.toLocaleString()}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Elasticity coeff: ${data.elasticity}</div>
              </div>
            </div>
          </div>

          <div class="card">
            <div style="margin-bottom: 16px;">
              <h3 style="font-size: 1rem; color: var(--text-primary); margin-bottom: 4px;">Industry Recovery Benchmark Matrix</h3>
              <p style="font-size: 0.76rem; color: var(--text-muted);">Compare ReviveAI recovery performance & ROI against traditional payment recovery methods</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${data.competitors.map(c => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); gap: 12px;">
                  <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary);">${c.name}</span>
                      <span class="badge neutral" style="font-size: 0.65rem;">${c.recoveryRate} Recovery</span>
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">${c.features}</div>
                  </div>
                  <div style="font-family: 'Space Grotesk', monospace; font-weight: 700; font-size: 1rem; color: var(--text-secondary); white-space: nowrap;">
                    ${c.price === 0 ? '<span style="color: var(--text-muted); font-size: 0.85rem;">Free (Built-in)</span>' : `${Formatters.currency(c.price)}/mo`}
                  </div>
                </div>
              `).join('')}

              <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: rgba(14, 165, 233, 0.08); border: 1px solid rgba(14, 165, 233, 0.35); border-radius: var(--radius-md); box-shadow: 0 4px 16px rgba(14, 165, 233, 0.12); gap: 12px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; font-size: 0.88rem; color: #38bdf8;">ReviveAI Autonomous Agent</span>
                    <span class="badge success" style="font-size: 0.65rem;">74.2% AI Recovery</span>
                  </div>
                  <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 2px;">Calibrated XGBoost + LLM + Policy Engine + 1-Click WhatsApp Links</div>
                </div>
                <div style="font-family: 'Space Grotesk', monospace; font-weight: 700; font-size: 1.15rem; color: #38bdf8; white-space: nowrap;">
                  ${Formatters.currency(79)}/mo
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size: 1rem; margin-bottom: 16px;">Discount Campaign Revenue Impact</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            ${data.discountAnalysis.map(d => `
              <div style="padding: 18px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                <div style="font-family: 'Space Grotesk'; font-size: 1.4rem; font-weight: 700; color: var(--text-accent); margin-bottom: 8px;">${d.discount} Discount</div>
                <div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 4px;">Conversions: <strong style="color: var(--color-success);">${d.conversions}</strong></div>
                <div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 4px;">Revenue Impact: <strong style="color: ${d.revenue.startsWith('+') ? 'var(--color-success)' : 'var(--color-danger)'};">${d.revenue}</strong></div>
                <div style="font-size: 0.78rem; color: var(--text-secondary);">Retention Gain: <strong style="color: var(--color-info);">${d.retention}</strong></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function init() {}

  function updatePrice(val) {
    simulatedPrice = parseInt(val);
    App.render();
  }

  return { render, init, updatePrice };
})();
