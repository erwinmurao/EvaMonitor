/* Shift Start Screen - Landing Page with All Available Shifts */
import { api } from '../api.js';
import { db } from '../db.js';
import { showToast } from '../utils/toast.js';

let selectedLine = null;

export function render() {
  return `
    <div class="screen active" id="screen-shift-start">
      <!-- Landing Page: All Available Shifts -->
      <div id="landing-page" style="display:flex;flex-direction:column;min-height:100vh;padding:24px;">
        <div class="flex-center flex-col gap-16" style="flex:1;width:100%;max-width:1200px;margin:0 auto;">
          <h1 style="font-size:2.5rem;margin-bottom:8px;">EVA Monitor</h1>
          <p style="color:var(--text-dim);font-size:1.1rem;margin-bottom:32px;">Available Shifts</p>
          
          <!-- All Available Shifts Grid -->
          <div id="available-shifts" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;width:100%;margin-bottom:40px;"></div>

          <!-- OR Divider -->
          <div style="width:100%;text-align:center;margin:32px 0;">
            <hr style="border:none;border-top:1px solid var(--border);margin-bottom:16px;">
            <p style="color:var(--text-dim);font-size:0.9rem;text-transform:uppercase;letter-spacing:1px;">OR START NEW SHIFT</p>
            <hr style="border:none;border-top:1px solid var(--border);margin-top:16px;">
          </div>

          <!-- Start New Shift Button -->
          <button class="btn-primary" style="min-width:300px;min-height:120px;" id="select-line-btn">
            <span style="font-size:1.3rem;">+ SELECT PRODUCTION LINE</span>
          </button>
        </div>
      </div>

      <!-- Line Selection Page -->
      <div id="line-selection-page" style="display:none;min-height:100vh;padding:24px;">
        <div class="flex-center flex-col gap-24">
          <button class="btn-outline" style="position:absolute;top:24px;left:24px;min-width:80px;min-height:60px;padding:8px 16px;font-size:1rem;" id="back-btn">← BACK</button>
          
          <h1 style="font-size:2.5rem;">EVA Monitor</h1>
          <p style="color:var(--text-dim);font-size:1.1rem;">Select Production Line</p>
          
          <!-- Line Buttons -->
          <div class="flex-center gap-16 flex-wrap" id="line-selector" style="max-width:900px;"></div>
          
          <!-- Status Message -->
          <p style="color:var(--text-dim);font-size:1rem;min-height:28px;" id="shift-status"></p>
          
          <!-- Action Buttons Container -->
          <div id="action-buttons" style="display:flex;flex-direction:column;gap:12px;align-items:center;min-height:280px;"></div>
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
          card.style.cssText = `
            background: var(--bg-card);
            border-radius: var(--radius);
            padding: 24px;
            border: 2px solid var(--primary);
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            gap: 16px;
            text-align: center;
            min-height: 200px;
            justify-content: space-between;
          `;
          
          const startTime = new Date(shift.started_at);
          const now = new Date();
          const durationMinutes = Math.floor((now - startTime) / 60000);
          const durationHours = Math.floor(durationMinutes / 60);
          const durationDisplay = durationHours > 0 
            ? `${durationHours}h ${durationMinutes % 60}m running`
            : `${durationMinutes}m running`;

          card.innerHTML = `
            <div>
              <div style="font-size:1.8rem;font-weight:700;color:var(--primary);">${line.name}</div>
              <div style="font-size:0.9rem;color:var(--text-dim);margin-top:4px;">${line.num_stations} stations</div>
            </div>
            
            <div style="background:rgba(46,196,182,0.1);padding:12px;border-radius:8px;">
              <div style="font-size:1.4rem;font-weight:700;color:var(--success);">✓ Shift ${shift.shift_number}</div>
              <div style="font-size:0.9rem;color:var(--text-dim);margin-top:8px;">${durationDisplay}</div>
            </div>
            
            <button class="btn-success" style="width:100%;min-height:80px;">
              <span style="font-size:1.2rem;">✓ JOIN THIS SHIFT</span>
            </button>
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
          <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim);">
            <p style="font-size:1.2rem;margin-bottom:16px;">No active shifts available</p>
            <p style="font-size:0.9rem;">Select a production line to start a new shift</p>
          </div>
        `;
      }
    } catch (err) {
      console.error('Failed to load shifts:', err);
      availableShiftsDiv.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--danger);">
          <p>Error loading shifts</p>
        </div>
      `;
    }
  }

  // Load available shifts on init
  loadAvailableShifts();

  // Show line selection page
  selectLineBtn.onclick = () => {
    landingPage.style.display = 'none';
    lineSelectionPage.style.display = 'block';
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
        btn.className = 'btn-outline';
        btn.style.minWidth = '180px';
        btn.innerHTML = `<span style="font-size:1.4rem;">${line.name}</span><br><span style="font-size:0.85rem;">${line.num_stations} stations</span>`;
        
        btn.onclick = async () => {
          lineContainer.querySelectorAll('button').forEach(b => b.classList.remove('btn-primary'));
          btn.classList.remove('btn-outline');
          btn.classList.add('btn-primary');
          selectedLine = line;

          buttonsContainer.innerHTML = '';

          const hour = new Date().getHours();
          const suggestedShift = hour < 14 ? 1 : hour < 22 ? 2 : 3;

          try {
            const activeShifts = await api.get(`/shifts?line_id=${line.id}&active_only=1`);

            if (activeShifts && activeShifts.length > 0) {
              statusEl.innerHTML = `<span style="color:var(--success);font-weight:700;">✓ ${activeShifts.length} Active Shift${activeShifts.length > 1 ? 's' : ''}</span>`;

              for (const shift of activeShifts) {
                const joinBtn = document.createElement('button');
                joinBtn.className = 'btn-success';
                joinBtn.style.minWidth = '320px';
                joinBtn.style.minHeight = '100px';
                joinBtn.innerHTML = `<span style="font-size:1.3rem;">✓ JOIN SHIFT ${shift.shift_number}</span><br><span style="font-size:0.9rem;opacity:0.8;">Started: ${new Date(shift.started_at).toLocaleTimeString()}</span>`;
                joinBtn.onclick = () => {
                  db.lineId = line.id;
                  db.shiftId = shift.id;
                  showToast(`Joined Shift ${shift.shift_number}`);
                  window.App.navigate('team-checkin');
                };
                buttonsContainer.appendChild(joinBtn);
              }

              const startNewBtn = document.createElement('button');
              startNewBtn.className = 'btn-primary';
              startNewBtn.style.minWidth = '320px';
              startNewBtn.style.minHeight = '100px';
              startNewBtn.innerHTML = `<span style="font-size:1.3rem;">+ START NEW SHIFT</span><br><span style="font-size:0.9rem;opacity:0.8;">Shift ${suggestedShift}</span>`;
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
              startBtn.className = 'btn-primary';
              startBtn.style.minWidth = '320px';
              startBtn.style.minHeight = '120px';
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
            startBtn.className = 'btn-primary';
            startBtn.style.minWidth = '320px';
            startBtn.style.minHeight = '120px';
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
