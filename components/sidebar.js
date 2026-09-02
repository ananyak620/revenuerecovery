/* ============================================
   ReviveAI — Sidebar Component
   ============================================ */

const Sidebar = (() => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', section: 'Overview' },
    { id: 'churn', label: 'Churn Prediction', icon: '🔮', badge: '5 High Risk', badgeType: 'danger', section: 'AI Analytics' },
    { id: 'recovery', label: 'Payment Recovery', icon: '💳', badge: 'Razorpay Agent', badgeType: 'success', section: 'AI Analytics' },
    { id: 'dunning', label: 'Smart Dunning', icon: '✉️', section: 'Automation' },
    { id: 'pricing', label: 'Pricing Optimizer', icon: '💰', section: 'Automation' },
    { id: 'chat', label: 'AI Copilot', icon: '⚡', badge: 'MCP Ready', badgeType: 'info', section: 'Assistant' },
  ];

  function render(activePage = 'dashboard') {
    let currentSection = '';
    let navHtml = '';

    navItems.forEach(item => {
      if (item.section && item.section !== currentSection) {
        currentSection = item.section;
        navHtml += `<div class="nav-section-label">${currentSection}</div>`;
      }

      const isActive = item.id === activePage ? 'active' : '';
      const badgeHtml = item.badge ? `<span class="nav-badge ${item.badgeType || ''}">${item.badge}</span>` : '';

      navHtml += `
        <a href="#${item.id}" class="nav-item ${isActive}" data-page="${item.id}">
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-label">${item.label}</span>
          ${badgeHtml}
        </a>
      `;
    });

    const isLive = AIService ? AIService.isConnected() : false;
    const llmInfo = AIService ? AIService.getLLMInfo() : { active_provider: 'heuristic' };
    const curr = Formatters.getCurrency();

    return `
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="logo-icon">⚡</div>
          <div>
            <h1>ReviveAI</h1>
            <span>Autonomous Recovery</span>
          </div>
        </div>

        <!-- Currency Selector Widget -->
        <div class="sidebar-currency-card">
          <div class="currency-header">
            <span>Display Currency</span>
            <span class="currency-rate-badge">${curr === 'INR' ? '1$ = ₹83.5' : 'Global USD'}</span>
          </div>
          <div class="currency-switch-group">
            <button class="currency-btn ${curr === 'INR' ? 'active' : ''}" onclick="App.toggleCurrency('INR')">
              <span>🇮🇳</span> <strong>₹ INR</strong>
            </button>
            <button class="currency-btn ${curr === 'USD' ? 'active' : ''}" onclick="App.toggleCurrency('USD')">
              <span>🇺🇸</span> <strong>$ USD</strong>
            </button>
          </div>
        </div>

        <nav class="sidebar-nav">
          ${navHtml}
        </nav>

        <div class="sidebar-footer">
          <div class="user-card" style="flex-direction: column; align-items: flex-start; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="status-pulse-dot ${isLive ? 'online' : 'standalone'}"></span>
                <span style="font-size: 0.72rem; font-weight: 600; color: ${isLive ? '#34d399' : '#38bdf8'};">
                  ${isLive ? 'FastAPI Connected' : 'Standalone Mode'}
                </span>
              </div>
              <span style="font-size: 0.65rem; color: var(--text-muted); font-family: monospace;">:8000</span>
            </div>
            <div style="font-size: 0.68rem; color: var(--text-secondary); width: 100%; display: flex; justify-content: space-between;">
              <span>LLM Engine:</span>
              <span style="color: var(--color-primary-light); font-weight: 600; font-family: monospace;">${llmInfo.active_provider.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </aside>
    `;
  }

  function attachEvents(onNavigate) {
    document.querySelectorAll('.sidebar .nav-item').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        if (onNavigate) onNavigate(page);
      });
    });
  }

  return { render, attachEvents };
})();
