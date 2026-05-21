/* Production Overview Page */
import { api } from '../api.js';
import { formatNumber, formatDuration, formatPercent } from '../utils/format.js';

export function render() {
  return `
    <div class="page-header">
      <div>
        <h1>Production Overview</h1>
        <p>Real-time production metrics and performance analytics</p>
      </div>
    </div>

    <div class="grid grid-4" id="kpi-row"></div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Hourly Output</h3>
          </div>
        </div>
        <div class="chart-container"><canvas id="chart-hourly"></canvas></div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Time Breakdown</h3>
          </div>
        </div>
        <div class="chart-container"><canvas id="chart-breakdown"></canvas></div>
      </div>
    </div>

    <div class="card">
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
              <th>Line</th>
              <th>Cycles</th>
              <th>Good Pairs</th>
              <th>Bad Pairs</th>
              <th>Quality Rate</th>
              <th>Downtime</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;
}

export async function init() {
  try {
    const data = await api.get('/reports/overview');
    const kpiRow = document.getElementById('kpi-row');
    kpiRow.innerHTML = `
      <div class="kpi-card info">
        <div class="kpi-label">Total Cycles</div>
        <div class="kpi-value">${formatNumber(data.total_cycles)}</div>
        <div class="kpi-change positive">↑ ${formatPercent(0.12)} from yesterday</div>
      </div>
      <div class="kpi-card success">
        <div class="kpi-label">Good Pairs</div>
        <div class="kpi-value">${formatNumber(data.total_good_pairs)}</div>
        <div class="kpi-change positive">↑ ${formatPercent(0.08)} from yesterday</div>
      </div>
      <div class="kpi-card danger">
        <div class="kpi-label">Bad Pairs</div>
        <div class="kpi-value">${formatNumber(data.total_bad_pairs)}</div>
        <div class="kpi-change negative">↑ ${formatPercent(0.15)} from yesterday</div>
      </div>
      <div class="kpi-card success">
        <div class="kpi-label">Quality Rate</div>
        <div class="kpi-value">${formatPercent(data.quality_rate)}</div>
        <div class="kpi-change positive">↑ ${formatPercent(0.03)} from yesterday</div>
      </div>
    `;

    // Line table
    const lines = await api.get('/lines');
    const tbody = document.querySelector('#line-table tbody');
    tbody.innerHTML = '';
    for (const line of lines) {
      const lineData = await api.get(`/reports/overview?line_id=${line.id}`).catch(() => ({}));
      const qualityRate = lineData.quality_rate || 0;
      const qualityBadge = qualityRate >= 0.95 ? 'success' : qualityRate >= 0.90 ? 'warning' : 'danger';
      
      tbody.innerHTML += `
        <tr>
          <td><strong>${line.name}</strong></td>
          <td>${formatNumber(lineData.total_cycles || 0)}</td>
          <td><span class="badge badge-success">${formatNumber(lineData.total_good_pairs || 0)}</span></td>
          <td><span class="badge badge-danger">${formatNumber(lineData.total_bad_pairs || 0)}</span></td>
          <td><span class="badge badge-${qualityBadge}">${formatPercent(qualityRate)}</span></td>
          <td>${formatDuration(lineData.total_downtime_seconds || 0)}</td>
        </tr>
      `;
    }
  } catch (err) {
    document.getElementById('kpi-row').innerHTML = `<div class="alert alert-danger">Failed to load data: ${err.message}</div>`;
  }
}
