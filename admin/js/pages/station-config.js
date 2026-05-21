/* Station Configuration Page */
import { api } from '../api.js';

export function render() {
  return `
    <div class="page-header"><h1>Station Configuration</h1><button class="btn btn-primary" id="btn-save-config">Save All</button></div>
    <div class="alert alert-info">Assign molds and select recipes per station slot. Cooking times for Mold A and B must match (they cook together).</div>
    <div class="filter-bar"><select id="config-line"><option value="1">Line 1</option><option value="2">Line 2</option></select></div>
    <div id="station-config-grid"></div>
  `;
}

export async function init() {
  const [molds, recipes] = await Promise.all([api.get('/molds'), api.get('/recipes')]);

  const lineSelect = document.getElementById('config-line');
  lineSelect.onchange = () => loadStations(lineSelect.value);
  loadStations('1');

  document.getElementById('btn-save-config').onclick = async () => {
    const assignments = [];
    document.querySelectorAll('.station-config-row').forEach(row => {
      const stationId = parseInt(row.dataset.stationId);
      assignments.push({
        station_id: stationId,
        mold_a_id: parseInt(row.querySelector('.sel-mold-a').value) || null,
        mold_b_id: parseInt(row.querySelector('.sel-mold-b').value) || null,
        recipe_a_id: parseInt(row.querySelector('.sel-recipe-a').value) || null,
        recipe_b_id: parseInt(row.querySelector('.sel-recipe-b').value) || null,
        feeder_a: 1,
        feeder_b: 2
      });
    });

    try {
      await api.put('/station-config/batch', { assignments });
      alert('Configuration saved!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  async function loadStations(lineId) {
    const [stations, assignments] = await Promise.all([
      api.get(`/stations?line_id=${lineId}`),
      api.get(`/mold-assignments?line_id=${lineId}`)
    ]);

    const assignMap = {};
    for (const a of assignments) {
      assignMap[`${a.station_id}_${a.mold_slot}`] = a;
    }

    const grid = document.getElementById('station-config-grid');
    grid.innerHTML = '';

    for (const s of stations) {
      const slotA = assignMap[`${s.id}_A`] || {};
      const slotB = assignMap[`${s.id}_B`] || {};

      const row = document.createElement('div');
      row.className = 'card station-config-row';
      row.dataset.stationId = s.id;
      row.innerHTML = `
        <h3 style="margin-bottom:12px;">Station ${s.station_number}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div>
            <h4>Mold A</h4>
            <div class="form-group"><label>Mold</label><select class="sel-mold-a">
              <option value="">— None —</option>
              ${molds.map(m => `<option value="${m.id}" ${slotA.mold_id === m.id ? 'selected' : ''}>${m.serial_code} — ${m.name}</option>`).join('')}
            </select></div>
            <div class="form-group"><label>Recipe</label><select class="sel-recipe-a">
              <option value="">— None —</option>
              ${recipes.map(r => `<option value="${r.id}" ${slotA.recipe_id === r.id ? 'selected' : ''}>${r.mold_name || 'Mold'}/${r.material_code} ${r.material_color}/${r.size_label} (${r.cooking_time_seconds}s)</option>`).join('')}
            </select></div>
          </div>
          <div>
            <h4>Mold B</h4>
            <div class="form-group"><label>Mold</label><select class="sel-mold-b">
              <option value="">— None —</option>
              ${molds.map(m => `<option value="${m.id}" ${slotB.mold_id === m.id ? 'selected' : ''}>${m.serial_code} — ${m.name}</option>`).join('')}
            </select></div>
            <div class="form-group"><label>Recipe</label><select class="sel-recipe-b">
              <option value="">— None —</option>
              ${recipes.map(r => `<option value="${r.id}" ${slotB.recipe_id === r.id ? 'selected' : ''}>${r.mold_name || 'Mold'}/${r.material_code} ${r.material_color}/${r.size_label} (${r.cooking_time_seconds}s)</option>`).join('')}
            </select></div>
          </div>
        </div>
      `;
      grid.appendChild(row);
    }

    // Cooking time mismatch check
    grid.querySelectorAll('select').forEach(sel => {
      sel.onchange = () => {
        document.querySelectorAll('.cook-mismatch').forEach(el => el.remove());
        document.querySelectorAll('.station-config-row').forEach(row => {
          const rA = recipes.find(r => r.id === parseInt(row.querySelector('.sel-recipe-a').value));
          const rB = recipes.find(r => r.id === parseInt(row.querySelector('.sel-recipe-b').value));
          if (rA && rB && rA.cooking_time_seconds !== rB.cooking_time_seconds) {
            const warn = document.createElement('div');
            warn.className = 'alert alert-danger cook-mismatch';
            warn.style.marginTop = '8px';
            warn.textContent = `Cooking time mismatch: A=${rA.cooking_time_seconds}s, B=${rB.cooking_time_seconds}s`;
            row.appendChild(warn);
          }
        });
      };
    });
  }
}
