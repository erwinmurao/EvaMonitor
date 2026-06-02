/* Team Roster Screen */
import { api } from '../api.js';
import { db } from '../db.js';
import { showToast } from '../utils/toast.js';

export function render() {
  return `
    <div class="screen" id="screen-team-roster">
      <div class="roster-topbar">
        <button class="roster-btn-back" id="roster-back">← Back</button>
        <button class="roster-btn-join" id="btn-join">JOIN TEAM</button>
      </div>
      <div class="roster-list" id="roster-list"></div>
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
    const row = document.createElement('div');
    row.className = 'roster-row';
    row.innerHTML = `
      <div class="roster-avatar${isOnBreak ? ' on-break' : ''}">${member.name.charAt(0)}</div>
      <div class="roster-info">
        <div class="roster-name">${member.name}</div>
        <div class="roster-subtitle">${isOnBreak ? 'On break' : 'Tap to check in'}</div>
      </div>
      <div class="roster-actions">
        <button class="roster-action-btn roster-btn-break${isOnBreak ? ' active' : ''}" data-action="${isOnBreak ? 'end-break' : 'break'}" data-worker="${member.worker_id}">
          ${isOnBreak ? 'End Break' : 'Break'}
        </button>
        <button class="roster-action-btn roster-btn-role" data-action="reassign" data-worker="${member.worker_id}">
          Role
        </button>
        <button class="roster-action-btn roster-btn-logout" data-action="logout" data-worker="${member.worker_id}">
          Logout
        </button>
      </div>
    `;
    rosterList.appendChild(row);
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
