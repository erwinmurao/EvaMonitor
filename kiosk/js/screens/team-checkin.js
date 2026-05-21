/* Team Check-In Screen */
import { api } from '../api.js';
import { db } from '../db.js';
import { showToast } from '../utils/toast.js';

let selectedWorker = null;
let selectedRole = null;
let pinValue = '';
const checkedIn = new Set();

export function render() {
  return `
    <div class="screen" id="screen-team-checkin">
      <div class="top-bar">
        <h1>Team Check-In</h1>
        <div class="top-bar-actions">
          <button class="btn-success" style="min-height:56px;min-width:200px;padding:8px 24px;" id="start-work-btn" disabled>
            ALL DONE → START WORK
          </button>
        </div>
      </div>

      <div id="worker-grid" class="worker-grid"></div>

      <!-- Role + PIN modal -->
      <div class="modal-backdrop" id="checkin-modal" style="display:none;">
        <div class="modal">
          <h3 id="modal-worker-name"></h3>
          <p class="section-label">Select Role</p>
          <div class="role-selector" id="role-selector"></div>
          <p class="section-label">Enter PIN</p>
          <div class="numpad" id="pin-numpad">
            <div class="numpad-display" style="font-size:2rem;text-align:center;min-height:50px;letter-spacing:6px;grid-column:span 3;"></div>
            <button data-key="1">1</button><button data-key="2">2</button><button data-key="3">3</button>
            <button data-key="4">4</button><button data-key="5">5</button><button data-key="6">6</button>
            <button data-key="7">7</button><button data-key="8">8</button><button data-key="9">9</button>
            <button data-key="del" style="background:var(--danger);">⌫</button><button data-key="0">0</button><button data-key="ok" style="background:var(--success);">✓</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function init() {
  const grid = document.getElementById('worker-grid');
  const modal = document.getElementById('checkin-modal');
  const modalName = document.getElementById('modal-worker-name');
  const roleSelector = document.getElementById('role-selector');
  const startWorkBtn = document.getElementById('start-work-btn');
  const pinDisplay = modal.querySelector('.numpad-display');

  const roles = [
    { id: 1, name: 'Operator' },
    { id: 2, name: 'Helper' },
    { id: 3, name: 'Trimmer' },
    { id: 4, name: 'Packer' }
  ];

  // Load workers
  api.workers.list().then(workers => {
    db.workers = workers;
    renderWorkers(workers);
  }).catch(() => {
    renderWorkers(db.workers);
  });

  function renderWorkers(workers) {
    grid.innerHTML = '';
    for (const w of workers) {
      const card = document.createElement('div');
      card.className = 'worker-card' + (checkedIn.has(w.id) ? ' checked-in' : '');
      card.innerHTML = `
        <div class="avatar">${w.name.charAt(0)}</div>
        <div class="worker-name">${w.name}</div>
        ${checkedIn.has(w.id) ? '<div class="check-mark">✓</div>' : '<div class="worker-role">Tap to check in</div>'}
      `;
      if (!checkedIn.has(w.id)) {
        card.onclick = () => openCheckin(w);
      }
      grid.appendChild(card);
    }
  }

  function openCheckin(worker) {
    selectedWorker = worker;
    selectedRole = null;
    pinValue = '';
    modalName.textContent = worker.name;

    // Render roles
    roleSelector.innerHTML = '';
    for (const role of roles) {
      const btn = document.createElement('button');
      btn.className = 'role-btn';
      btn.textContent = role.name;
      btn.onclick = () => {
        roleSelector.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedRole = role;
      };
      roleSelector.appendChild(btn);
    }

    pinDisplay.textContent = '_';
    modal.style.display = 'flex';
  }

  // Numpad handling
  modal.querySelectorAll('.numpad button').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.key;
      if (key === 'del') {
        pinValue = pinValue.slice(0, -1);
      } else if (key === 'ok') {
        submitCheckin();
        return;
      } else if (pinValue.length < 4) {
        pinValue += key;
      }
      pinDisplay.textContent = '*'.repeat(pinValue.length) || '_';
    };
  });

  async function submitCheckin() {
    if (!selectedRole) { showToast('Select a role', 'warning'); return; }
    if (!pinValue) { showToast('Enter PIN', 'warning'); return; }

    // Verify PIN locally
    const worker = db.workers.find(w => w.id === selectedWorker.id);
    if (worker && worker.pin !== pinValue) {
      showToast('Invalid PIN', 'error');
      pinValue = '';
      pinDisplay.textContent = '_';
      return;
    }

    const shiftId = db.shiftId;
    try {
      await api.shifts.checkin(shiftId, {
        worker_id: selectedWorker.id,
        role_id: selectedRole.id
      });
    } catch (err) {
      // Queue offline
    }

    checkedIn.add(selectedWorker.id);
    const team = db.team;
    team.push({ worker_id: selectedWorker.id, name: selectedWorker.name, role: selectedRole.name, role_id: selectedRole.id });
    db.team = team;

    modal.style.display = 'none';
    showToast(`${selectedWorker.name} checked in as ${selectedRole.name}`);
    renderWorkers(db.workers);
    startWorkBtn.disabled = false;
  }

  startWorkBtn.onclick = () => {
    if (db.team.length === 0) { showToast('At least 1 person must check in', 'warning'); return; }
    window.App.navigate('station-selector');
  };
}
