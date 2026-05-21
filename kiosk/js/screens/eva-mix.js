/* EVA MIX LOG Screen */
import { api } from '../api.js';
import { db } from '../db.js';
import { showToast } from '../utils/toast.js';
import { createMaterialPicker } from '../utils/material-picker.js';

let selectedFeeder = 1;
let selectedMaterial = null;
let selectedRecipe = null;
let isOverridden = false;

export function render() {
  return `
    <div class="screen" id="screen-eva-mix">
      <div class="top-bar">
        <button class="back-btn" id="eva-back">← Back</button>
        <h1>🧪 EVA MIX LOG</h1>
      </div>

      <!-- Step 1: Select Feeder -->
      <div id="eva-step-1">
        <p class="section-label">SELECT FEEDER</p>
        <div style="display:flex;gap:16px;">
          <button class="btn-outline" style="min-width:150px;" id="feeder-1" data-feeder="1">Feeder 1</button>
          <button class="btn-outline" style="min-width:150px;" id="feeder-2" data-feeder="2">Feeder 2</button>
        </div>
      </div>

      <!-- Step 2: Select Material -->
      <div id="eva-step-2" style="margin-top:20px;">
        <p class="section-label">SELECT MATERIAL</p>
        <div id="material-picker-container"></div>
      </div>

      <!-- Step 3: Recipe auto-fill -->
      <div id="eva-step-3" style="margin-top:20px;display:none;">
        <p class="section-label">MIX AMOUNTS</p>
        <div class="recipe-info-bar" id="recipe-info-bar">
          <p id="recipe-label-text" style="font-weight:700;"></p>
          <p id="recipe-cook-time" style="color:var(--text-dim);"></p>
        </div>
        <div class="amount-input">
          <label>Small Pellets</label>
          <input type="number" id="small-kg" inputmode="decimal" step="0.5">
          <span class="unit">kg</span>
        </div>
        <div class="amount-input">
          <label>Big Pellets</label>
          <input type="number" id="big-kg" inputmode="decimal" step="0.5">
          <span class="unit">kg</span>
        </div>
        <div class="recipe-info-bar">
          <p id="computed-total">Total: 0 kg</p>
          <p id="computed-expanded" style="color:var(--text-dim);"></p>
        </div>
      </div>

      <div class="confirm-bar" id="eva-confirm-bar" style="display:none;">
        <button class="btn-success" style="font-size:1.3rem;min-width:250px;" id="confirm-eva-mix">
          ✅ CONFIRM MIX
        </button>
      </div>
    </div>
  `;
}

