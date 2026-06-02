/* Shift Start Screen - Landing Page with All Available Shifts */
import { api } from '../api.js';
import { db } from '../db.js';
import { showToast } from '../utils/toast.js';

let selectedLine = null;

export function render() {
  return `
    <div class="screen active" id="screen-shift-start">
      <!-- Landing Page: All Available Shifts -->
      <div id="landing-page" class="ss-landing">
        <div class="ss-landing-content">
          <h1 class="ss-main-title">Eva Monitor</h1>
          <p class="ss-subtitle">Available Shifts</p>
          
          <!-- All Available Shifts Grid -->
          <div id="available-shifts" class="ss-shifts-grid"></div>

          <!-- Divider -->
          <div class="ss-divider-section">
            <div class="ss-divider-line"></div>
            <p class="ss-divider-text">OR START NEW SHIFT!</p>
          </div>

          <!-- Start New Shift Button -->
          <button class="ss-primary-btn" id="select-line-btn">
            START NEW SHIFT
          </button>
        </div>
      </div>

      <!-- Line Selection Page -->
      <div id="line-selection-page" class="ss-line-page">
        <button class="ss-back-btn" id="back-btn">← Back</button>
        <div class="ss-line-content">
          <h1 class="ss-main-title">Eva Monitor</h1>
          <p class="ss-subtitle">Select Production Line</p>
          
          <!-- Line Buttons -->
          <div class="ss-line-selector" id="line-selector"></div>
          
          <!-- Status Message -->
          <p class="ss-status" id="shift-status"></p>
          
          <!-- Action Buttons Container -->
          <div id="action-buttons" class="ss-action-buttons"></div>
        </div>
      </div>
    </div>
  `;
}

