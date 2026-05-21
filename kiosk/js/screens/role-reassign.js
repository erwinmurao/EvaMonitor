/* Role Reassignment Screen */
import { api } from '../api.js';
import { db } from '../db.js';
import { showToast } from '../utils/toast.js';

const roles = [
  { id: 1, name: 'Operator' },
  { id: 2, name: 'Helper' },
  { id: 3, name: 'Trimmer' },
  { id: 4, name: 'Packer' }
];

export function render() {
  return `
    <div class="screen" id="screen-role-reassign">
      <div class="top-bar">
        <button class="back-btn" id="reassign-back">← Back</button>
        <h1>✏️ Reassign Roles</h1>
      </div>
      <div class="alert alert-warning" style="margin-bottom:16px;padding:12px;background:rgba(255,159,28,0.1);border-left:4px solid var(--warning);border-radius:6px;font-size:0.95rem;">
        Warning: 0 operators on a line may halt production.
      </div>
      <div id="reassign-list"></div>
    </div>
  `;
}

export async function init() {
  const shiftId = db.shiftId;
  const team = db.team;

  document.getElementById('reassign-back').onclick = () => window.App.navigate('team-roster');

  const list = document.getElementById('reassign-list');
  list.innerHTML = '';

  for (const member of team) {
    const card = document.createElement('div');
    card.style.cssText = 'display:flex;align-items:center;gap:16px;padding:16px;background:var(--bg-card);border-radius:var(--radius-sm);margin-bottom:12px;';
    card.innerHTML = `
      <div class="avatar">${member.name.charAt(0)}</div>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:1.1rem;">${member.name}</div>
        <div style="color:var(--text-dim);">Current: ${member.role}</div>
      </div>
      <select class="role-reassign-select" data-worker="${member.worker_id}" style="padding:8px 12px;background:var(--bg);color:var(--text);border:2px solid var(--border);border-radius:var(--radius-sm);font-size:1rem;min-height:48px;">
        ${roles.map(r => `<option value="${r.id}" ${member.role_id === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
      </select>
    `;
    list.appendChild(card);
  }

  // Apply buttons
  list.querySelectorAll('.role-reassign-select').forEach(select => {
    select.onchange = async () => {
      const workerId = parseInt(select.dataset.worker);
      const newRoleId = parseInt(select.value);
      const member = team.find(m => m.worker_id === workerId);

      if (newRoleId === member.role_id) return;

      try {
        await api.shifts.reassign(shiftId, { worker_id: workerId, new_role_id: newRoleId });
        const newRole = roles.find(r => r.id === newRoleId);
        member.role = newRole.name;
        member.role_id = newRoleId;
        db.team = team;
        showToast(`${member.name} reassigned to ${newRole.name}`);
      } catch (err) {
        showToast(err.message, 'error');
        select.value = member.role_id;
      }
    };
  });
}
