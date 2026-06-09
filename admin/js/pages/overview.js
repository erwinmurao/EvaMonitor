/* Production Overview Page */
import { api } from '../api.js';
import { formatNumber, formatDuration, formatPercent } from '../utils/format.js';

let hourlyChart = null;
let breakdownChart = null;
let qualityChart = null;

export function render() {
  return `
    <div class="page-header">
      <div>
        <h1>Production Overview</h1>
        <p>Real-time production metrics and performance analytics</p>
      </div>
    </div>

    <div class="grid grid-4" id="kpi-row"></div>

    <div class="chart-grid">
      <div class="card chart-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Hourly Output</h3>
            <p class="card-subtitle">Production cycles per hour</p>
          </div>
        </div>
        <div class="chart-wrapper">
          <canvas id="chart-hourly"></canvas>
        </div>
      </div>

      <div class="card chart-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Time Breakdown</h3>
            <p class="card-subtitle">Shift time allocation</p>
          </div>
        </div>
        <div class="chart-wrapper">
          <canvas id="chart-breakdown"></canvas>
        </div>
      </div>
    </div>

    <div class="chart-grid">
      <div class="card chart-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Quality Distribution</h3>
            <p class="card-subtitle">Good vs defective pairs</p>
          </div>
        </div>
        <div class="chart-wrapper chart-wrapper-sm">
          <canvas id="chart-quality"></canvas>
        </div>
      </div>

      <div class="card chart-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Line Performance Comparison</h3>
            <p class="card-subtitle">Current shift statistics by production line</p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table" id="line-table">
            <thead>
              <tr>
                <th style="text-align:center">Line</th>
                <th style="text-align:center">Cycles</th>
                <th style="text-align:center">Good Pairs</th>
                <th style="text-align:center">Bad Pairs</th>
                <th style="text-align:center">Quality Rate</th>
                <th style="text-align:center">Downtime</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export async function init() {
  try {
    // Fetch all data in parallel
    const [overview, lines, cycles] = await Promise.all([
      api.get('/reports/overview'),
      api.get('/lines'),
      api.get('/cycles?limit=500').catch(() => [])
    ]);

    renderKPIs(overview);
    renderHourlyChart(cycles);
    renderBreakdownChart(overview);
    renderQualityChart(overview);
    renderLineTable(lines);
  } catch (err) {
    document.getElementById('kpi-row').innerHTML = `<div class="alert alert-danger">Failed to load data: ${err.message}</div>`;
  }
}

function renderKPIs(data) {
  const totalPairs = (data.total_good_pairs || 0) + (data.total_bad_pairs || 0);
  const kpiRow = document.getElementById('kpi-row');
  kpiRow.innerHTML = `
    <div class="kpi-card info">
      <div class="kpi-icon">🔄</div>
      <div class="kpi-label">Total Cycles</div>
      <div class="kpi-value">${formatNumber(data.total_cycles)}</div>
    </div>
    <div class="kpi-card success">
      <div class="kpi-icon">✅</div>
      <div class="kpi-label">Good Pairs</div>
      <div class="kpi-value">${formatNumber(data.total_good_pairs)}</div>
    </div>
    <div class="kpi-card danger">
      <div class="kpi-icon">❌</div>
      <div class="kpi-label">Bad Pairs</div>
      <div class="kpi-value">${formatNumber(data.total_bad_pairs)}</div>
    </div>
    <div class="kpi-card ${data.quality_rate >= 95 ? 'success' : data.quality_rate >= 85 ? 'warning' : 'danger'}">
      <div class="kpi-icon">📊</div>
      <div class="kpi-label">Quality Rate</div>
      <div class="kpi-value">${formatPercent(data.quality_rate)}</div>
    </div>
  `;
}

function renderHourlyChart(cycles) {
  if (hourlyChart) { hourlyChart.destroy(); hourlyChart = null; }
  const canvas = document.getElementById('chart-hourly');
  if (!canvas) return;

  // Group cycles by hour
  const hourMap = {};
  const goodMap = {};
  for (const c of cycles) {
    if (!c.cycle_done_at) continue;
    const d = new Date(c.cycle_done_at);
    const hourKey = `${d.getHours().toString().padStart(2, '0')}:00`;
    hourMap[hourKey] = (hourMap[hourKey] || 0) + 1;
    const goodPairs = (c.outputs || []).reduce((sum, o) => sum + (o.good_pairs || 0), 0);
    goodMap[hourKey] = (goodMap[hourKey] || 0) + goodPairs;
  }

  const hours = Object.keys(hourMap).sort();
  const cycleCounts = hours.map(h => hourMap[h]);
  const pairCounts = hours.map(h => goodMap[h] || 0);

  if (hours.length === 0) {
    hours.push('No data');
    cycleCounts.push(0);
    pairCounts.push(0);
  }

  const ctx = canvas.getContext('2d');
  hourlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hours,
      datasets: [
        {
          label: 'Cycles',
          data: cycleCounts,
          backgroundColor: 'rgba(102, 126, 234, 0.7)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.6
        },
        {
          label: 'Good Pairs',
          data: pairCounts,
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'center',
          labels: { padding: 16, usePointStyle: true, pointStyle: 'rectRounded', font: { size: 12, weight: '600' } }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { font: { size: 11 }, precision: 0 }
        }
      }
    }
  });
}

function renderBreakdownChart(overview) {
  if (breakdownChart) { breakdownChart.destroy(); breakdownChart = null; }
  const canvas = document.getElementById('chart-breakdown');
  if (!canvas) return;

  const mealSeconds = overview.meal_break_seconds || 0;
  const indSeconds = overview.individual_break_seconds || 0;
  const downSeconds = overview.total_downtime_seconds || 0;
  const totalShiftSeconds = 8 * 3600; // assume 8hr shift
  const productiveSeconds = Math.max(0, totalShiftSeconds - mealSeconds - indSeconds - downSeconds);

  const ctx = canvas.getContext('2d');
  breakdownChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Productive Time', 'Meal Break', 'Individual Breaks', 'Downtime'],
      datasets: [{
        data: [productiveSeconds, mealSeconds, indSeconds, downSeconds],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: '#fff',
        borderWidth: 3,
        hoverBorderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          align: 'center',
          labels: {
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 12, weight: '600' }
          }
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const seconds = ctx.parsed;
              return `${ctx.label}: ${formatDuration(seconds)}`;
            }
          }
        }
      }
    }
  });
}

function renderQualityChart(overview) {
  if (qualityChart) { qualityChart.destroy(); qualityChart = null; }
  const canvas = document.getElementById('chart-quality');
  if (!canvas) return;

  const good = overview.total_good_pairs || 0;
  const bad = overview.total_bad_pairs || 0;

  const ctx = canvas.getContext('2d');
  qualityChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Good Pairs', 'Bad Pairs'],
      datasets: [{
        data: [good, bad],
        backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)'],
        borderColor: '#fff',
        borderWidth: 3,
        hoverBorderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          align: 'center',
          labels: {
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 12, weight: '600' }
          }
        }
      }
    }
  });
}

async function renderLineTable(lines) {
  const tbody = document.querySelector('#line-table tbody');
  tbody.innerHTML = '';

  for (const line of lines) {
    const lineData = await api.get(`/reports/overview?line_id=${line.id}`).catch(() => ({}));
    const qualityRate = lineData.quality_rate || 0;
    const qualityBadge = qualityRate >= 95 ? 'success' : qualityRate >= 85 ? 'warning' : 'danger';

    tbody.innerHTML += `
      <tr>
        <td style="text-align:center"><strong>${line.name}</strong></td>
        <td style="text-align:center">${formatNumber(lineData.total_cycles || 0)}</td>
        <td style="text-align:center"><span class="badge badge-success">${formatNumber(lineData.total_good_pairs || 0)}</span></td>
        <td style="text-align:center"><span class="badge badge-danger">${formatNumber(lineData.total_bad_pairs || 0)}</span></td>
        <td style="text-align:center"><span class="badge badge-${qualityBadge}">${formatPercent(qualityRate)}</span></td>
        <td style="text-align:center">${formatDuration(lineData.total_downtime_seconds || 0)}</td>
      </tr>
    `;
  }
}
