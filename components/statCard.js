/* ============================================
   ReviveAI — StatCard Component
   ============================================ */

const StatCard = (() => {
  function render({ id, label, value, rawValue, prefix = '', suffix = '', change, isPositive = true, icon = '📊', type = 'primary' }) {
    const changeClass = isPositive ? 'positive' : 'negative';
    const changeArrow = isPositive ? '↑' : '↓';
    const valId = `stat-val-${id || Math.random().toString(36).substring(2, 8)}`;
    const effectivePrefix = (prefix === '$' || prefix === '₹') ? Formatters.getCurrencySymbol() : prefix;

    return `
      <div class="stat-card ${type}" data-val-id="${valId}" data-target="${rawValue !== undefined ? rawValue : ''}" data-prefix="${effectivePrefix}" data-suffix="${suffix}" data-is-currency="${prefix === '$' || prefix === '₹'}">
        <div class="stat-header">
          <span class="stat-label">${label}</span>
          <div class="stat-icon">${icon}</div>
        </div>
        <div class="stat-value" id="${valId}">${value}</div>
        ${change ? `<div class="stat-change ${changeClass}"><span>${changeArrow}</span> ${change}</div>` : ''}
      </div>
    `;
  }

  function animateAll() {
    if (typeof Animations === 'undefined' || !Animations.countUp) return;
    document.querySelectorAll('.stat-card[data-target]').forEach(card => {
      const targetStr = card.getAttribute('data-target');
      if (!targetStr) return;
      let target = parseFloat(targetStr);
      if (isNaN(target)) return;
      const valId = card.getAttribute('data-val-id');
      const el = document.getElementById(valId);
      if (el) {
        const isCurrency = card.getAttribute('data-is-currency') === 'true';
        const prefix = isCurrency ? Formatters.getCurrencySymbol() : (card.getAttribute('data-prefix') || '');
        const suffix = card.getAttribute('data-suffix') || '';
        
        if (isCurrency) {
          target = Formatters.toCurrent(target);
        }
        Animations.countUp(el, target, 1200, prefix, suffix);
      }
    });
  }

  return { render, animateAll };
})();
