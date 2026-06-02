/* Station Action Menu Screen */
import { db } from '../db.js';

export function render() {
  return `
    <div class="screen" id="screen-station-menu">
      <div class="sm-topbar">
        <button class="sm-back-btn" id="menu-back">← Back</button>
        <h1 class="sm-station-name" id="menu-station-title">Station</h1>
      </div>

      <div id="station-recipe-info" class="sm-recipe-section"></div>

      <div class="sm-tile-grid">
        <button class="sm-tile sm-tile-cycle" id="btn-cycle-done">
          <div class="sm-tile-icon">✓</div>
          <span class="sm-tile-label">CYCLE DONE</span>
        </button>
        <button class="sm-tile sm-tile-mix" id="btn-eva-mix">
          <div class="sm-tile-icon">⚗</div>
          <span class="sm-tile-label">EVA MIX</span>
        </button>
        <button class="sm-tile sm-tile-defect" id="btn-defect">
          <div class="sm-tile-icon">⚠</div>
          <span class="sm-tile-label">DEFECT</span>
        </button>
        <button class="sm-tile sm-tile-down" id="btn-downtime-menu">
          <div class="sm-tile-icon">●</div>
          <span class="sm-tile-label">DOWNTIME</span>
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

  let html = '<div class="sm-mold-grid">';

  // Mold A
  html += '<div class="sm-mold-card"><div class="sm-mold-title">Mold A</div>';
  if (slotA && slotA.recipe_id) {
    const r = recipes.find(r => r.id === slotA.recipe_id);
    if (r) {
      html += `<div class="sm-mold-info">
        ${r.mold_name || 'Mold'} / ${r.material_code} ${r.material_color} / ${r.size_label}<br>
        Injection: ${r.injection_weight_grams}g | Cook: ${r.cooking_time_seconds}s
      </div>`;
    }
  } else {
    html += '<div class="sm-mold-info">No recipe assigned</div>';
  }
  html += '</div>';

  // Mold B
  html += '<div class="sm-mold-card"><div class="sm-mold-title">Mold B</div>';
  if (slotB && slotB.recipe_id) {
    const r = recipes.find(r => r.id === slotB.recipe_id);
    if (r) {
      html += `<div class="sm-mold-info">
        ${r.mold_name || 'Mold'} / ${r.material_code} ${r.material_color} / ${r.size_label}<br>
        Injection: ${r.injection_weight_grams}g | Cook: ${r.cooking_time_seconds}s
      </div>`;
    }
  } else {
    html += '<div class="sm-mold-info">No recipe assigned</div>';
  }
  html += '</div></div>';
  infoEl.innerHTML = html;

  // Button handlers
  document.getElementById('btn-cycle-done').onclick = () => window.App.navigate('cycle-done');
  document.getElementById('btn-eva-mix').onclick = () => window.App.navigate('eva-mix');
  document.getElementById('btn-defect').onclick = () => window.App.navigate('defect-report');
  document.getElementById('btn-downtime-menu').onclick = () => window.App.navigate('downtime');
}
