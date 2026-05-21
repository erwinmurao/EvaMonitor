/* Cycle Efficiency Page */
import { api } from '../api.js';
import { formatPercent, formatNumber } from '../utils/format.js';

export function render() {
  return `
    <div class="page-header"><h1>Cycle Efficiency</h1></div>
    <div class="kpi-row" id="eff-kpis"></div>
    <div class="card"><h3>Temperature Analysis</h3><table class="data-table" id="temp-table">
      <thead><tr><th>Metric</th><th>Gun 1</th><th>Gun 2</th><th>Gun 3</th><th>Gun 4</th><th>Mold</th></tr></thead><tbody></tbody></table></div>
  `;
}

export async function init() {
  try {
    const data = await api.get('/reports/cycle-efficiency');
    document.getElementById('eff-kpis').innerHTML = `
      <div class="kpi-card"><div class="kpi-value">${formatNumber(data.total_cycles)}</div><div class="kpi-label">Total Cycles</div></div>
      <div class="kpi-card"><div class="kpi-value">${formatPercent(data.recipe_compliance_pct)}</div><div class="kpi-label">Recipe Compliance</div></div>
    `;

    // Temperature table
    const ta = data.temperature_analysis || {};
    const tbody = document.querySelector('#temp-table tbody');
    tbody.innerHTML = `
      <tr><td>Average (°C)</td><td>${ta.avg_gun1?.toFixed(1) || '-'}</td><td>${ta.avg_gun2?.toFixed(1) || '-'}</td><td>${ta.avg_gun3?.toFixed(1) || '-'}</td><td>${ta.avg_gun4?.toFixed(1) || '-'}</td><td>${ta.avg_mold_temp?.toFixed(1) || '-'}</td></tr>
      <tr><td>Min (°C)</td><td>${ta.min_gun1?.toFixed(1) || '-'}</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
      <tr><td>Max (°C)</td><td>${ta.max_gun1?.toFixed(1) || '-'}</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
    `;
  } catch (err) {
    document.getElementById('eff-kpis').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}
