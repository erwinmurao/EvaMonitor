/* EVA Materials CRUD Page */
import { api } from '../api.js';
import { formatCurrency } from '../utils/format.js';

export function render() {
  return `
    <div class="page-header"><h1>EVA Materials</h1>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" id="btn-add-material">+ Add Material</button>
        <button class="btn btn-success" id="btn-quick-pair">+ Quick Add Pair</button>
      </div>
    </div>
    <div class="card"><table class="data-table" id="materials-table">
      <thead><tr><th>Code</th><th>Color</th><th>Size</th><th>Sack (kg)</th><th>Cost/kg</th><th>Status</th><th>Actions</th></tr></thead><tbody></tbody></table></div>
    <div id="material-modal"></div>
  `;
}

export async function init() {
  const materials = await api.get('/eva-materials');
  const tbody = document.querySelector('#materials-table tbody');
  tbody.innerHTML = materials.map(m => `<tr>
    <td><strong>${m.code}</strong></td><td>${m.color}</td><td>${m.size_type}</td>
    <td>${m.sack_size_kg} kg</td><td>${formatCurrency(m.cost_per_kg)}</td>
    <td>${m.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</td>
    <td>
      <button class="btn btn-sm btn-outline" onclick="window.AdminApp.navigate('eva-inventory')">Inventory</button>
      <button class="btn btn-sm btn-primary" data-edit="${m.id}">Edit</button>
    </td>
  </tr>`).join('');

  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => showMaterialForm(materials.find(m => m.id === parseInt(btn.dataset.edit)));
  });

  document.getElementById('btn-add-material').onclick = () => showMaterialForm(null);
  document.getElementById('btn-quick-pair').onclick = () => showQuickPairForm();
}

function showMaterialForm(material) {
  const modal = document.getElementById('material-modal');
  const isEdit = !!material;
  modal.innerHTML = `
    <div class="modal-backdrop"><div class="modal">
      <h2>${isEdit ? 'Edit' : 'Add'} Material</h2>
      <div class="form-group"><label>Code</label><input id="matf-code" value="${material?.code || ''}"></div>
      <div class="form-group"><label>Color</label><input id="matf-color" value="${material?.color || ''}"></div>
      <div class="form-group"><label>Size Type</label><select id="matf-size"><option value="Small" ${material?.size_type === 'Small' ? 'selected' : ''}>Small</option><option value="Big" ${material?.size_type === 'Big' ? 'selected' : ''}>Big</option></select></div>
      <div class="form-group"><label>Sack Size (kg)</label><input type="number" step="0.5" id="matf-sack" value="${material?.sack_size_kg || 25}"></div>
      <div class="form-group"><label>Cost per kg</label><input type="number" step="0.01" id="matf-cost" value="${material?.cost_per_kg || 0}"></div>
      <div class="modal-actions"><button class="btn btn-outline" id="matf-cancel">Cancel</button><button class="btn btn-primary" id="matf-save">Save</button></div>
    </div></div>
  `;
  document.getElementById('matf-cancel').onclick = () => modal.innerHTML = '';
  document.getElementById('matf-save').onclick = async () => {
    const data = {
      code: document.getElementById('matf-code').value,
      color: document.getElementById('matf-color').value,
      size_type: document.getElementById('matf-size').value,
      sack_size_kg: parseFloat(document.getElementById('matf-sack').value),
      cost_per_kg: parseFloat(document.getElementById('matf-cost').value)
    };
    if (isEdit) await api.put(`/eva-materials/${material.id}`, data);
    else await api.post('/eva-materials', data);
    modal.innerHTML = '';
    init();
  };
}

function showQuickPairForm() {
  const modal = document.getElementById('material-modal');
  modal.innerHTML = `
    <div class="modal-backdrop"><div class="modal">
      <h2>Quick Add Material Pair</h2>
      <p style="color:var(--text-dim);margin-bottom:16px;">Creates both Small + Big variants at once</p>
      <div class="form-group"><label>Code (e.g. H8003)</label><input id="qp-code"></div>
      <div class="form-group"><label>Color (e.g. Black)</label><input id="qp-color"></div>
      <div class="form-group"><label>Small Sack Size (kg)</label><input type="number" id="qp-small-sack" value="25"></div>
      <div class="form-group"><label>Big Sack Size (kg)</label><input type="number" id="qp-big-sack" value="50"></div>
      <div class="form-group"><label>Small Cost/kg</label><input type="number" step="0.01" id="qp-small-cost" value="3.50"></div>
      <div class="form-group"><label>Big Cost/kg</label><input type="number" step="0.01" id="qp-big-cost" value="4.00"></div>
      <div class="modal-actions"><button class="btn btn-outline" id="qp-cancel">Cancel</button><button class="btn btn-primary" id="qp-save">Create Pair</button></div>
    </div></div>
  `;
  document.getElementById('qp-cancel').onclick = () => modal.innerHTML = '';
  document.getElementById('qp-save').onclick = async () => {
    await api.post('/eva-materials/quick-add-pair', {
      code: document.getElementById('qp-code').value,
      color: document.getElementById('qp-color').value,
      small_sack_size_kg: parseFloat(document.getElementById('qp-small-sack').value),
      big_sack_size_kg: parseFloat(document.getElementById('qp-big-sack').value),
      small_cost_per_kg: parseFloat(document.getElementById('qp-small-cost').value),
      big_cost_per_kg: parseFloat(document.getElementById('qp-big-cost').value)
    });
    modal.innerHTML = '';
    init();
  };
}
