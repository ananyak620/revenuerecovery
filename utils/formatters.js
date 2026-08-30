/* ============================================
   ReviveAI — Formatters
   Currency, date, and number formatting utils
   ============================================ */

const Formatters = (() => {
  function currency(value, compact = false) {
    if (compact && Math.abs(value) >= 1000) {
      const suffixes = ['', 'K', 'M', 'B'];
      const tier = Math.floor(Math.log10(Math.abs(value)) / 3);
      const suffix = suffixes[tier] || '';
      const scaled = value / Math.pow(10, tier * 3);
      return `$${scaled.toFixed(1)}${suffix}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  function number(value) {
    return new Intl.NumberFormat('en-US').format(value);
  }

  function percent(value, decimals = 1) {
    return `${Number(value).toFixed(decimals)}%`;
  }

  function relativeTime(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function shortDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function truncate(str, len = 30) {
    return str.length > len ? str.substring(0, len) + '...' : str;
  }

  function riskLabel(score) {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 35) return 'Medium';
    return 'Low';
  }

  function statusLabel(status) {
    const labels = {
      'pending_retry': 'Pending Retry',
      'retrying': 'Retrying',
      'recovered': 'Recovered',
      'failed': 'Failed',
      'scheduled': 'Scheduled'
    };
    return labels[status] || status;
  }

  function statusBadgeClass(status) {
    const map = {
      'pending_retry': 'warning',
      'retrying': 'info',
      'recovered': 'success',
      'failed': 'danger',
      'scheduled': 'neutral'
    };
    return map[status] || 'neutral';
  }

  return {
    currency,
    number,
    percent,
    relativeTime,
    shortDate,
    truncate,
    riskLabel,
    statusLabel,
    statusBadgeClass
  };
})();
