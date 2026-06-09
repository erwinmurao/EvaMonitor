/* Teams Page */
import { api } from '../api.js';
import { formatDate, formatNumber } from '../utils/format.js';

export function render() {
  return `
    <div class="page-header">
      <div>
        <h1>Team Management</h1>
        <p>View team composition and worker activity</p>
      </div>
    </div>
    <div id="team-content"></div>
  `;
}

export async function init() {
  const shifts = await api.get('/reports/teams');
  const content = document.getElementById('team-content');

  content.innerHTML = shifts.map(s => `
    <div class="card mb-xl">
      <div class="card-header">
        <div>
          <h3 class="card-title">Line ${s.line_id} — Shift ${s.shift_number}</h3>
          <p class="card-subtitle">${s.shift_date}</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; text-align: center;">
          <div>
            <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Duration</div>
            <div style="font-size: 18px; font-weight: 700;">${s.shift_duration_hours}h</div>
          </div>
          <div>
            <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Good Pairs</div>
            <div style="font-size: 18px; font-weight: 700; color: var(--success);">${s.good_pairs}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Pairs/Hour</div>
            <div style="font-size: 18px; font-weight: 700;">${s.pairs_per_hour}</div>
          </div>
        </div>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Worker</th>
              <th>Role</th>
              <th>Login Time</th>
              <th>Logout Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${(s.team || []).length > 0 ? (s.team || []).map(t => `
              <tr>
                <td><strong>${t.name}</strong></td>
                <td>${t.role_name}</td>
                <td>${formatDate(t.logged_in_at)}</td>
                <td>${t.logged_out_at ? formatDate(t.logged_out_at) : '-'}</td>
                <td>${t.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-warning">Logged Out</span>'}</td>
              </tr>
            `).join('') : '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">No team members</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `).join('');
}
