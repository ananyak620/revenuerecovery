/* ============================================
   ReviveAI — StatCard Component
   ============================================ */

const StatCard = (() => {
  function render({ id, label, value, rawValue, prefix = '', suffix = '', change, isPositive = true, icon = '📊', type = 'primary' }) {
    const changeClass = isPositive ? 'positive' : 'negative';
    const changeArrow = isPositive ? '↑' : '↓';
    const valId = `stat-val-${id || Math.random().toString(36).substring(2, 8)}`;

    return `
      <div class="stat-card ${type}" data-val-id="${valId}" data-target="${rawValue !== undefined ? rawValue : ''}" data-prefix="${prefix}" data-suffix="${suffix}">
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
      const target = parseFloat(targetStr);
      if (isNaN(target)) return;
      const valId = card.getAttribute('data-val-id');
      const el = document.getElementById(valId);
      if (el) {
        const prefix = card.getAttribute('data-prefix') || '';
        const suffix = card.getAttribute('data-suffix') || '';
        Animations.countUp(el, target, 1200, prefix, suffix);
      }
    });
  }

  return { render, animateAll };
})();
