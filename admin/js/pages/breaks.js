/* Break Analysis Page */
import { api } from '../api.js';
import { formatDate, formatDuration } from '../utils/format.js';

export function render() {
  return `
    <div class="page-header">
      <div>
        <h1>Break Analysis</h1>
        <p>Monitor break events and meal break compliance</p>
      </div>
    </div>

    <div class="grid grid-3 mb-xl" id="break-kpis"></div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Break Events</h3>
          <p class="card-subtitle">Recent break events from all production lines</p>
        </div>
      </div>
      <div class="table-responsive">
        <table class="data-table" id="break-table">
          <thead>
            <tr>
              <th>Start</th>
              <th>End</th>
              <th>Type</th>
              <th>Worker</th>
              <th>Duration</th>
              <th>Line Level</th>
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
    const events = await api.get('/breaks?limit=50');

    // KPIs
    const totalDuration = events.reduce((s, e) => s + (e.duration_seconds || 0), 0);
    const lineLevel = events.filter(e => e.is_line_level).length;
    const individual = events.length - lineLevel;

    document.getElementById('break-kpis').innerHTML = `
      <div class="kpi-card info">
        <div class="kpi-label">Total Break Events</div>
        <div class="kpi-value">${events.length}</div>
        <div class="kpi-change neutral">recorded</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-label">Total Break Time</div>
        <div class="kpi-value" style="font-size: 24px;">${formatDuration(totalDuration)}</div>
        <div class="kpi-change neutral">across all events</div>
      </div>
      <div class="kpi-card success">
        <div class="kpi-label">Line-Level Breaks</div>
        <div class="kpi-value">${lineLevel}</div>
        <div class="kpi-change neutral">${individual} individual</div>
      </div>
    `;

    // Table
    const tbody = document.querySelector('#break-table tbody');
    tbody.innerHTML = events.length > 0 ? events.map(e => `
      <tr>
        <td>${formatDate(e.started_at)}</td>
        <td>${formatDate(e.ended_at) || '<span class="badge badge-warning">Active</span>'}</td>
        <td>${e.break_type_name}</td>
        <td>${e.worker_name || 'Line-wide'}</td>
        <td><strong>${formatDuration(e.duration_seconds)}</strong></td>
        <td>${e.is_line_level ? '<span class="badge badge-info">Yes</span>' : '<span class="badge badge-warning">No</span>'}</td>
      </tr>
    `).join('') : '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">No break events recorded</td></tr>';
  } catch (err) {
    document.getElementById('break-kpis').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}
