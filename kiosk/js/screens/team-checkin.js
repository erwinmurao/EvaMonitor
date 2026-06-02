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
      <div class="checkin-topbar">
        <h1 class="checkin-title">Team Check-In</h1>
        <div class="checkin-topbar-actions">
          <button class="checkin-btn-start-work" id="start-work-btn">START WORK</button>
          <button class="checkin-btn-all-done" id="all-done-btn" style="display:none;">ALL DONE</button>
        </div>
      </div>

      <div class="checkin-body">
        <div id="worker-grid" class="worker-grid"></div>
      </div>

      <!-- Role + PIN modal -->
      <div class="checkin-backdrop" id="checkin-modal" style="display:none;">
        <div class="checkin-modal">
          <button class="checkin-modal-close" id="modal-close">&times;</button>
          <h2 class="checkin-modal-name" id="modal-worker-name"></h2>
          <p class="checkin-section-label">SELECT ROLE</p>
          <div class="checkin-role-grid" id="role-selector"></div>
          <p class="checkin-section-label">ENTER PIN</p>
          <div class="checkin-pin-display" id="pin-display">-</div>
          <div class="checkin-numpad" id="pin-numpad">
            <button data-key="1" class="ck-num">1</button>
            <button data-key="2" class="ck-num">2</button>
            <button data-key="3" class="ck-num">3</button>
            <button data-key="4" class="ck-num">4</button>
            <button data-key="5" class="ck-num">5</button>
            <button data-key="6" class="ck-num">6</button>
            <button data-key="7" class="ck-num">7</button>
            <button data-key="8" class="ck-num">8</button>
            <button data-key="9" class="ck-num">9</button>
            <button data-key="del" class="ck-del">&larr;</button>
            <button data-key="0" class="ck-num">0</button>
            <button data-key="ok" class="ck-ok">&#10003;</button>
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
  const allDoneBtn = document.getElementById('all-done-btn');
  const pinDisplay = document.getElementById('pin-display');

  const roles = [
    { id: 1, name: 'Operator' },
    { id: 2, name: 'Helper' },
    { id: 3, name: 'Trimmer' },
    { id: 4, name: 'Packer' }
  ];

  // Close modal
  document.getElementById('modal-close').onclick = () => {
    modal.style.display = 'none';
  };

  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
  };

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
      btn.className = 'checkin-role-btn';
      btn.textContent = role.name;
      btn.onclick = () => {
        roleSelector.querySelectorAll('.checkin-role-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedRole = role;
      };
      roleSelector.appendChild(btn);
    }

    pinDisplay.textContent = '-';
    modal.style.display = 'flex';
  }

  // Numpad handling
  document.getElementById('pin-numpad').querySelectorAll('button').forEach(btn => {
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
      pinDisplay.textContent = pinValue.length > 0 ? '*'.repeat(pinValue.length) : '-';
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
      pinDisplay.textContent = '-';
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

  allDoneBtn.onclick = () => {
    if (db.team.length === 0) { showToast('At least 1 person must check in', 'warning'); return; }
    window.App.navigate('station-selector');
  };

  startWorkBtn.onclick = () => {
    if (db.team.length === 0) { showToast('At least 1 person must check in', 'warning'); return; }
    window.App.navigate('station-selector');
  };
}
