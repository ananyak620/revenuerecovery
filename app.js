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

  function render() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    const pageModule = pages[currentPage] || DashboardPage;

    appEl.innerHTML = `
      ${Sidebar.render(currentPage)}
      <main class="main-content">
        ${pageModule.render()}
      </main>
    `;

    // Attach navigation clicks
    Sidebar.attachEvents((page) => navigate(page));

    // Initialize page scripts/charts
    if (pageModule.init) {
      setTimeout(() => pageModule.init(), 50);
    }
  }

  return { init, navigate, render };
})();

// Boot app on DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
