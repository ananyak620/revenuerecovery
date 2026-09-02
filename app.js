/* ============================================
   ReviveAI — Main App Controller & Router
   ============================================ */

const App = (() => {
  let currentPage = 'dashboard';

  const pages = {
    dashboard: DashboardPage,
    churn: ChurnPage,
    recovery: RecoveryPage,
    dunning: DunningPage,
    pricing: PricingPage,
    chat: ChatPage,
  };

  function init() {
    // Handle URL hash routing
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('currencyChange', () => {
      render();
    });
    handleHash();
  }

  function handleHash() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigate(hash, false);
  }

  function navigate(pageId, updateHash = true) {
    if (!pages[pageId]) pageId = 'dashboard';
    currentPage = pageId;

    if (updateHash) {
      window.location.hash = pageId;
    }

    render();
  }

  function toggleCurrency(curr) {
    Formatters.setCurrency(curr);
    render();
    if (typeof Toast !== 'undefined') {
      Toast.info(`Display Currency switched to ${curr === 'INR' ? 'Indian Rupees (₹)' : 'US Dollars ($)'}`);
    }
  }

  function render() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    const pageModule = pages[currentPage] || DashboardPage;
    const curr = Formatters.getCurrency();

    const topHeaderHtml = `
      <header class="top-header-bar">
        <div class="header-left">
          <div class="breadcrumb">
            <span class="brand-crumb">ReviveAI</span>
            <span class="crumb-separator">/</span>
            <span class="active-crumb">${currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}</span>
          </div>
        </div>

        <div class="header-right">
          <!-- Currency Switcher Pill -->
          <div class="header-currency-toggle" title="Switch between Indian Rupee (₹) and US Dollar ($)">
            <button class="curr-pill-btn ${curr === 'INR' ? 'active' : ''}" onclick="App.toggleCurrency('INR')">
              🇮🇳 ₹ INR
            </button>
            <button class="curr-pill-btn ${curr === 'USD' ? 'active' : ''}" onclick="App.toggleCurrency('USD')">
              🇺🇸 $ USD
            </button>
          </div>

          <div class="header-live-badge">
            <span class="pulse-ring"></span>
            <span class="badge-text">AI Agent <strong>Online</strong></span>
          </div>
        </div>
      </header>
    `;

    appEl.innerHTML = `
      ${Sidebar.render(currentPage)}
      <main class="main-content">
        ${topHeaderHtml}
        <div class="page-content-wrapper">
          ${pageModule.render()}
        </div>
      </main>
    `;

    // Attach navigation clicks
    Sidebar.attachEvents((page) => navigate(page));

    // Initialize page scripts/charts
    if (pageModule.init) {
      setTimeout(() => pageModule.init(), 50);
    }
  }

  return { init, navigate, render, toggleCurrency };
})();

// Boot app on DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