export function init() {
  const landingPage = document.getElementById('landing-page');
  const lineSelectionPage = document.getElementById('line-selection-page');
  const availableShiftsDiv = document.getElementById('available-shifts');
  const selectLineBtn = document.getElementById('select-line-btn');
  const backBtn = document.getElementById('back-btn');
  
  const lineContainer = document.getElementById('line-selector');
  const statusEl = document.getElementById('shift-status');
  const buttonsContainer = document.getElementById('action-buttons');

  // Load all available shifts for landing page
  async function loadAvailableShifts() {
    try {
      const lines = await api.get('/lines');
      availableShiftsDiv.innerHTML = '';
      let totalShifts = 0;
      const allShifts = [];

      // Collect all active shifts from all lines
      for (const line of lines) {
        const shifts = await api.get(`/shifts?line_id=${line.id}&active_only=1`);
        if (shifts && shifts.length > 0) {
          for (const shift of shifts) {
            totalShifts++;
            allShifts.push({ line, shift });
          }
        }
      }

      // Display all shifts
      if (totalShifts > 0) {
        allShifts.forEach(({ line, shift }) => {
          const card = document.createElement('div');
          card.className = 'ss-shift-card';
          
          const startTime = new Date(shift.started_at);
          const now = new Date();
          const durationMinutes = Math.floor((now - startTime) / 60000);
          const durationHours = Math.floor(durationMinutes / 60);
          const durationDisplay = durationHours > 0 
            ? `${durationHours}h ${durationMinutes % 60}m running`
            : `${durationMinutes}m running`;

          card.innerHTML = `
            <div class="ss-shift-card-header">
              <div class="ss-shift-card-name">${line.name}</div>
              <div class="ss-shift-card-stations">${line.num_stations} stations</div>
            </div>
            <div class="ss-shift-card-shift">
              <div class="ss-shift-card-shift-num">Shift ${shift.shift_number}</div>
              <div class="ss-shift-card-duration">${durationDisplay}</div>
            </div>
            <button class="ss-join-btn">JOIN PRODUCTION LINE</button>
          `;

          card.querySelector('button').onclick = () => {
            db.lineId = line.id;
            db.shiftId = shift.id;
            showToast(`Joined ${line.name} - Shift ${shift.shift_number}`);
            window.App.navigate('team-checkin');
          };

          availableShiftsDiv.appendChild(card);
        });
      } else {
        availableShiftsDiv.innerHTML = `
          <div class="ss-empty-state">
            <p class="ss-empty-text">No Shift Available</p>
          </div>
        `;
      }
    } catch (err) {
      console.error('Failed to load shifts:', err);
      availableShiftsDiv.innerHTML = `
        <div class="ss-empty-state">
          <p class="ss-empty-text" style="color:var(--danger);">Error loading shifts</p>
        </div>
      `;
    }
  }

  // Load available shifts on init
  loadAvailableShifts();

  // Show line selection page
  selectLineBtn.onclick = () => {
    landingPage.style.display = 'none';
    lineSelectionPage.style.display = 'flex';
    loadLineSelection();
  };

  // Back to landing page
  backBtn.onclick = () => {
    lineSelectionPage.style.display = 'none';
    landingPage.style.display = 'flex';
    loadAvailableShifts();
  };

  // Load line selection
  async function loadLineSelection() {
    try {
      const lines = await api.get('/lines');
      lineContainer.innerHTML = '';

      for (const line of lines) {
        const btn = document.createElement('button');
        btn.className = 'ss-line-btn';
        btn.innerHTML = `<span class="ss-line-btn-name">${line.name}</span><span class="ss-line-btn-stations">${line.num_stations} stations</span>`;
        
        btn.onclick = async () => {
          lineContainer.querySelectorAll('button').forEach(b => b.classList.remove('ss-line-btn-active'));
          btn.classList.add('ss-line-btn-active');
          selectedLine = line;

          buttonsContainer.innerHTML = '';

          const hour = new Date().getHours();
          const suggestedShift = hour < 14 ? 1 : hour < 22 ? 2 : 3;

          try {
            const activeShifts = await api.get(`/shifts?line_id=${line.id}&active_only=1`);

            if (activeShifts && activeShifts.length > 0) {
              statusEl.innerHTML = `<span class="ss-status-active">${activeShifts.length} Active Shift${activeShifts.length > 1 ? 's' : ''}</span>`;

              for (const shift of activeShifts) {
                const joinBtn = document.createElement('button');
                joinBtn.className = 'ss-action-btn ss-action-join';
                joinBtn.innerHTML = `JOIN SHIFT ${shift.shift_number}<br><span class="ss-action-sub">Started: ${new Date(shift.started_at).toLocaleTimeString()}</span>`;
                joinBtn.onclick = () => {
                  db.lineId = line.id;
                  db.shiftId = shift.id;
                  showToast(`Joined Shift ${shift.shift_number}`);
                  window.App.navigate('team-checkin');
                };
                buttonsContainer.appendChild(joinBtn);
              }

              const startNewBtn = document.createElement('button');
              startNewBtn.className = 'ss-action-btn ss-action-new';
              startNewBtn.innerHTML = `START NEW SHIFT<br><span class="ss-action-sub">Shift ${suggestedShift}</span>`;
              startNewBtn.onclick = async () => {
                const today = new Date().toISOString().split('T')[0];
                try {
                  const shift = await api.shifts.start({
                    line_id: line.id,
                    shift_date: today,
                    shift_number: suggestedShift
                  });
                  db.lineId = line.id;
                  db.shiftId = shift.id;
                  showToast(`Shift ${suggestedShift} started`);
                  window.App.navigate('team-checkin');
                } catch (err) {
                  showToast(err.message, 'error');
                }
              };
              buttonsContainer.appendChild(startNewBtn);
            } else {
              statusEl.textContent = `Detected: Shift ${suggestedShift}`;

              const startBtn = document.createElement('button');
              startBtn.className = 'ss-action-btn ss-action-start';
              startBtn.textContent = 'START SHIFT';
              startBtn.onclick = async () => {
                const today = new Date().toISOString().split('T')[0];
                try {
                  const shift = await api.shifts.start({
                    line_id: line.id,
                    shift_date: today,
                    shift_number: suggestedShift
                  });
                  db.lineId = line.id;
                  db.shiftId = shift.id;
                  showToast(`Shift ${suggestedShift} started`);
                  window.App.navigate('team-checkin');
                } catch (err) {
                  showToast(err.message, 'error');
                }
              };
              buttonsContainer.appendChild(startBtn);
            }
          } catch (err) {
            statusEl.textContent = `Error loading shifts`;
            const startBtn = document.createElement('button');
            startBtn.className = 'ss-action-btn ss-action-start';
            startBtn.textContent = 'START SHIFT';
            startBtn.onclick = async () => {
              const today = new Date().toISOString().split('T')[0];
              try {
                const shift = await api.shifts.start({
                  line_id: line.id,
                  shift_date: today,
                  shift_number: suggestedShift
                });
                db.lineId = line.id;
                db.shiftId = shift.id;
                showToast(`Shift ${suggestedShift} started`);
                window.App.navigate('team-checkin');
              } catch (err) {
                showToast(err.message, 'error');
              }
            };
            buttonsContainer.appendChild(startBtn);
          }
        };

        lineContainer.appendChild(btn);
      }
    } catch (err) {
      statusEl.textContent = 'Failed to load lines';
    }
  }
}
