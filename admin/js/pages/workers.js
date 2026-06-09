/* Workers CRUD Page */
import { api } from '../api.js';

export function render() {
  return `
    <div class="page-header">
      <div>
        <h1>Workers</h1>
        <p>Manage factory workers and their access</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" id="btn-add-worker">+ Add Worker</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Worker List</h3>
          <p class="card-subtitle">All registered workers with their PIN codes</p>
        </div>
      </div>
      <div class="table-responsive">
        <table class="data-table" id="workers-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>PIN</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
    <div id="worker-modal"></div>
  `;
}

export async function init() {
  const workers = await api.get('/workers');
  const tbody = document.querySelector('#workers-table tbody');
  tbody.innerHTML = workers.length > 0 ? workers.map(w => `
    <tr>
      <td>${w.id}</td>
      <td><strong>${w.name}</strong></td>
      <td>${w.pin}</td>
      <td>${w.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</td>
      <td>
        <button class="btn btn-sm btn-primary" data-edit="${w.id}">Edit</button>
        ${w.is_active ? `<button class="btn btn-sm btn-danger" data-deactivate="${w.id}">Deactivate</button>` : ''}
      </td>
    </tr>
  `).join('') : '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">No workers found</td></tr>';

  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => showWorkerForm(workers.find(w => w.id === parseInt(btn.dataset.edit)));
  });
  tbody.querySelectorAll('[data-deactivate]').forEach(btn => {
    btn.onclick = async () => {
      if (confirm('Deactivate this worker?')) {
        await api.del(`/workers?id=${btn.dataset.deactivate}`);
        init();
      }
    };
  });

  document.getElementById('btn-add-worker').onclick = () => showWorkerForm(null);
}

function showWorkerForm(worker) {
  const modal = document.getElementById('worker-modal');
  const isEdit = !!worker;
  modal.innerHTML = `
    <div class="modal-backdrop"><div class="modal">
      <h2>${isEdit ? 'Edit' : 'Add'} Worker</h2>
      <div class="form-group"><label>Name</label><input class="form-control" id="wf-name" value="${worker?.name || ''}"></div>
      <div class="form-group"><label>PIN</label><input class="form-control" id="wf-pin" value="${worker?.pin || ''}" maxlength="4" placeholder="4-digit PIN"></div>
      <div class="modal-actions"><button class="btn btn-outline" id="wf-cancel">Cancel</button><button class="btn btn-primary" id="wf-save">Save</button></div>
    </div></div>
  `;
  document.getElementById('wf-cancel').onclick = () => modal.innerHTML = '';
  document.getElementById('wf-save').onclick = async () => {
    const data = { name: document.getElementById('wf-name').value, pin: document.getElementById('wf-pin').value };
    if (isEdit) await api.put(`/workers?id=${worker.id}`, data);
    else await api.post('/workers', data);
    modal.innerHTML = '';
    init();
  };
}
