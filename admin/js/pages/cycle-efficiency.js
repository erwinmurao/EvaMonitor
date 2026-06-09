/* Cycle Efficiency Page */
import { api } from '../api.js';
import { formatPercent, formatNumber } from '../utils/format.js';

export function render() {
  return `
    <div class="page-header">
      <div>
        <h1>Cycle Efficiency</h1>
        <p>Monitor cooking cycle performance and temperature analysis</p>
      </div>
    </div>

    <div class="grid grid-3 mb-xl" id="eff-kpis"></div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Temperature Analysis</h3>
          <p class="card-subtitle">Average, min, and max temperatures across all guns and mold</p>
        </div>
      </div>
      <div class="table-responsive">
        <table class="data-table" id="temp-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Gun 1</th>
              <th>Gun 2</th>
              <th>Gun 3</th>
              <th>Gun 4</th>
              <th>Mold</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;
}

function fmt(val) {
  return val != null ? val.toFixed(1) : '-';
}

export async function init() {
  try {
    const data = await api.get('/reports/cycle-efficiency');

    // KPIs
    document.getElementById('eff-kpis').innerHTML = `
      <div class="kpi-card success">
        <div class="kpi-label">Total Cycles</div>
        <div class="kpi-value">${formatNumber(data.total_cycles)}</div>
        <div class="kpi-change neutral">completed</div>
      </div>
      <div class="kpi-card info">
        <div class="kpi-label">Recipe Compliance</div>
        <div class="kpi-value">${data.recipe_compliance_pct != null ? formatPercent(data.recipe_compliance_pct) : 'N/A'}</div>
        <div class="kpi-change neutral">cook time within tolerance</div>
      </div>
    `;

    // Temperature table
    const ta = data.temperature_analysis || {};
    const tbody = document.querySelector('#temp-table tbody');
    tbody.innerHTML = `
      <tr>
        <td><strong>Average (°C)</strong></td>
        <td>${fmt(ta.avg_gun1)}</td>
        <td>${fmt(ta.avg_gun2)}</td>
        <td>${fmt(ta.avg_gun3)}</td>
        <td>${fmt(ta.avg_gun4)}</td>
        <td>${fmt(ta.avg_mold_temp)}</td>
      </tr>
      <tr>
        <td><strong>Min (°C)</strong></td>
        <td>${fmt(ta.min_gun1)}</td>
        <td>${fmt(ta.min_gun2)}</td>
        <td>${fmt(ta.min_gun3)}</td>
        <td>${fmt(ta.min_gun4)}</td>
        <td>${fmt(ta.min_mold_temp)}</td>
      </tr>
      <tr>
        <td><strong>Max (°C)</strong></td>
        <td>${fmt(ta.max_gun1)}</td>
        <td>${fmt(ta.max_gun2)}</td>
        <td>${fmt(ta.max_gun3)}</td>
        <td>${fmt(ta.max_gun4)}</td>
        <td>${fmt(ta.max_mold_temp)}</td>
      </tr>
    `;
  } catch (err) {
    document.getElementById('eff-kpis').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}
