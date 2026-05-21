/* Break Analysis Page */
import { api } from '../api.js';
import { formatDate, formatDuration } from '../utils/format.js';

export function render() {
  return `
    <div class="page-header"><h1>Break Analysis</h1></div>
    <div class="card"><h3>Break Events</h3><table class="data-table" id="break-table">
      <thead><tr><th>Start</th><th>End</th><th>Type</th><th>Worker</th><th>Duration</th><th>Line Level</th></tr></thead><tbody></tbody></table></div>
  `;
}

export async function init() {
  const events = await api.get('/breaks?limit=50');
  const tbody = document.querySelector('#break-table tbody');
  tbody.innerHTML = events.map(e => `<tr><td>${formatDate(e.started_at)}</td><td>${formatDate(e.ended_at) || '<span class="badge badge-warning">Active</span>'}</td><td>${e.break_type_name}</td><td>${e.worker_name || 'Line-wide'}</td><td>${formatDuration(e.duration_seconds)}</td><td>${e.is_line_level ? '<span class="badge badge-info">Yes</span>' : 'No'}</td></tr>`).join('');
}
