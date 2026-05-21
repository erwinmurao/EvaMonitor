/* CYCLE DONE Screen — most critical, 8-15x/hr/station */
import { api } from '../api.js';
import { db } from '../db.js';
import { showToast, createStepper } from '../utils/toast.js';

let goodA, badA, goodB, badB;

export function render() {
  return `
    <div class="screen" id="screen-cycle-done">
      <div class="top-bar">
        <button class="back-btn" id="cycle-back">← Back</button>
        <h1>CYCLE DONE</h1>
      </div>

      <!-- Mold A Section -->
      <div class="mold-section" id="mold-a-section">
        <div class="mold-header">
          <span class="mold-label">MOLD A</span>
          <span class="recipe-info" id="recipe-a-info"></span>
        </div>
        <div class="pairs-row">
          <span class="pairs-label">Good Pairs</span>
          <div id="stepper-good-a"></div>
        </div>
        <div class="pairs-row">
          <span class="pairs-label">Bad Pairs</span>
          <div id="stepper-bad-a"></div>
        </div>
      </div>

      <!-- Mold B Section -->
      <div class="mold-section" id="mold-b-section">
        <div class="mold-header">
          <span class="mold-label">MOLD B</span>
          <span class="recipe-info" id="recipe-b-info"></span>
        </div>
        <div class="pairs-row">
          <span class="pairs-label">Good Pairs</span>
          <div id="stepper-good-b"></div>
        </div>
        <div class="pairs-row">
          <span class="pairs-label">Bad Pairs</span>
          <div id="stepper-bad-b"></div>
        </div>
      </div>

      <!-- Temperatures -->
      <div class="temp-section">
        <h3 style="margin-bottom:8px;">Temperatures (°C)</h3>
        <div class="temp-grid">
          <div class="temp-field">
            <label>Gun Stage 1</label>
            <input type="number" id="temp-gun1" inputmode="numeric">
          </div>
          <div class="temp-field">
            <label>Gun Stage 2</label>
            <input type="number" id="temp-gun2" inputmode="numeric">
          </div>
          <div class="temp-field">
            <label>Gun Stage 3</label>
            <input type="number" id="temp-gun3" inputmode="numeric">
          </div>
          <div class="temp-field">
            <label>Gun Stage 4</label>
            <input type="number" id="temp-gun4" inputmode="numeric">
          </div>
          <div class="temp-field">
            <label>Mold Temp</label>
            <input type="number" id="temp-mold" inputmode="numeric">
          </div>
        </div>
      </div>

      <div class="confirm-bar">
        <button class="btn-success" style="font-size:1.5rem;min-width:300px;" id="confirm-cycle">
          ✅ CONFIRM CYCLE
        </button>
      </div>
    </div>
  `;
}

