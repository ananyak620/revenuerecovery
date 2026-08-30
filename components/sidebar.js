/* ============================================
   ReviveAI — Sidebar Component
   ============================================ */

const Sidebar = (() => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', section: 'Overview' },
    { id: 'churn', label: 'Churn Prediction', icon: '🔮', badge: '12', badgeType: 'danger', section: 'AI Analytics' },
    { id: 'recovery', label: 'Payment Recovery', icon: '💳', badge: 'Live', badgeType: 'success', section: 'AI Analytics' },
    { id: 'dunning', label: 'Smart Dunning', icon: '✉️', section: 'Automation' },
    { id: 'pricing', label: 'Pricing Optimizer', icon: '💰', section: 'Automation' },
    { id: 'chat', label: 'AI Copilot', icon: '⚡', section: 'Assistant' },
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

    return `
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="logo-icon">⚡</div>
          <div>
            <h1>ReviveAI</h1>
            <span>Revenue Recovery</span>
          </div>
        </div>
        <nav class="sidebar-nav">
          ${navHtml}
        </nav>
        <div class="sidebar-footer">
          <div class="user-card">
            <div class="user-avatar">RA</div>
            <div class="user-info">
              <div class="name">Enterprise Admin</div>
              <div class="plan">● System Active</div>
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