export async function init() {
  const station = db.selectedStation;
  const lineId = db.lineId;

  document.getElementById('eva-back').onclick = () => {
    if (station) window.App.navigate('station-menu');
    else window.App.navigate('station-selector');
  };

  let materials = [];
  try {
    materials = await api.get('/eva-materials?is_active=1');
  } catch {}

  // Deduplicate to unique code+color combos
  const uniqueMaterials = [];
  const seen = new Set();
  for (const m of materials) {
    const key = `${m.code}_${m.color}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueMaterials.push(m);
    }
  }

  // Step 1: Feeder selection
  document.querySelectorAll('[data-feeder]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-feeder]').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline');
      });
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-primary');
      selectedFeeder = parseInt(btn.dataset.feeder);
    };
  });
  // Default feeder 1
  document.getElementById('feeder-1').click();

  // Step 2: Material picker
  const pickerContainer = document.getElementById('material-picker-container');
  createMaterialPicker(pickerContainer, uniqueMaterials, async (mat) => {
    selectedMaterial = mat;
    await loadRecipeForMaterial(mat);
  });

  async function loadRecipeForMaterial(mat) {
    const step3 = document.getElementById('eva-step-3');
    const confirmBar = document.getElementById('eva-confirm-bar');
    const recipeLabel = document.getElementById('recipe-label-text');
    const cookTimeEl = document.getElementById('recipe-cook-time');
    const smallInput = document.getElementById('small-kg');
    const bigInput = document.getElementById('big-kg');

    // Find recipe matching this material + station's mold
    const assignments = db.assignments;
    const recipes = db.recipes;
    const slotA = assignments.find(a => a.station_id === station?.id && a.mold_slot === 'A');
    const slotB = assignments.find(a => a.station_id === station?.id && a.mold_slot === 'B');

    const matchingRecipes = recipes.filter(r =>
      r.material_code === mat.code &&
      r.material_color === mat.color &&
      (r.mold_id === slotA?.mold_id || r.mold_id === slotB?.mold_id)
    );

    if (matchingRecipes.length === 0) {
      recipeLabel.textContent = 'No recipe found — enter amounts manually';
      recipeLabel.style.color = 'var(--warning)';
      cookTimeEl.textContent = '';
      smallInput.value = '';
      bigInput.value = '';
      isOverridden = true;
    } else if (matchingRecipes.length === 1) {
      selectedRecipe = matchingRecipes[0];
      recipeLabel.textContent = `${selectedRecipe.mold_name || 'Mold'} / ${selectedRecipe.material_code} ${selectedRecipe.material_color} / ${selectedRecipe.size_label}`;
      recipeLabel.style.color = 'var(--success)';
      cookTimeEl.textContent = `Cook time: ${selectedRecipe.cooking_time_seconds}s | Injection: ${selectedRecipe.injection_weight_grams}g`;
      smallInput.value = selectedRecipe.small_kg;
      bigInput.value = selectedRecipe.big_kg;
      isOverridden = false;
    } else {
      // Multiple recipes — show picker (simplified: use first)
      selectedRecipe = matchingRecipes[0];
      recipeLabel.textContent = `${matchingRecipes.length} recipes found — using: ${selectedRecipe.mold_name}/${selectedRecipe.size_label}`;
      recipeLabel.style.color = 'var(--primary)';
      cookTimeEl.textContent = `Cook time: ${selectedRecipe.cooking_time_seconds}s | Injection: ${selectedRecipe.injection_weight_grams}g`;
      smallInput.value = selectedRecipe.small_kg;
      bigInput.value = selectedRecipe.big_kg;
      isOverridden = false;
    }

    smallInput.oninput = updateComputed;
    bigInput.oninput = updateComputed;
    updateComputed();

    step3.style.display = 'block';
    confirmBar.style.display = 'flex';
  }

  function updateComputed() {
    const smallKg = parseFloat(document.getElementById('small-kg').value) || 0;
    const bigKg = parseFloat(document.getElementById('big-kg').value) || 0;
    const total = smallKg + bigKg;
    document.getElementById('computed-total').innerHTML = `Total: <strong>${total.toFixed(1)} kg</strong>`;

    const expansionRatio = selectedRecipe?.mold_expansion_ratio || 1.65;
    document.getElementById('computed-expanded').textContent = `Expanded: ~${(total * expansionRatio).toFixed(1)} kg`;

    // Check if overridden
    if (selectedRecipe) {
      if (smallKg !== selectedRecipe.small_kg || bigKg !== selectedRecipe.big_kg) {
        document.getElementById('computed-total').style.color = 'var(--warning)';
        isOverridden = true;
      } else {
        document.getElementById('computed-total').style.color = '';
        isOverridden = false;
      }
    }
  }

  // Confirm
  document.getElementById('confirm-eva-mix').onclick = async () => {
    if (!selectedMaterial) { showToast('Select a material', 'warning'); return; }

    const smallKg = parseFloat(document.getElementById('small-kg').value) || 0;
    const bigKg = parseFloat(document.getElementById('big-kg').value) || 0;

    if (smallKg + bigKg <= 0) { showToast('Enter mix amounts', 'warning'); return; }

    const mixData = {
      line_id: lineId,
      material_code: selectedMaterial.code,
      material_color: selectedMaterial.color,
      recipe_id: selectedRecipe?.id || null,
      small_eva_kg: smallKg,
      big_eva_kg: bigKg,
      expansion_ratio: selectedRecipe?.mold_expansion_ratio || 0,
      injection_feeder: selectedFeeder,
      station_id: station?.id || null
    };

    try {
      await api.evaMixes.create(mixData);
      showToast('EVA mix logged!');
    } catch (err) {
      showToast(err.message, 'error');
    }

    setTimeout(() => {
      if (station) window.App.navigate('station-menu');
      else window.App.navigate('station-selector');
    }, 1500);
  };
}
