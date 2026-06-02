/* Downtime Report Screen */
import { api } from '../api.js';
import { db } from '../db.js';
import { showToast } from '../utils/toast.js';

let selectedScope = 'station';
let selectedDowntimeType = null;
let activeDowntimeEvent = null;

export function render() {
  return `
    <div class="screen" id="screen-downtime">
      <div class="top-bar dt-topbar">
        <button class="back-btn dt-back-btn" id="downtime-back">← Back</button>
        <h1 class="dt-title">REPORT DOWNTIME</h1>
      </div>

      <!-- Active downtime indicator -->
      <div id="active-downtime-banner" class="dt-active-banner" style="display:none;">
        ACTIVE DOWNTIME
        <button class="dt-end-btn" id="end-downtime-btn">END DOWNTIME</button>
      </div>

      <p class="dt-section-label">SCOPE</p>
      <div class="dt-scope-row">
        <button class="dt-scope-btn" data-scope="station">STATION</button>
        <button class="dt-scope-btn" data-scope="line">LINE</button>
      </div>

      <p class="dt-section-label">DOWNTIME TYPE</p>
      <div class="dt-type-grid" id="downtime-type-grid"></div>

      <p class="dt-section-label">NOTES (OPTIONAL)</p>
      <textarea id="downtime-notes" class="dt-textarea" placeholder="What happened..."></textarea>

      <div class="dt-confirm-bar" id="downtime-confirm-bar">
        <button class="dt-confirm-btn" id="confirm-downtime">START DOWNTIME</button>
      </div>
    </div>
  `;
}

export async function init() {
  const station = db.selectedStation;
  const lineId = db.lineId;

  document.getElementById('downtime-back').onclick = () => {
    if (station) window.App.navigate('station-menu');
    else window.App.navigate('station-selector');
  };

  // Check for active downtime
  try {
    const active = await api.downtime.list({ line_id: lineId, active_only: '1' });
    const stationDowntime = active.find(d => d.station_id === station?.id);
    const lineDowntime = active.find(d => !d.station_id);

    if (stationDowntime || lineDowntime) {
      activeDowntimeEvent = stationDowntime || lineDowntime;
      document.getElementById('active-downtime-banner').style.display = 'block';
      document.getElementById('downtime-confirm-bar').style.display = 'none';
    }
  } catch {}

  document.getElementById('end-downtime-btn').onclick = async () => {
    if (activeDowntimeEvent) {
      try {
        await api.downtime.end(activeDowntimeEvent.id);
        showToast('Downtime ended');
      } catch (err) {
        showToast(err.message, 'error');
      }
      setTimeout(() => {
        if (station) window.App.navigate('station-menu');
        else window.App.navigate('station-selector');
      }, 1000);
    }
  };

  // Scope selection
  document.querySelectorAll('[data-scope]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-scope]').forEach(b => {
        b.classList.remove('dt-scope-btn-active');
      });
      btn.classList.add('dt-scope-btn-active');
      selectedScope = btn.dataset.scope;
    };
  });
  document.querySelector('[data-scope="station"]')?.click();

  // Load downtime types
  let types = [];
  try {
    types = await api.downtime.types();
  } catch {
    types = db.downtimeTypes;
  }
  db.downtimeTypes = types;

  const grid = document.getElementById('downtime-type-grid');
  grid.innerHTML = '';
  for (const dt of types) {
    const btn = document.createElement('button');
    btn.className = 'dt-type-btn';
    btn.textContent = dt.name;
    btn.onclick = () => {
      grid.querySelectorAll('.dt-type-btn').forEach(b => b.classList.remove('dt-type-btn-active'));
      btn.classList.add('dt-type-btn-active');
      selectedDowntimeType = dt.id;
    };
    grid.appendChild(btn);
  }

  // Confirm
  document.getElementById('confirm-downtime').onclick = async () => {
    if (!selectedDowntimeType) { showToast('Select downtime type', 'warning'); return; }

    const data = {
      line_id: lineId,
      station_id: selectedScope === 'station' ? station?.id : null,
      downtime_type_id: selectedDowntimeType,
      notes: document.getElementById('downtime-notes').value
    };

    try {
      const result = await api.downtime.start(data);
      activeDowntimeEvent = { id: result.id };
      showToast('Downtime started');
      document.getElementById('active-downtime-banner').style.display = 'block';
      document.getElementById('downtime-confirm-bar').style.display = 'none';
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}
