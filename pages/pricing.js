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
                <span style="font-family: 'Space Grotesk', sans-serif; font-size: 1.6rem; font-weight: 700; color: var(--color-primary-light);">$${simulatedPrice}/mo</span>
              </div>
              <input type="range" min="49" max="149" value="${simulatedPrice}" style="width: 100%; accent-color: var(--color-primary); cursor: pointer;" oninput="PricingPage.updatePrice(this.value)">
              <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
                <span>$49 (Floor)</span>
                <span>$79 (Current)</span>
                <span>$89 (AI Optimal)</span>
                <span>$149 (Ceiling)</span>
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
            <h3 style="font-size: 1rem; margin-bottom: 16px;">Competitor Pricing Matrix</h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${data.competitors.map(c => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                  <div>
                    <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary);">${c.name}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${c.features} tier package</div>
                  </div>
                  <div style="font-family: 'Space Grotesk'; font-weight: 700; font-size: 1.1rem; color: var(--text-secondary);">$${c.price}/mo</div>
                </div>
              `).join('')}
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: var(--radius-md);">
                <div>
                  <div style="font-weight: 600; font-size: 0.85rem; color: var(--color-primary-light);">ReviveAI (Current)</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">Full AI Suite</div>
                </div>
                <div style="font-family: 'Space Grotesk'; font-weight: 700; font-size: 1.1rem; color: var(--color-primary-light);">$79/mo</div>
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
