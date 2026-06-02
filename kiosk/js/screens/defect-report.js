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
      <div class="top-bar dr-topbar">
        <button class="back-btn dr-back-btn" id="defect-back">← Back</button>
        <h1 class="dr-title">REPORT DEFECT</h1>
      </div>

      <p class="dr-section-label">MOLD</p>
      <div class="dr-mold-row" id="defect-mold-select">
        <button class="dr-mold-btn" data-slot="A">MOLD A</button>
        <button class="dr-mold-btn" data-slot="B">MOLD B</button>
        <button class="dr-mold-btn" data-slot="both">BOTH</button>
      </div>

      <p class="dr-section-label">DEFECT TYPE</p>
      <div class="dr-type-grid" id="defect-type-grid"></div>

      <p class="dr-section-label">QUANTITY</p>
      <div class="dr-quantity-wrap">
        <div id="defect-quantity"></div>
      </div>

      <p class="dr-section-label">NOTES (OPTIONAL)</p>
      <textarea id="defect-notes" class="dr-textarea" placeholder="What happened..."></textarea>

      <div class="dr-confirm-bar">
        <button class="dr-confirm-btn" id="confirm-defect">REPORT DEFECT</button>
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
      document.querySelectorAll('#defect-mold-select button').forEach(b => b.classList.remove('dr-mold-btn-active'));
      btn.classList.add('dr-mold-btn-active');
      selectedMoldSlot = btn.dataset.slot;
    };
  });
  document.querySelector('#defect-mold-select [data-slot="A"]').classList.add('dr-mold-btn-active');

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
    btn.className = 'dr-type-btn';
    btn.textContent = dt.name;
    btn.onclick = () => {
      grid.querySelectorAll('.dr-type-btn').forEach(b => b.classList.remove('dr-type-btn-active'));
      btn.classList.add('dr-type-btn-active');
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
