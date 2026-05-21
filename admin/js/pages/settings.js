/* Settings Page */
import { api } from '../api.js';

export function render() {
  return `
    <div class="page-header"><h1>Settings</h1><button class="btn btn-primary" id="btn-save-settings">Save Settings</button></div>
    <div class="card" id="settings-form"></div>
    <div class="card">
      <h3>System</h3>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button class="btn btn-outline" id="btn-export-csv">Export CSV</button>
        <button class="btn btn-outline" id="btn-backup-db">Backup DB</button>
        <button class="btn btn-outline" id="btn-sync-status">Sync Status</button>
      </div>
    </div>
  `;
}

export async function init() {
  const settings = await api.get('/settings');
  const form = document.getElementById('settings-form');

  const fields = [
    { key: 'expansion_ratio_default', label: 'Default Expansion Ratio', type: 'number', step: '0.01' },
    { key: 'temp_alert_threshold_gun', label: 'Gun Temp Alert Threshold (°C)', type: 'number' },
    { key: 'temp_alert_threshold_mold', label: 'Mold Temp Alert Threshold (°C)', type: 'number' },
    { key: 'inventory_alert_threshold_kg', label: 'Inventory Low Stock Alert (kg)', type: 'number' },
    { key: 'inventory_critical_threshold_kg', label: 'Inventory Critical Alert (kg)', type: 'number' },
    { key: 'shift1_start', label: 'Shift 1 Start Time', type: 'text' },
    { key: 'shift2_start', label: 'Shift 2 Start Time', type: 'text' },
    { key: 'shift3_start', label: 'Shift 3 Start Time', type: 'text' },
    { key: 'sync_interval_seconds', label: 'Sync Interval (seconds)', type: 'number' },
    { key: 'kiosk_idle_timeout_seconds', label: 'Kiosk Idle Timeout (seconds)', type: 'number' },
    { key: 'auto_return_seconds', label: 'Auto-Return After Confirm (seconds)', type: 'number' },
    { key: 'cook_time_tolerance_percent', label: 'Cook Time Tolerance (%)', type: 'number' }
  ];

  form.innerHTML = fields.map(f => `
    <div class="form-group">
      <label>${f.label}</label>
      <input type="${f.type}" ${f.step ? `step="${f.step}"` : ''} id="setting-${f.key}" value="${settings[f.key] || ''}">
    </div>
  `).join('');

  document.getElementById('btn-save-settings').onclick = async () => {
    const data = {};
    for (const f of fields) {
      data[f.key] = document.getElementById(`setting-${f.key}`).value;
    }
    await api.put('/settings', data);
    alert('Settings saved!');
  };

  document.getElementById('btn-sync-status').onclick = async () => {
    const pending = await api.get('/sync/pending');
    alert(`Pending sync records: ${pending.length}`);
  };

  document.getElementById('btn-export-csv').onclick = () => {
    alert('CSV export: Use the individual page export buttons or query the API directly.');
  };

  document.getElementById('btn-backup-db').onclick = () => {
    alert('Database backup runs hourly via cron. Download from server: /data/eva-monitor.db');
  };
}
