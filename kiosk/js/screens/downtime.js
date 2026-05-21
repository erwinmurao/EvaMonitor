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
      <div class="top-bar">
        <button class="back-btn" id="downtime-back">← Back</button>
        <h1>🔴 REPORT DOWNTIME</h1>
      </div>

      <!-- Active downtime indicator -->
      <div id="active-downtime-banner" style="display:none;background:var(--danger);color:white;padding:16px;border-radius:var(--radius-sm);margin-bottom:16px;text-align:center;font-size:1.2rem;font-weight:700;">
        ACTIVE DOWNTIME
        <button class="btn-success" style="min-height:56px;margin-top:8px;padding:8px 24px;font-size:1rem;" id="end-downtime-btn">
          ✅ END DOWNTIME
        </button>
      </div>

      <p class="section-label">SCOPE</p>
      <div style="display:flex;gap:12px;margin-bottom:16px;">
        <button class="btn-outline" data-scope="station" style="min-height:56px;min-width:120px;">Station</button>
        <button class="btn-outline" data-scope="line" style="min-height:56px;min-width:120px;">Line</button>
      </div>

      <p class="section-label">DOWNTIME TYPE</p>
      <div class="downtime-type-grid" id="downtime-type-grid"></div>

      <p class="section-label">NOTES (optional)</p>
      <textarea id="downtime-notes" style="width:100%;min-height:80px;padding:12px;background:var(--bg);color:var(--text);border:2px solid var(--border);border-radius:var(--radius-sm);font-size:1rem;resize:vertical;" placeholder="What happened..."></textarea>

      <div class="confirm-bar" id="downtime-confirm-bar">
        <button class="btn-danger" style="min-width:250px;" id="confirm-downtime">🔴 START DOWNTIME</button>
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
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline');
      });
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-primary');
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
    btn.className = 'downtime-type-btn';
    btn.textContent = dt.name;
    btn.onclick = () => {
      grid.querySelectorAll('.downtime-type-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
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
