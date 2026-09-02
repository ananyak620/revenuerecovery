/* ============================================
   ReviveAI — Formatters
   Multi-Currency (INR ₹ & USD $) & Formatting
   ============================================ */

const Formatters = (() => {
  // Default to INR (₹) for Razorpay & Indian Merchant ecosystem
  let currentCurrency = localStorage.getItem('revive_currency') || 'INR';
  const USD_TO_INR_RATE = 83.5;

  function getCurrency() {
    return currentCurrency;
  }

  function setCurrency(curr) {
    if (curr === 'INR' || curr === 'USD') {
      currentCurrency = curr;
      localStorage.setItem('revive_currency', curr);
      window.dispatchEvent(new CustomEvent('currencyChange', { detail: curr }));
    }
  }

  function getCurrencySymbol() {
    return currentCurrency === 'INR' ? '₹' : '$';
  }

  function getRate() {
    return currentCurrency === 'INR' ? USD_TO_INR_RATE : 1.0;
  }

  function toCurrent(valueInUSD) {
    return Math.round(Number(valueInUSD) * getRate());
  }

  function currency(value, compact = false, isAlreadyInCurrent = false) {
    const numericVal = Number(value) || 0;
    const amount = isAlreadyInCurrent ? numericVal : numericVal * getRate();

    if (currentCurrency === 'INR') {
      if (compact) {
        const absVal = Math.abs(amount);
        if (absVal >= 10000000) {
          return `₹${(amount / 10000000).toFixed(2)} Cr`;
        }
        if (absVal >= 100000) {
          return `₹${(amount / 100000).toFixed(2)} L`;
        }
        if (absVal >= 1000) {
          return `₹${(amount / 1000).toFixed(1)} K`;
        }
      }
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    } else {
      // USD formatting
      if (compact && Math.abs(amount) >= 1000) {
        const suffixes = ['', 'K', 'M', 'B'];
        const tier = Math.floor(Math.log10(Math.abs(amount)) / 3);
        const suffix = suffixes[tier] || '';
        const scaled = amount / Math.pow(10, tier * 3);
        return `$${scaled.toFixed(1)}${suffix}`;
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    }
  }

  function number(value) {
    const locale = currentCurrency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale).format(value);
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
    return date.toLocaleDateString(currentCurrency === 'INR' ? 'en-IN' : 'en-US', { month: 'short', day: 'numeric' });
  }

  function shortDate(dateStr) {
    return new Date(dateStr).toLocaleDateString(currentCurrency === 'INR' ? 'en-IN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
    getCurrency,
    setCurrency,
    getCurrencySymbol,
    getRate,
    toCurrent,
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
