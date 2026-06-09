/* Lines & Stations Management Page */
import { api } from '../api.js';

let currentView = 'lines'; // 'lines' | 'stations'
let selectedLine = null;

export function render() {
  return `
    <div id="lines-view">
      <div class="page-header">
        <div>
          <h1>Lines & Stations</h1>
          <p>Manage production lines and their stations</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="btn-add-line">+ Add Line</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Production Lines</h3>
            <p class="card-subtitle">All configured production lines</p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table" id="lines-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Stations</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
      <div id="line-modal"></div>
    </div>
    <div id="stations-view" style="display:none;">
      <div class="page-header">
        <div>
          <button class="btn btn-outline" id="btn-back-lines" style="margin-bottom:8px;">&larr; Back to Lines</button>
          <h1 id="stations-title">Stations</h1>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="btn-add-station">+ Add Station</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title" id="stations-card-title">Stations</h3>
            <p class="card-subtitle">Stations assigned to this production line</p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table" id="stations-table">
            <thead>
              <tr>
                <th>Station #</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export async function init() {
  if (currentView === 'stations' && selectedLine) {
    await loadStationsView(selectedLine);
  } else {
    await loadLinesView();
  }
}

async function loadLinesView() {
  currentView = 'lines';
  document.getElementById('lines-view').style.display = '';
  document.getElementById('stations-view').style.display = 'none';

  const lines = await api.get('/lines');
  const tbody = document.querySelector('#lines-table tbody');

  if (lines.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--text-secondary);">No lines yet. Click "+ Add Line" to create one.</td></tr>';
  } else {
    tbody.innerHTML = lines.map(l => `
      <tr>
        <td><strong>${l.name}</strong></td>
        <td>${l.station_count} stations</td>
        <td>${l.created_at ? new Date(l.created_at).toLocaleDateString() : '-'}</td>
        <td>
          <button class="btn btn-sm btn-outline" data-manage="${l.id}" data-name="${l.name}">Manage Stations</button>
          <button class="btn btn-sm btn-primary" data-edit="${l.id}" data-name="${l.name}" data-num="${l.num_stations || l.numStations || 8}">Edit</button>
          <button class="btn btn-sm btn-danger" data-delete="${l.id}" data-name="${l.name}">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  // Add Line button
  document.getElementById('btn-add-line').onclick = () => showLineForm(null);

  // Edit buttons
  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => showLineForm({
      id: btn.dataset.edit,
      name: btn.dataset.name,
      numStations: parseInt(btn.dataset.num)
    });
  });

  // Delete buttons
  tbody.querySelectorAll('[data-delete]').forEach(btn => {
    btn.onclick = async () => {
      if (confirm(`Delete "${btn.dataset.name}" and all its stations? This cannot be undone.`)) {
        const stations = await api.get(`/stations?line_id=${btn.dataset.delete}`);
        for (const s of stations) {
          await api.del(`/stations?id=${s.id}`);
        }
        await api.del(`/lines?id=${btn.dataset.delete}`);
        loadLinesView();
      }
    };
  });

  // Manage Stations buttons
  tbody.querySelectorAll('[data-manage]').forEach(btn => {
    btn.onclick = () => {
      selectedLine = { id: btn.dataset.manage, name: btn.dataset.name };
      loadStationsView(selectedLine);
    };
  });
}

function showLineForm(line) {
  const modal = document.getElementById('line-modal');
  const isEdit = !!line;
  modal.innerHTML = `
    <div class="modal-backdrop"><div class="modal">
      <h2>${isEdit ? 'Edit' : 'Add'} Line</h2>
      <div class="form-group"><label>Line Name</label><input id="lf-name" class="form-control" value="${line?.name || ''}" placeholder="e.g. Line 3"></div>
      <div class="form-group"><label>Number of Stations</label><input type="number" id="lf-num" class="form-control" value="${line?.numStations || 8}" min="1" max="20"></div>
      ${!isEdit ? '<p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px;">Stations will be auto-created with numbers 1 through N.</p>' : ''}
      <div class="modal-actions"><button class="btn btn-outline" id="lf-cancel">Cancel</button><button class="btn btn-primary" id="lf-save">Save</button></div>
    </div></div>
  `;
  document.getElementById('lf-cancel').onclick = () => modal.innerHTML = '';
  document.getElementById('lf-save').onclick = async () => {
    const name = document.getElementById('lf-name').value.trim();
    const numStations = parseInt(document.getElementById('lf-num').value) || 8;
    if (!name) { alert('Name is required'); return; }

    if (isEdit) {
      await api.put(`/lines?id=${line.id}`, { name, num_stations: numStations });
      // Sync actual station records to match num_stations
      const currentStations = await api.get(`/stations?line_id=${line.id}`);
      const currentCount = currentStations.length;
      if (numStations > currentCount) {
        for (let i = currentCount + 1; i <= numStations; i++) {
          await api.post('/stations', { line_id: line.id, station_number: i });
        }
      } else if (numStations < currentCount) {
        const sorted = currentStations.sort((a, b) => b.station_number - a.station_number);
        for (let i = 0; i < currentCount - numStations; i++) {
          await api.del(`/stations?id=${sorted[i].id}`);
        }
      }
    } else {
      const result = await api.post('/lines', { name, num_stations: numStations });
      for (let i = 1; i <= numStations; i++) {
        await api.post('/stations', { line_id: result.id, station_number: i });
      }
    }
    modal.innerHTML = '';
    loadLinesView();
  };
}

async function loadStationsView(line) {
  currentView = 'stations';
  document.getElementById('lines-view').style.display = 'none';
  document.getElementById('stations-view').style.display = '';
  document.getElementById('stations-title').textContent = `${line.name} - Stations`;
  document.getElementById('stations-card-title').textContent = `${line.name} Stations`;

  const stations = await api.get(`/stations?line_id=${line.id}`);
  const tbody = document.querySelector('#stations-table tbody');

  if (stations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:40px;color:var(--text-secondary);">No stations yet. Click "+ Add Station" to add one.</td></tr>';
  } else {
    tbody.innerHTML = stations.map(s => `
      <tr>
        <td><strong>Station ${s.station_number}</strong></td>
        <td>${s.created_at ? new Date(s.created_at).toLocaleDateString() : '-'}</td>
        <td><button class="btn btn-sm btn-danger" data-del-station="${s.id}" data-num="${s.station_number}">Delete</button></td>
      </tr>
    `).join('');
  }

  // Back button
  document.getElementById('btn-back-lines').onclick = () => {
    selectedLine = null;
    loadLinesView();
  };

  // Add Station button
  document.getElementById('btn-add-station').onclick = async () => {
    const maxNum = stations.length > 0 ? Math.max(...stations.map(s => s.station_number)) : 0;
    const nextNum = maxNum + 1;
    await api.post('/stations', { line_id: line.id, station_number: nextNum });
    loadStationsView(line);
  };

  // Delete station buttons
  tbody.querySelectorAll('[data-del-station]').forEach(btn => {
    btn.onclick = async () => {
      if (confirm(`Delete Station ${btn.dataset.num}?`)) {
        await api.del(`/stations?id=${btn.dataset.delStation}`);
        loadStationsView(line);
      }
    };
  });
}
