/* EVA Consumption Page */
import { api } from '../api.js';
import { formatKg, formatNumber, formatCurrency } from '../utils/format.js';

export function render() {
  return `
    <div class="page-header">
      <div>
        <h1>EVA Consumption</h1>
        <p>Track EVA material usage across all production batches</p>
      </div>
    </div>

    <div class="grid grid-3 mb-xl" id="eva-kpis"></div>

    <div class="card mb-xl">
      <div class="card-header">
        <div>
          <h3 class="card-title">Consumption by Material Code</h3>
          <p class="card-subtitle">EVA usage breakdown by material and color</p>
        </div>
      </div>
      <div class="table-responsive">
        <table class="data-table" id="material-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Color</th>
              <th>Batches</th>
              <th>Small (kg)</th>
              <th>Big (kg)</th>
              <th>Total (kg)</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title\">Cost Analysis by Material</h3>
          <p class="card-subtitle">Material cost per kilogram</p>
        </div>
      </div>
      <div class="table-responsive">
        <table class="data-table" id="cost-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Color</th>
              <th>Total Used</th>
              <th>Small ($/kg)</th>
              <th>Big ($/kg)</th>
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
    const data = await api.get('/reports/eva-consumption');
    // KPIs
    const totalKg = data.by_material.reduce((s, m) => s + (m.total_kg || 0), 0);
    const totalBatches = data.by_material.reduce((s, m) => s + (m.batch_count || 0), 0);
    const totalCost = data.cost_by_material.reduce((s, m) => s + ((m.total_kg || 0) * ((m.small_cost_per_kg + m.big_cost_per_kg) / 2)), 0);
    
    document.getElementById('eva-kpis').innerHTML = `
      <div class="kpi-card success">
        <div class="kpi-label">Total Batches</div>
        <div class="kpi-value">${totalBatches}</div>
        <div class="kpi-change neutral\">in current shift</div>
      </div>
      <div class="kpi-card info">
        <div class="kpi-label">Total EVA Used</div>
        <div class="kpi-value" style="font-size: 28px;">${formatKg(totalKg)}</div>
        <div class="kpi-change neutral\">kilograms</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-label">Material Cost</div>
        <div class="kpi-value" style="font-size: 24px;">${formatCurrency(totalCost)}</div>
        <div class="kpi-change neutral\">total spent</div>
      </div>
    `;

    // Material table
    const tbody = document.querySelector('#material-table tbody');
    tbody.innerHTML = data.by_material.length > 0 ? data.by_material.map(m => `
      <tr>
        <td><strong>${m.material_code}</strong></td>
        <td>${m.material_color}</td>
        <td>${m.batch_count}</td>
        <td>${formatKg(m.total_small_kg)}</td>
        <td>${formatKg(m.total_big_kg)}</td>
        <td><strong>${formatKg(m.total_kg)}</strong></td>
      </tr>
    `).join('') : '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">No consumption data</td></tr>';

    // Cost table
    const costBody = document.querySelector('#cost-table tbody');
    costBody.innerHTML = data.cost_by_material.length > 0 ? data.cost_by_material.map(m => `
      <tr>
        <td><strong>${m.material_code}</strong></td>
        <td>${m.material_color}</td>
        <td>${formatKg(m.total_kg)}</td>
        <td>${formatCurrency(m.small_cost_per_kg)}</td>
        <td>${formatCurrency(m.big_cost_per_kg)}</td>
      </tr>
    `).join('') : '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">No cost data</td></tr>';
  } catch (err) {
    document.getElementById('eva-kpis').innerHTML = `<div class="alert alert-danger">Failed to load data: ${err.message}</div>`;
  }
}
