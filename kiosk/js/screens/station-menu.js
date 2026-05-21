/* Station Action Menu Screen */
import { db } from '../db.js';

export function render() {
  return `
    <div class="screen" id="screen-station-menu">
      <div class="top-bar">
        <button class="back-btn" id="menu-back">← Back</button>
        <h1 id="menu-station-title">Station</h1>
      </div>

      <div id="station-recipe-info" style="margin-bottom:16px;"></div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;flex:1;">
        <button class="btn-success" style="font-size:1.5rem;" id="btn-cycle-done">
          ✅<br>CYCLE DONE
        </button>
        <button class="btn-primary" style="font-size:1.2rem;" id="btn-eva-mix">
          🧪<br>EVA MIX
        </button>
        <button class="btn-warning" style="font-size:1.2rem;" id="btn-defect">
          ⚠️<br>DEFECT
        </button>
        <button class="btn-danger" style="font-size:1.2rem;" id="btn-downtime-menu">
          🔴<br>DOWNTIME
        </button>
      </div>
    </div>
  `;
}

export function init() {
  const station = db.selectedStation;
  if (!station) { window.App.navigate('station-selector'); return; }

  document.getElementById('menu-station-title').textContent = `Station ${station.station_number}`;
  document.getElementById('menu-back').onclick = () => window.App.navigate('station-selector');

  // Show recipe info
  const infoEl = document.getElementById('station-recipe-info');
  const assignments = db.assignments;
  const slotA = assignments.find(a => a.station_id === station.id && a.mold_slot === 'A');
  const slotB = assignments.find(a => a.station_id === station.id && a.mold_slot === 'B');
  const recipes = db.recipes;

  let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">';

  // Mold A
  html += '<div class="mold-section"><div class="mold-header"><span class="mold-label">Mold A</span></div>';
  if (slotA && slotA.recipe_id) {
    const r = recipes.find(r => r.id === slotA.recipe_id);
    if (r) {
      html += `<div class="recipe-info">
        <strong>${r.mold_name || 'Mold'}</strong> / ${r.material_code} ${r.material_color} / ${r.size_label}<br>
        Injection: <strong>${r.injection_weight_grams}g</strong> | Cook: <strong>${r.cooking_time_seconds}s</strong>
      </div>`;
    }
  } else {
    html += '<div class="recipe-info">No recipe assigned</div>';
  }
  html += '</div>';

  // Mold B
  html += '<div class="mold-section"><div class="mold-header"><span class="mold-label">Mold B</span></div>';
  if (slotB && slotB.recipe_id) {
    const r = recipes.find(r => r.id === slotB.recipe_id);
    if (r) {
      html += `<div class="recipe-info">
        <strong>${r.mold_name || 'Mold'}</strong> / ${r.material_code} ${r.material_color} / ${r.size_label}<br>
        Injection: <strong>${r.injection_weight_grams}g</strong> | Cook: <strong>${r.cooking_time_seconds}s</strong>
      </div>`;
    }
  } else {
    html += '<div class="recipe-info">No recipe assigned</div>';
  }
  html += '</div></div>';
  infoEl.innerHTML = html;

  // Button handlers
  document.getElementById('btn-cycle-done').onclick = () => window.App.navigate('cycle-done');
  document.getElementById('btn-eva-mix').onclick = () => window.App.navigate('eva-mix');
  document.getElementById('btn-defect').onclick = () => window.App.navigate('defect-report');
  document.getElementById('btn-downtime-menu').onclick = () => window.App.navigate('downtime');
}
