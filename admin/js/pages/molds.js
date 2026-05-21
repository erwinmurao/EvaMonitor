/* Molds CRUD Page */
import { api } from '../api.js';

export function render() {
  return `
    <div class="page-header">
      <div>
        <h1>Molds Management</h1>
        <p>Manage all production molds and their configurations</p>
      </div>
      <button class="btn btn-primary" id="btn-add-mold">+ Add Mold</button>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Mold Inventory</h3>
          <p class="card-subtitle">Complete list of molds with specifications</p>
        </div>
      </div>
      <div class="table-responsive">
        <table class="data-table" id="molds-table">
          <thead>
            <tr>
              <th>Serial Code</th>
              <th>Name</th>
              <th>Expansion</th>
              <th>Cavities</th>
              <th>Available Sizes</th>
              <th>Condition</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
    <div id="mold-modal"></div>
  `;
}

export async function init() {
  const molds = await api.get('/molds');
  const tbody = document.querySelector('#molds-table tbody');
  
  tbody.innerHTML = molds.length > 0 ? molds.map(m => {
    const conditionClass = m.condition === 'good' ? 'badge-success' : m.condition === 'worn' ? 'badge-warning' : 'badge-danger';
    return `
      <tr>
        <td><strong>${m.serial_code}</strong></td>
        <td>${m.name}</td>
        <td>${m.expansion_ratio}x</td>
        <td>${m.pairs_per_cycle}</td>
        <td>${JSON.parse(m.available_sizes || '[]').join(', ')}</td>
        <td><span class="badge ${conditionClass}">${m.condition}</span></td>
        <td>${m.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-warning">Inactive</span>'}</td>
        <td>
          <div class="action-buttons">
            <button class="action-btn" data-edit="${m.id}">Edit</button>
            ${m.is_active ? `<button class="action-btn action-btn-danger" data-deactivate="${m.id}">Deactivate</button>` : `<button class="action-btn" data-activate="${m.id}">Activate</button>`}
          </div>
        </td>
      </tr>
    `;
  }).join('') : '<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">No molds found</td></tr>';

  // Edit buttons
  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => showMoldForm(molds.find(m => m.id === parseInt(btn.dataset.edit)));
  });

  // Deactivate
  tbody.querySelectorAll('[data-deactivate]').forEach(btn => {
    btn.onclick = async () => {
      if (confirm('Deactivate this mold?')) {
        await api.put(`/molds/${btn.dataset.deactivate}`, { is_active: false });
        init();
      }
    };
  });

  // Activate
  tbody.querySelectorAll('[data-activate]').forEach(btn => {
    btn.onclick = async () => {
      await api.put(`/molds/${btn.dataset.activate}`, { is_active: true });
      init();
    };
  });

  // Add mold
  document.getElementById('btn-add-mold').onclick = () => showMoldForm(null);
}

function showMoldForm(mold) {
  const modal = document.getElementById('mold-modal');
  const isEdit = !!mold;
  
  modal.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal" style="max-width: 600px;">
        <h2 style="margin-bottom: 24px;">${isEdit ? 'Edit' : 'Add'} Mold</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label>Serial Code</label>
            <input class="form-control" id="mf-serial" value="${mold?.serial_code || ''}" placeholder="e.g., MOLD-001">
          </div>
          <div class="form-group">
            <label>Mold Name</label>
            <input class="form-control" id="mf-name" value="${mold?.name || ''}" placeholder="e.g., Large Sole">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label>Expansion Ratio</label>
            <input type="number" step="0.01" class="form-control" id="mf-ratio" value="${mold?.expansion_ratio || 1.0}" placeholder="1.0">
          </div>
          <div class="form-group">
            <label>Pairs per Cycle</label>
            <input type="number" class="form-control" id="mf-cavity" value="${mold?.pairs_per_cycle || 2}" placeholder="2">
          </div>
        </div>

        <div class="form-group">
          <label>Available Sizes (comma separated)</label>
          <input class="form-control" id="mf-sizes" value="${mold ? JSON.parse(mold.available_sizes || '[]').join(', ') : ''}" placeholder="e.g., Small, Medium, Large">
        </div>

        <div class="form-group">
          <label>Condition</label>
          <select class="form-control" id="mf-condition">
            <option value="good" ${mold?.condition === 'good' ? 'selected' : ''}>Good</option>
            <option value="worn" ${mold?.condition === 'worn' ? 'selected' : ''}>Worn</option>
            <option value="damaged" ${mold?.condition === 'damaged' ? 'selected' : ''}>Damaged</option>
          </select>
        </div>

        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
          <button class="btn btn-secondary" id="mf-cancel">Cancel</button>
          <button class="btn btn-primary" id="mf-save">Save Mold</button>
        </div>
      </div>
    </div>
  `;

  const backdrop = document.getElementById('modal-backdrop');
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) modal.innerHTML = '';
  });

  document.getElementById('mf-cancel').onclick = () => modal.innerHTML = '';
  document.getElementById('mf-save').onclick = async () => {
    const data = {
      serial_code: document.getElementById('mf-serial').value,
      name: document.getElementById('mf-name').value,
      expansion_ratio: parseFloat(document.getElementById('mf-ratio').value),
      pairs_per_cycle: parseInt(document.getElementById('mf-cavity').value),
      available_sizes: JSON.stringify(document.getElementById('mf-sizes').value.split(',').map(s => s.trim()).filter(Boolean)),
      condition: document.getElementById('mf-condition').value,
      is_active: true
    };
    
    try {
      if (isEdit) await api.put(`/molds/${mold.id}`, data);
      else await api.post('/molds', data);
      modal.innerHTML = '';
      init();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };
}
