/* ============================================
   ReviveAI — Smart Dunning Page
   ============================================ */

const DunningPage = (() => {
  let activeTone = 'Friendly';
  let activeStep = 0;
  let selectedCustomer = null;

  function render() {
    if (!selectedCustomer) {
      selectedCustomer = MockData.customers[0];
    }

    const email = AIService.generateDunningEmail(selectedCustomer, activeTone, activeStep);
    const tones = ['Friendly', 'Helpful', 'Concerned', 'Urgent'];

    const tonesButtons = tones.map(t => `
      <button class="btn ${activeTone === t ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="DunningPage.setTone('${t}')">
        ${t}
      </button>
    `).join('');

    const customerOptions = MockData.customers.slice(0, 10).map(c => `
      <option value="${c.id}" ${selectedCustomer.id === c.id ? 'selected' : ''}>
        ${c.name} (${c.company}) — ${Formatters.currency(c.mrr)}
      </option>
    `).join('');

    return `
      <div class="page-container">
        <div class="page-header">
          <div>
            <h1>Smart Dunning & Email Generator</h1>
            <p>AI-crafted recovery communications tailored by customer tone, value, and lifecycle state.</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="Toast.success('Dunning campaign dispatched!')">✉️ Send Dunning Email</button>
          </div>
        </div>

        <div class="charts-grid-equal" style="grid-template-columns: 1.2fr 0.8fr;">
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h3 style="font-size: 1rem;">Email Generator</h3>
              <div style="display: flex; gap: 8px;">${tonesButtons}</div>
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px;">Target Customer:</label>
              <select class="select" style="width: 100%;" onchange="DunningPage.selectCustomer(this.value)">
                ${customerOptions}
              </select>
            </div>

            <div class="email-preview">
              <div class="email-preview-header">
                <div class="email-field">
                  <span class="email-field-label">To:</span>
                  <span style="color: var(--text-primary); font-weight: 500;">${selectedCustomer.name} &lt;${selectedCustomer.email}&gt;</span>
                </div>
                <div class="email-field">
                  <span class="email-field-label">Subject:</span>
                  <span style="color: var(--text-accent); font-weight: 600;">${email.subject}</span>
                </div>
              </div>
              <div style="padding: 24px; font-size: 0.88rem; line-height: 1.7; color: var(--text-secondary); white-space: pre-line; background: rgba(0, 0, 0, 0.2);">
                ${email.body}
              </div>
            </div>
          </div>

          <div class="card">
            <h3 style="font-size: 1rem; margin-bottom: 16px;">Autonomous Dunning Sequence</h3>
            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${MockData.dunningSequence.map((seq, idx) => `
                <div style="display: flex; gap: 14px; padding: 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                  <div style="width: 36px; height: 36px; border-radius: var(--radius-md); background: rgba(99, 102, 241, 0.15); color: var(--color-primary-light); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; flex-shrink: 0;">
                    ${idx + 1}
                  </div>
                  <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                      <span style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary);">${seq.day} — ${seq.type}</span>
                      <span class="badge info">${seq.tone}</span>
                    </div>
                    <p style="font-size: 0.76rem; color: var(--text-muted);">${seq.subject}</p>
                  </div>
                </div>
              `).join('')}
            </div>

            <div style="margin-top: 24px; padding: 16px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: var(--radius-md);">
              <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.85rem; color: var(--color-success); margin-bottom: 4px;">
                <span>⚡</span> AI Performance Insight
              </div>
              <p style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.5;">
                Personalized AI dunning messages increase email open rates by <strong>34%</strong> and recover <strong>2.8x more revenue</strong> compared to generic reminders.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function init() {}

  function setTone(tone) {
    activeTone = tone;
    App.render();
  }

  function selectCustomer(id) {
    selectedCustomer = MockData.customers.find(c => c.id === id) || MockData.customers[0];
    App.render();
  }

  return { render, init, setTone, selectCustomer };
})();
