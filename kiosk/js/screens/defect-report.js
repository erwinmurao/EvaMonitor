/* Defect Report Screen */
import { api } from '../api.js';
import { db } from '../db.js';
import { showToast, createStepper } from '../utils/toast.js';

let selectedMoldSlot = 'A';
let selectedDefectType = null;
let quantityStepper;

export function render() {
  return `
    <div class="screen" id="screen-defect-report">
      <div class="top-bar">
        <button class="back-btn" id="defect-back">← Back</button>
        <h1>⚠️ REPORT DEFECT</h1>
      </div>

      <p class="section-label">MOLD</p>
      <div class="mold-select" id="defect-mold-select">
        <button data-slot="A">Mold A</button>
        <button data-slot="B">Mold B</button>
        <button data-slot="both">Both</button>
      </div>

      <p class="section-label">DEFECT TYPE</p>
      <div class="defect-type-grid" id="defect-type-grid"></div>

      <p class="section-label">QUANTITY</p>
      <div id="defect-quantity" style="margin:16px 0;"></div>

      <p class="section-label">NOTES (optional)</p>
      <textarea id="defect-notes" style="width:100%;min-height:80px;padding:12px;background:var(--bg);color:var(--text);border:2px solid var(--border);border-radius:var(--radius-sm);font-size:1rem;resize:vertical;" placeholder="Any additional notes..."></textarea>

      <div class="confirm-bar">
        <button class="btn-warning" style="min-width:250px;" id="confirm-defect">⚠️ REPORT DEFECT</button>
      </div>
    </div>
  `;
}

export async function init() {
  const station = db.selectedStation;
  if (!station) { window.App.navigate('station-selector'); return; }

  document.getElementById('defect-back').onclick = () => window.App.navigate('station-menu');

  // Mold selection
  document.querySelectorAll('#defect-mold-select button').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#defect-mold-select button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedMoldSlot = btn.dataset.slot;
    };
  });
  document.querySelector('#defect-mold-select [data-slot="A"]').classList.add('selected');

  // Load defect types
  let defectTypes = [];
  try {
    defectTypes = await api.defects.types();
  } catch {
    defectTypes = db.defectTypes;
  }
  db.defectTypes = defectTypes;

  const grid = document.getElementById('defect-type-grid');
  grid.innerHTML = '';
  for (const dt of defectTypes) {
    const btn = document.createElement('button');
    btn.className = 'defect-type-btn';
    btn.textContent = dt.name;
    btn.onclick = () => {
      grid.querySelectorAll('.defect-type-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedDefectType = dt.id;
    };
    grid.appendChild(btn);
  }

  // Quantity stepper
  quantityStepper = createStepper(document.getElementById('defect-quantity'), 1, 1, 50);

  // Confirm
  document.getElementById('confirm-defect').onclick = async () => {
    if (!selectedDefectType) { showToast('Select defect type', 'warning'); return; }

    const data = {
      station_id: station.id,
      mold_slot: selectedMoldSlot === 'both' ? null : selectedMoldSlot,
      defect_type_id: selectedDefectType,
      quantity: quantityStepper.getValue(),
      notes: document.getElementById('defect-notes').value
    };

    try {
      await api.defects.create(data);
      showToast('Defect reported!');
    } catch (err) {
      showToast(err.message, 'error');
    }

    setTimeout(() => window.App.navigate('station-menu'), 1500);
  };
}