export async function init() {
  const station = db.selectedStation;
  if (!station) { window.App.navigate('station-selector'); return; }

  document.getElementById('cycle-back').onclick = () => window.App.navigate('station-menu');

  // Load recipe info for this station
  const assignments = db.assignments;
  const slotA = assignments.find(a => a.station_id === station.id && a.mold_slot === 'A');
  const slotB = assignments.find(a => a.station_id === station.id && a.mold_slot === 'B');
  const recipes = db.recipes;

  const recipeA = slotA?.recipe_id ? recipes.find(r => r.id === slotA.recipe_id) : null;
  const recipeB = slotB?.recipe_id ? recipes.find(r => r.id === slotB.recipe_id) : null;

  // Display recipe info
  const infoA = document.getElementById('recipe-a-info');
  const infoB = document.getElementById('recipe-b-info');

  if (recipeA) {
    infoA.innerHTML = `<strong>${recipeA.mold_name || 'Mold'}</strong> / ${recipeA.material_code} ${recipeA.material_color} / ${recipeA.size_label} — ${recipeA.injection_weight_grams}g, ${recipeA.cooking_time_seconds}s`;
  } else {
    infoA.textContent = 'No recipe';
  }

  if (recipeB) {
    infoB.innerHTML = `<strong>${recipeB.mold_name || 'Mold'}</strong> / ${recipeB.material_code} ${recipeB.material_color} / ${recipeB.size_label} — ${recipeB.injection_weight_grams}g, ${recipeB.cooking_time_seconds}s`;
  } else {
    infoB.textContent = 'No recipe';
  }

  // Create steppers
  const expectedA = recipeA?.expected_pairs || 2;
  const expectedB = recipeB?.expected_pairs || 2;
  goodA = createStepper(document.getElementById('stepper-good-a'), expectedA, 0, 20);
  badA = createStepper(document.getElementById('stepper-bad-a'), 0, 0, 20);
  goodB = createStepper(document.getElementById('stepper-good-b'), expectedB, 0, 20);
  badB = createStepper(document.getElementById('stepper-bad-b'), 0, 0, 20);

  // Pre-fill temperatures from last cycle
  const lastTemps = db.lastTemps[station.id] || {};
  const tempFields = ['temp-gun1', 'temp-gun2', 'temp-gun3', 'temp-gun4', 'temp-mold'];
  const tempKeys = ['gun1', 'gun2', 'gun3', 'gun4', 'mold'];

  try {
    const apiLastTemps = await api.cycles.last(station.id);
    for (let i = 0; i < tempKeys.length; i++) {
      const val = apiLastTemps[`gun_temp_stage${i+1}`] || apiLastTemps[tempKeys[i]];
      if (val) {
        const input = document.getElementById(tempFields[i]);
        input.value = val;
        input.classList.add('prefilled');
      }
    }
  } catch {
    // Use cached
    for (let i = 0; i < tempKeys.length; i++) {
      if (lastTemps[tempKeys[i]]) {
        const input = document.getElementById(tempFields[i]);
        input.value = lastTemps[tempKeys[i]];
        input.classList.add('prefilled');
      }
    }
  }

  // Confirm
  document.getElementById('confirm-cycle').onclick = async () => {
    const shiftId = db.shiftId;
    const cycleNum = db.incrementCycle(station.id);

    const cycleData = {
      station_id: station.id,
      shift_id: shiftId,
      cycle_number: cycleNum,
      mold_a_id: slotA?.mold_id || null,
      mold_b_id: slotB?.mold_id || null,
      recipe_a_id: slotA?.recipe_id || null,
      recipe_b_id: slotB?.recipe_id || null,
      mold_a_name: recipeA?.mold_name || '',
      mold_b_name: recipeB?.mold_name || '',
      mold_a_expansion_ratio: recipeA?.mold_expansion_ratio || 0,
      mold_b_expansion_ratio: recipeB?.mold_expansion_ratio || 0,
      mold_a_size: recipeA?.size_label || '',
      mold_b_size: recipeB?.size_label || '',
      target_cooking_seconds: recipeA?.cooking_time_seconds || recipeB?.cooking_time_seconds || null,
      gun_temp_stage1: parseFloat(document.getElementById('temp-gun1').value) || null,
      gun_temp_stage2: parseFloat(document.getElementById('temp-gun2').value) || null,
      gun_temp_stage3: parseFloat(document.getElementById('temp-gun3').value) || null,
      gun_temp_stage4: parseFloat(document.getElementById('temp-gun4').value) || null,
      mold_temp: parseFloat(document.getElementById('temp-mold').value) || null,
      team_member_count: db.team.length,
      outputs: [
        { mold_slot: 'A', mold_id: slotA?.mold_id || null, size: recipeA?.size_label || '', good_pairs: goodA.getValue(), bad_pairs: badA.getValue() },
        { mold_slot: 'B', mold_id: slotB?.mold_id || null, size: recipeB?.size_label || '', good_pairs: goodB.getValue(), bad_pairs: badB.getValue() }
      ]
    };

    try {
      await api.cycles.create(cycleData);
    } catch {
      // Queued offline
    }

    // Cache temps for next cycle
    const temps = db.lastTemps;
    temps[station.id] = {
      gun1: cycleData.gun_temp_stage1,
      gun2: cycleData.gun_temp_stage2,
      gun3: cycleData.gun_temp_stage3,
      gun4: cycleData.gun_temp_stage4,
      mold: cycleData.mold_temp
    };
    db.lastTemps = temps;

    showToast('Cycle saved!');
    // Auto-return after 2s
    setTimeout(() => window.App.navigate('station-menu'), 2000);
  };
}
