/* Downtime Analysis Page */
import { api } from '../api.js';
import { formatDate, formatDuration } from '../utils/format.js';

export function render() {
  return `
    <div class="page-header">
      <div>
        <h1>Downtime Analysis</h1>
        <p>Monitor and analyze production downtime events</p>
      </div>
    </div>

    <div class="grid grid-3 mb-xl" id="dt-kpis"></div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Downtime Events</h3>
          <p class="card-subtitle">Recent downtime incidents from production</p>
        </div>
      </div>
      <div class="table-responsive">
        <table class="data-table" id="dt-table">
          <thead>
            <tr>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Type</th>
              <th>Location</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;
}

export async function init() {
  const events = await api.get('/downtime?limit=50');
  const totalDuration = events.reduce((s, e) => s + (e.duration_seconds || 0), 0);
  const plannedCount = events.filter(e => e.is_planned).length;
  const unplannedCount = events.length - plannedCount;

  document.getElementById('dt-kpis').innerHTML = `
    <div class="kpi-card danger">
      <div class="kpi-label">Total Events</div>
      <div class="kpi-value">${events.length}</div>
      <div class="kpi-change neutral">in current shift</div>
    </div>
    <div class="kpi-card warning">
      <div class="kpi-label">Total Downtime</div>
      <div class="kpi-value" style="font-size: 24px;">${formatDuration(totalDuration)}</div>
      <div class="kpi-change neutral">production lost</div>
    </div>
    <div class="kpi-card info">
      <div class="kpi-label">Unplanned Events</div>
      <div class="kpi-value">${unplannedCount}</div>
      <div class="kpi-change negative">↑ ${plannedCount} planned</div>
    </div>
  `;

  const tbody = document.querySelector('#dt-table tbody');
  tbody.innerHTML = events.length > 0 ? events.map(e => `
    <tr>
      <td>${formatDate(e.started_at)}</td>
      <td>${e.ended_at ? formatDate(e.ended_at) : '<span class="badge badge-danger">Active</span>'}</td>
      <td>${e.downtime_type_name}</td>
      <td>${e.station_id ? `Station ${e.station_id}` : 'Line'}</td>
      <td><strong>${formatDuration(e.duration_seconds)}</strong></td>
      <td>${e.is_planned ? '<span class="badge badge-primary">Planned</span>' : '<span class="badge badge-danger">Unplanned</span>'}</td>
    </tr>
  `).join('') : '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">No downtime events</td></tr>';
}
