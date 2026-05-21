/* Station Detail Page */
import { api } from '../api.js';
import { formatNumber, formatDate } from '../utils/format.js';

export function render() {
  return `
    <div class="page-header">
      <div>
        <h1>Station Details</h1>
        <p>View real-time station configuration and recent cycle data</p>
      </div>
    </div>

    <div class="card mb-xl">
      <div class="card-header">
        <div>
          <h3 class="card-title">Select Station</h3>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: end;">
        <div class="form-group">
          <label>Production Line</label>
          <select id="line-select" class="form-control">
            <option value="">All Lines</option>
          </select>
        </div>
        <div class="form-group">
          <label>Station</label>
          <select id="station-select" class="form-control">
            <option value="">Select station...</option>
          </select>
        </div>
      </div>
    </div>

    <div id="station-detail"></div>
  `;
}

export async function init() {
  const stations = await api.get('/stations');
  const lines = await api.get('/lines');
  
  const lineSelect = document.getElementById('line-select');
  const stationSelect = document.getElementById('station-select');
  
  // Populate line select
  for (const line of lines) {
    const option = document.createElement('option');
    option.value = line.id;
    option.textContent = line.name;
    lineSelect.appendChild(option);
  }
  
  // Populate station select
  for (const s of stations) {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = `Line ${s.line_id} - Station ${s.station_number}`;
    option.dataset.lineId = s.line_id;
    stationSelect.appendChild(option);
  }
  
  // Filter stations by line
  lineSelect.addEventListener('change', () => {
    const selectedLineId = lineSelect.value;
    Array.from(stationSelect.options).forEach(opt => {
      if (opt.value === '') {
        opt.style.display = 'block';
      } else if (selectedLineId === '') {
        opt.style.display = 'block';
      } else {
        opt.style.display = opt.dataset.lineId === selectedLineId ? 'block' : 'none';
      }
    });
    stationSelect.value = '';
  });
  
  stationSelect.addEventListener('change', () => {
    if (stationSelect.value) {
      loadStation(stationSelect.value);
    }
  });
}

async function loadStation(stationId) {
  if (!stationId) return;
  const detail = document.getElementById('station-detail');
  detail.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const station = await api.get(`/stations/${stationId}`);
    const assignments = await api.get(`/mold-assignments?station_id=${stationId}`);
    const cycles = await api.get(`/cycles?station_id=${stationId}&limit=20`);

    detail.innerHTML = `
      <div class="card mb-xl">
        <div class="card-header">
          <div>
            <h3 class="card-title">Current Configuration</h3>
            <p class="card-subtitle">Station ${station.station_number} on Line ${station.line_id}</p>
          </div>
        </div>
        <div class="grid grid-2">
          ${assignments.map(a => `
            <div style="padding: 16px; background: var(--primary-light); border-radius: 8px; border-left: 4px solid var(--primary);">
              <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Mold Slot ${a.mold_slot}</div>
              <div style="font-size: 18px; font-weight: 700; margin-bottom: 12px;">${a.mold_name || 'Not assigned'}</div>
              <div style="font-size: 13px; color: var(--text); line-height: 1.6;">
                <div><strong>Recipe:</strong> ${a.material_code || '-'} ${a.material_color || '-'} / ${a.size_label || '-'}</div>
                <div><strong>Cook Time:</strong> ${a.cooking_time_seconds || '-'}s</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Recent Cycles</h3>
            <p class="card-subtitle">${cycles.length} cycles in current shift</p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Cycle #</th>
                <th>Time</th>
                <th>Mold A</th>
                <th>Mold B</th>
                <th>Cook Time</th>
                <th>Total Good</th>
                <th>Total Bad</th>
                <th>Temp</th>
              </tr>
            </thead>
            <tbody>
              ${cycles.length > 0 ? cycles.map(c => {
                const outA = c.outputs?.find(o => o.mold_slot === 'A');
                const outB = c.outputs?.find(o => o.mold_slot === 'B');
                const totalGood = (outA?.good_pairs || 0) + (outB?.good_pairs || 0);
                const totalBad = (outA?.bad_pairs || 0) + (outB?.bad_pairs || 0);
                
                return `
                  <tr>
                    <td><strong>${c.cycle_number}</strong></td>
                    <td>${formatDate(c.cycle_done_at)}</td>
                    <td><span class="badge badge-success">${outA?.good_pairs || 0}g</span> <span class="badge badge-danger">${outA?.bad_pairs || 0}b</span></td>
                    <td><span class="badge badge-success">${outB?.good_pairs || 0}g</span> <span class="badge badge-danger">${outB?.bad_pairs || 0}b</span></td>
                    <td>${c.target_cooking_seconds || '-'}s</td>
                    <td><span class="badge badge-success">${totalGood}</span></td>
                    <td><span class="badge badge-danger">${totalBad}</span></td>
                    <td>${c.gun_temp_stage1 || '-'}°C</td>
                  </tr>
                `;
              }).join('') : '<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">No cycles recorded yet</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    detail.innerHTML = `<div class="alert alert-danger">Failed to load station data: ${err.message}</div>`;
  }
}
