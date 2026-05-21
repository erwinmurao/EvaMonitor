/* Station Selector (HOME) Screen */
import { api } from '../api.js';
import { db } from '../db.js';
import { showToast } from '../utils/toast.js';

export function render() {
  return `
    <div class="screen" id="screen-station-selector">
      <div class="top-bar">
        <h1 id="selector-title">Station Selector</h1>
        <div class="top-bar-actions">
          <button class="top-bar-btn" id="btn-meal">🍽️ MEAL</button>
          <button class="top-bar-btn" id="btn-eva">🧪 EVA MIX</button>
          <button class="top-bar-btn" id="btn-downtime">🔴 DOWNTIME</button>
          <button class="top-bar-btn" id="btn-team">👥 <span id="team-count">0</span></button>
          <button class="top-bar-btn" id="btn-end-shift" style="background:var(--danger);color:white;">END SHIFT</button>
        </div>
      </div>
      <div class="card-grid" id="station-grid"></div>
    </div>
  `;
}

export async function init() {
  const grid = document.getElementById('station-grid');
  const titleEl = document.getElementById('selector-title');
  const teamCountEl = document.getElementById('team-count');

  const lineId = db.lineId;
  const shiftId = db.shiftId;
  const team = db.team;
  teamCountEl.textContent = team.length;

  // Load stations + assignments
  let stations = [];
  let assignments = [];
  try {
    stations = await api.stations.list(lineId);
    db.stations = stations;
    assignments = await api.assignments.list(lineId);
    db.assignments = assignments;
  } catch {
    stations = db.stations;
    assignments = db.assignments;
  }

  // Load recipes for assignment labels
  let recipes = [];
  try {
    recipes = await api.get('/recipes');
    db.recipes = recipes;
  } catch {
    recipes = db.recipes;
  }

  // Get cycle counts and active downtime
  const cycleCounts = db.cycleCounts;
  let activeDowntime = [];
  try {
    activeDowntime = await api.downtime.list({ line_id: lineId, active_only: '1' });
  } catch {}

  const downtimeStationIds = new Set(activeDowntime.filter(d => d.station_id).map(d => d.station_id));

  // Build assignment map
  const assignMap = {};
  for (const a of assignments) {
    const key = `${a.station_id}_${a.mold_slot}`;
    assignMap[key] = a;
  }

  // Get recipe label
  function recipeLabel(stationId, slot) {
    const a = assignMap[`${stationId}_${slot}`];
    if (!a || !a.recipe_id) return { label: 'No recipe', hasRecipe: false };
    const recipe = recipes.find(r => r.id === a.recipe_id);
    if (!recipe) return { label: `Recipe #${a.recipe_id}`, hasRecipe: true };
    return {
      label: `${recipe.mold_name || 'Mold'}/${recipe.material_code}-${recipe.material_color.substring(0,3)}/${recipe.size_label}`,
      hasRecipe: true,
      recipe
    };
  }

  // Render station cards
  grid.innerHTML = '';
  for (const station of stations) {
    const recipeA = recipeLabel(station.id, 'A');
    const recipeB = recipeLabel(station.id, 'B');
    const cycles = cycleCounts[station.id] || 0;
    const isDown = downtimeStationIds.has(station.id);
    const isMeal = db.mealBreakActive;

    let status = 'green';
    let statusIcon = '';
    if (isMeal) { status = 'meal'; statusIcon = '🍽️'; }
    else if (isDown) { status = 'red'; statusIcon = '🔴'; }
    else if (!recipeA.hasRecipe && !recipeB.hasRecipe) { status = 'gray'; statusIcon = '⚪'; }

    const card = document.createElement('div');
    card.className = 'card station-card';
    card.innerHTML = `
      <div class="status-indicator">
        <span class="status-dot ${status}"></span>
        ${statusIcon}
      </div>
      <div class="station-number">Station ${station.station_number}</div>
      <div class="recipe-label"><strong>A:</strong> ${recipeA.label}</div>
      <div class="recipe-label"><strong>B:</strong> ${recipeB.label}</div>
      <div class="cycle-count">${cycles} cycles</div>
      <div class="avatars">
        ${team.map(t => `<div class="avatar${db.workerBreaks[t.worker_id] ? ' on-break' : ''}" title="${t.name}">${t.name.charAt(0)}</div>`).join('')}
      </div>
    `;
    card.onclick = () => {
      if (isMeal) { showToast('Meal break active', 'warning'); return; }
      db.selectedStation = station;
      window.App.navigate('station-menu');
    };
    grid.appendChild(card);
  }

  // Top bar actions
  document.getElementById('btn-meal').onclick = () => {
    if (db.mealBreakActive) {
      endMealBreak();
    } else {
      startMealBreak();
    }
  };
  document.getElementById('btn-meal').textContent = db.mealBreakActive ? '🍽️ END MEAL' : '🍽️ MEAL';

  document.getElementById('btn-eva').onclick = () => window.App.navigate('eva-mix');
  document.getElementById('btn-downtime').onclick = () => window.App.navigate('downtime');
  document.getElementById('btn-team').onclick = () => window.App.navigate('team-roster');

  document.getElementById('btn-end-shift').onclick = async () => {
    if (confirm('End this shift?')) {
      try {
        await api.shifts.end(shiftId);
      } catch {}
      db.clearSession();
      showToast('Shift ended');
      window.App.navigate('shift-start');
    }
  };

  // Avatar tap for individual breaks
  grid.querySelectorAll('.avatar').forEach(avatar => {
    avatar.onclick = (e) => {
      e.stopPropagation();
      const workerName = avatar.getAttribute('title');
      const teamMember = team.find(t => t.name === workerName);
      if (!teamMember) return;
      showWorkerBreakPopup(teamMember);
    };
  });

  async function startMealBreak() {
    try {
      const result = await api.breaks.start({
        break_type_id: 1, // Meal
        line_id: lineId,
        shift_id: shiftId,
        notes: 'Line-wide meal break'
      });
      db.mealBreakActive = true;
      db.mealBreakId = result.id;
      showToast('Meal break started');
      document.getElementById('btn-meal').textContent = '🍽️ END MEAL';
      // Re-render to show meal overlay on stations
      init();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function endMealBreak() {
    try {
      await api.breaks.endMeal(lineId, shiftId);
      db.mealBreakActive = false;
      showToast('Meal break ended');
      init();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function showWorkerBreakPopup(member) {
    const isOnBreak = !!db.workerBreaks[member.worker_id];
    const action = isOnBreak ? 'End Break' : 'Start Break';
    if (confirm(`${member.name}: ${action}?`)) {
      if (isOnBreak) {
        api.breaks.end(db.workerBreaks[member.worker_id]).catch(() => {});
        db.clearWorkerBreak(member.worker_id);
        showToast(`${member.name} back from break`);
      } else {
        api.breaks.start({
          break_type_id: 2, // Restroom
          line_id: lineId,
          shift_id: shiftId,
          worker_id: member.worker_id
        }).then(result => {
          db.setWorkerBreak(member.worker_id, result.id);
          showToast(`${member.name} on break`);
          init();
        }).catch(err => showToast(err.message, 'error'));
      }
    }
  }
}
