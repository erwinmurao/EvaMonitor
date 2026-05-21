/* Defect Analysis Page */
import { api } from '../api.js';
import { formatNumber, formatDate } from '../utils/format.js';

export function render() {
  return `
    <div class="page-header">
      <div>
        <h1>Defect Analysis</h1>
        <p>Track and analyze quality defects across all stations</p>
      </div>
    </div>

    <div class="grid grid-3 mb-xl" id="defect-kpis"></div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Defect Log</h3>
          <p class="card-subtitle">Recent defects from all production stations</p>
        </div>
      </div>
      <div class="table-responsive">
        <table class="data-table" id="defect-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Station</th>
              <th>Mold</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;
}

export async function init() {
  const defects = await api.get('/defects?limit=100');
  
  // Calculate KPIs
  const totalDefects = defects.length;
  const totalQuantity = defects.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const defectTypes = {};
  defects.forEach(d => {
    defectTypes[d.defect_type_name] = (defectTypes[d.defect_type_name] || 0) + 1;
  });
  const topDefect = Object.entries(defectTypes).sort((a, b) => b[1] - a[1])[0];
  
  const kpisHtml = `
    <div class="kpi-card warning">
      <div class="kpi-label">Total Defect Events</div>
      <div class="kpi-value">${totalDefects}</div>
      <div class="kpi-change neutral">in current shift</div>
    </div>
    <div class="kpi-card danger">
      <div class="kpi-label">Total Units Defective</div>
      <div class="kpi-value">${totalQuantity}</div>
      <div class="kpi-change neutral">units affected</div>
    </div>
    <div class="kpi-card warning">
      <div class="kpi-label">Most Common Type</div>
      <div class="kpi-value" style="font-size: 20px;">${topDefect?.[0] || 'N/A'}</div>
      <div class="kpi-change neutral">${topDefect?.[1] || 0} occurrences</div>
    </div>
  `;
  document.getElementById('defect-kpis').innerHTML = kpisHtml;
  
  const tbody = document.querySelector('#defect-table tbody');
  tbody.innerHTML = defects.length > 0 ? defects.map(d => `
    <tr>
      <td>${formatDate(d.logged_at)}</td>
      <td>${d.station_id}</td>
      <td>${d.mold_slot || '-'}</td>
      <td><span class="badge badge-warning">${d.defect_type_name}</span></td>
      <td><strong>${d.quantity}</strong> units</td>
      <td>${d.notes || '-'}</td>
    </tr>
  `).join('') : '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">No defects recorded</td></tr>';
}
