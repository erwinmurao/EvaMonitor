/* Recipes CRUD Page — KEY page */
import { api } from '../api.js';
import { formatCurrency } from '../utils/format.js';

export function render() {
  return `
    <div class="page-header"><h1>Recipes</h1><button class="btn btn-primary" id="btn-add-recipe">+ Add Recipe</button></div>
    <div class="alert alert-info">A recipe defines the tested parameters for a specific mold + material + size combination. Cooking time comes from the recipe, NOT the mold.</div>
    <div class="card"><table class="data-table" id="recipes-table">
      <thead><tr><th>ID</th><th>Mold</th><th>Material</th><th>Color</th><th>Size</th><th>Small kg</th><th>Big kg</th><th>Cook Time</th><th>Injection</th><th>Pairs</th><th>Cost/Pair</th><th>Actions</th></tr></thead><tbody></tbody></table></div>
    <div id="recipe-modal"></div>
  `;
}

export async function init() {
  const [recipes, molds, materials] = await Promise.all([
    api.get('/recipes'),
    api.get('/molds'),
    api.get('/eva-materials')
  ]);

  const tbody = document.querySelector('#recipes-table tbody');
  tbody.innerHTML = '';
  for (const r of recipes) {
    let costPerPair = '-';
    try {
      const cost = await api.get(`/recipes/${r.id}/cost`);
      costPerPair = formatCurrency(cost.total_cost_per_pair);
    } catch {}

    tbody.innerHTML += `<tr>
      <td>${r.id}</td><td>${r.mold_name || r.mold_id}</td><td>${r.material_code}</td><td>${r.material_color}</td>
      <td>${r.size_label}</td><td>${r.small_kg}</td><td>${r.big_kg}</td>
      <td><strong>${r.cooking_time_seconds}s</strong></td><td>${r.injection_weight_grams}g</td><td>${r.expected_pairs}</td>
      <td>${costPerPair}</td>
      <td><button class="btn btn-sm btn-primary" data-edit="${r.id}">Edit</button></td>
    </tr>`;
  }

  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => showRecipeForm(recipes.find(r => r.id === parseInt(btn.dataset.edit)), molds, materials);
  });

  document.getElementById('btn-add-recipe').onclick = () => showRecipeForm(null, molds, materials);
}

function showRecipeForm(recipe, molds, materials) {
  const modal = document.getElementById('recipe-modal');
  const isEdit = !!recipe;

  // Get unique code+color combos
  const uniqueMats = [];
  const seen = new Set();
  for (const m of materials) {
    const key = `${m.code}_${m.color}`;
    if (!seen.has(key)) { seen.add(key); uniqueMats.push(m); }
  }

  modal.innerHTML = `
    <div class="modal-backdrop"><div class="modal" style="max-width:700px;">
      <h2>${isEdit ? 'Edit' : 'Add'} Recipe</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>Mold</label><select id="rf-mold">
          ${molds.map(m => `<option value="${m.id}" ${recipe?.mold_id === m.id ? 'selected' : ''}>${m.serial_code} — ${m.name}</option>`).join('')}
        </select></div>
        <div class="form-group"><label>Material</label><select id="rf-material">
          ${uniqueMats.map(m => `<option value="${m.code}|${m.color}" ${recipe?.material_code === m.code && recipe?.material_color === m.color ? 'selected' : ''}>${m.code} ${m.color}</option>`).join('')}
        </select></div>
        <div class="form-group"><label>Size Label</label><input id="rf-size" value="${recipe?.size_label || ''}" placeholder="e.g. 35-36"></div>
        <div class="form-group"><label>Small Pellets (kg)</label><input type="number" step="0.5" id="rf-small-kg" value="${recipe?.small_kg || 0}"></div>
        <div class="form-group"><label>Big Pellets (kg)</label><input type="number" step="0.5" id="rf-big-kg" value="${recipe?.big_kg || 0}"></div>
        <div class="form-group"><label>Cooking Time (seconds)</label><input type="number" id="rf-cook-time" value="${recipe?.cooking_time_seconds || 0}"></div>
        <div class="form-group"><label>Injection Weight (grams)</label><input type="number" id="rf-injection" value="${recipe?.injection_weight_grams || 0}"></div>
        <div class="form-group"><label>Expected Pairs per Cycle</label><input type="number" id="rf-pairs" value="${recipe?.expected_pairs || 2}"></div>
      </div>
      <div class="modal-actions"><button class="btn btn-outline" id="rf-cancel">Cancel</button><button class="btn btn-primary" id="rf-save">Save</button></div>
    </div></div>
  `;
  document.getElementById('rf-cancel').onclick = () => modal.innerHTML = '';
  document.getElementById('rf-save').onclick = async () => {
    const [matCode, matColor] = document.getElementById('rf-material').value.split('|');
    const smallKg = parseFloat(document.getElementById('rf-small-kg').value);
    const bigKg = parseFloat(document.getElementById('rf-big-kg').value);
    const totalKg = smallKg + bigKg;
    const injectionKg = parseFloat(document.getElementById('rf-injection').value) / 1000;
    const pairs = parseInt(document.getElementById('rf-pairs').value);

    const data = {
      mold_id: parseInt(document.getElementById('rf-mold').value),
      material_code: matCode,
      material_color: matColor,
      size_label: document.getElementById('rf-size').value,
      small_kg: smallKg,
      big_kg: bigKg,
      cooking_time_seconds: parseInt(document.getElementById('rf-cook-time').value),
      injection_weight_grams: parseInt(document.getElementById('rf-injection').value),
      expected_pairs: pairs
    };

    try {
      if (isEdit) await api.put(`/recipes/${recipe.id}`, data);
      else await api.post('/recipes', data);
      modal.innerHTML = '';
      init();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };
}
