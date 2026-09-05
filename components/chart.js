/* ============================================
   ReviveAI — Chart Component
   Wrapper around Chart.js with custom dark theme
   ============================================ */

const ChartComponent = (() => {
  const instances = {};

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 12 },
          boxWidth: 12,
          padding: 16
        }
      },
      tooltip: {
        backgroundColor: 'rgba(12, 12, 29, 0.95)',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: 'Space Grotesk', size: 13, weight: 600 },
        bodyFont: { family: 'Inter', size: 12 }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }
      }
    }
  };

  function createRevenueChart(canvasId, data, initialScale) {
    if (typeof Chart === 'undefined') return null;
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    if (instances[canvasId]) instances[canvasId].destroy();

    const rate = typeof Formatters !== 'undefined' ? Formatters.getRate() : 1;
    const currentScale = initialScale !== undefined ? initialScale : (typeof MockData !== 'undefined' && MockData.getVolumeScale ? MockData.getVolumeScale() : 1);
    const sym = typeof Formatters !== 'undefined' ? Formatters.getCurrencySymbol() : '₹';
    const isINR = typeof Formatters !== 'undefined' && Formatters.getCurrency() === 'INR';

    const labels = data.map(d => d.month);
    const revenue = data.map(d => Math.round(d.revenue * rate * currentScale));
    const recovered = data.map(d => Math.round(d.recovered * rate * currentScale));

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Revenue',
            data: revenue,
            backgroundColor: 'rgba(14, 165, 233, 0.7)',
            hoverBackgroundColor: 'rgba(14, 165, 233, 0.95)',
            borderColor: '#0ea5e9',
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'Recovered Revenue',
            data: recovered,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            hoverBackgroundColor: 'rgba(16, 185, 129, 1)',
            borderColor: '#10b981',
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        ...commonOptions,
        plugins: {
          ...commonOptions.plugins,
          tooltip: {
            ...commonOptions.plugins.tooltip,
            callbacks: {
              label: (item) => `${item.dataset.label}: ${sym}${item.parsed.y.toLocaleString(isINR ? 'en-IN' : 'en-US')}`
            }
          }
        },
        scales: {
          ...commonOptions.scales,
          y: {
            ...commonOptions.scales.y,
            ticks: {
              ...commonOptions.scales.y.ticks,
              callback: (v) => {
                if (isINR) {
                  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
                  if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`;
                  return `₹${(v / 1000).toFixed(0)}k`;
                }
                return `$${(v / 1000).toFixed(0)}k`;
              }
            }
          }
        }
      }
    });

    return instances[canvasId];
  }

  function updateRevenueChart(canvasId, scale = 1) {
    const chart = instances[canvasId];
    if (!chart || typeof MockData === 'undefined') return;

    const rate = typeof Formatters !== 'undefined' ? Formatters.getRate() : 1;
    const data = MockData.revenueData;

    chart.data.datasets[0].data = data.map(d => Math.round(d.revenue * rate * scale));
    chart.data.datasets[1].data = data.map(d => Math.round(d.recovered * rate * scale));
    chart.update('none'); // Update immediately without animation stutter
  }

  function createDoughnutChart(canvasId, labels, data, colors) {
    if (typeof Chart === 'undefined') return null;
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    if (instances[canvasId]) instances[canvasId].destroy();

    instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors || ['#ef4444', '#f59e0b', '#0ea5e9', '#10b981'],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 11 },
              padding: 12,
              boxWidth: 10
            }
          },
          tooltip: commonOptions.plugins.tooltip
        }
      }
    });

    return instances[canvasId];
  }

  function createBarChart(canvasId, labels, data, label = 'Metric', color = '#6366f1') {
    if (typeof Chart === 'undefined') return null;
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    if (instances[canvasId]) instances[canvasId].destroy();

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label,
          data,
          backgroundColor: color,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        ...commonOptions,
        plugins: {
          ...commonOptions.plugins,
          legend: { display: false }
        }
      }
    });

    return instances[canvasId];
  }

  return {
    createRevenueChart,
    updateRevenueChart,
    createDoughnutChart,
    createBarChart
  };
})();
