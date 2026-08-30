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

  function createRevenueChart(canvasId, data) {
    if (typeof Chart === 'undefined') return null;
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    if (instances[canvasId]) instances[canvasId].destroy();

    const labels = data.map(d => d.month);
    const revenue = data.map(d => d.revenue);
    const recovered = data.map(d => d.recovered);

    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Revenue',
            data: revenue,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointBackgroundColor: '#6366f1',
            pointRadius: 3,
            pointHoverRadius: 6
          },
          {
            label: 'Recovered Revenue',
            data: recovered,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointBackgroundColor: '#10b981',
            pointRadius: 3,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        ...commonOptions,
        scales: {
          ...commonOptions.scales,
          y: {
            ...commonOptions.scales.y,
            ticks: {
              ...commonOptions.scales.y.ticks,
              callback: (v) => `$${(v / 1000).toFixed(0)}k`
            }
          }
        }
      }
    });

    return instances[canvasId];
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

  return { createRevenueChart, createDoughnutChart, createBarChart };
})();
