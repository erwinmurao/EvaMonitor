/* Team Roster Screen */
import { api } from '../api.js';
import { db } from '../db.js';
import { showToast } from '../utils/toast.js';

export function render() {
  return `
    <div class="screen" id="screen-team-roster">
      <div class="top-bar">
        <button class="back-btn" id="roster-back">← Back</button>
        <h1>👥 Team Roster</h1>
        <div class="top-bar-actions">
          <button class="top-bar-btn" id="btn-join" style="background:var(--success);color:var(--text-dark);">👋 JOIN</button>
        </div>
      </div>
      <div id="roster-list"></div>
    </div>
  `;
}

export async function init() {
  const shiftId = db.shiftId;
  const team = db.team;
  const lineId = db.lineId;

  document.getElementById('roster-back').onclick = () => window.App.navigate('station-selector');

  const rosterList = document.getElementById('roster-list');
  rosterList.innerHTML = '';

  for (const member of team) {
    const isOnBreak = !!db.workerBreaks[member.worker_id];
    const card = document.createElement('div');
    card.style.cssText = 'display:flex;align-items:center;gap:16px;padding:16px;background:var(--bg-card);border-radius:var(--radius-sm);margin-bottom:12px;';
    card.innerHTML = `
      <div class="avatar${isOnBreak ? ' on-break' : ''}">${member.name.charAt(0)}</div>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:1.1rem;">${member.name}</div>
        <div style="color:var(--text-dim);">${member.role}</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn-${isOnBreak ? 'success' : 'warning'}" style="min-height:48px;min-width:80px;padding:8px;font-size:0.9rem;" data-action="${isOnBreak ? 'end-break' : 'break'}" data-worker="${member.worker_id}">
          ${isOnBreak ? '✅ End Break' : '☕ Break'}
        </button>
        <button class="btn-outline" style="min-height:48px;min-width:80px;padding:8px;font-size:0.9rem;" data-action="reassign" data-worker="${member.worker_id}">
          ✏️ Role
        </button>
        <button class="btn-danger" style="min-height:48px;min-width:60px;padding:8px;font-size:0.9rem;" data-action="logout" data-worker="${member.worker_id}">
          👋
        </button>
      </div>
    `;
    rosterList.appendChild(card);
  }

  // Action handlers
  rosterList.querySelectorAll('button[data-action]').forEach(btn => {
    btn.onclick = async () => {
      const action = btn.dataset.action;
      const workerId = parseInt(btn.dataset.worker);
      const member = team.find(m => m.worker_id === workerId);

      if (action === 'break') {
        try {
          const result = await api.breaks.start({
            break_type_id: 2,
            line_id: lineId,
            shift_id: shiftId,
            worker_id: workerId
          });
          db.setWorkerBreak(workerId, result.id);
          showToast(`${member.name} on break`);
          init();
        } catch (err) { showToast(err.message, 'error'); }
      } else if (action === 'end-break') {
        const breakId = db.workerBreaks[workerId];
        if (breakId) {
          try {
            await api.breaks.end(breakId);
          } catch {}
          db.clearWorkerBreak(workerId);
          showToast(`${member.name} back from break`);
          init();
        }
      } else if (action === 'reassign') {
        const newRole = prompt(`Reassign ${member.name} to:\n1=Operator, 2=Helper, 3=Trimmer, 4=Packer`);
        if (newRole) {
          const roleId = parseInt(newRole);
          const roles = { 1: 'Operator', 2: 'Helper', 3: 'Trimmer', 4: 'Packer' };
          if (roles[roleId]) {
            try {
              await api.shifts.reassign(shiftId, { worker_id: workerId, new_role_id: roleId });
              member.role = roles[roleId];
              member.role_id = roleId;
              db.team = team;
              showToast(`${member.name} reassigned to ${roles[roleId]}`);
              init();
            } catch (err) { showToast(err.message, 'error'); }
          }
        }
      } else if (action === 'logout') {
        if (confirm(`Log out ${member.name}?`)) {
          try {
            await api.shifts.logout(shiftId, workerId);
          } catch {}
          const idx = team.findIndex(m => m.worker_id === workerId);
          if (idx >= 0) team.splice(idx, 1);
          db.team = team;
          showToast(`${member.name} logged out`);
          init();
        }
      }
    };
  });

  // Join button (late arrival)
  document.getElementById('btn-join').onclick = () => {
    window.App.navigate('team-checkin');
  };
}
