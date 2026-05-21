/* EVA Inventory Page */
import { api } from '../api.js';
import { formatKg, formatNumber, formatCurrency } from '../utils/format.js';

export function render() {
  return `
    <div class="page-header"><h1>EVA Inventory</h1><button class="btn btn-primary" id="btn-replenish">+ Replenish</button></div>
    <div class="kpi-row" id="inv-kpis"></div>
    <div class="card"><h3>Stock Levels</h3><table class="data-table" id="inv-table">
      <thead><tr><th>Code</th><th>Color</th><th>Size</th><th>Location</th><th>Current (kg)</th><th>Sacks</th><th>Status</th><th>Value</th></tr></thead><tbody></tbody></table></div>
    <div class="card"><h3>Capacity Planning</h3><table class="data-table" id="capacity-table">
      <thead><tr><th>Recipe</th><th>Material</th><th>Small Avail</th><th>Big Avail</th><th>Max Pairs</th></tr></thead><tbody></tbody></table></div>
  `;
}

export async function init() {
  try {
    const [summary, inventory, capacity] = await Promise.all([
      api.get('/material-inventory/summary'),
      api.get('/material-inventory'),
      api.get('/material-inventory/capacity')
    ]);

    // KPIs
    const totalKg = summary.reduce((s, m) => s + (m.total_kg || 0), 0);
    const totalValue = summary.reduce((s, m) => s + (m.total_value || 0), 0);
    const lowCount = summary.filter(m => m.stock_status === 'low' || m.stock_status === 'critical').length;

    document.getElementById('inv-kpis').innerHTML = `
      <div class="kpi-card"><div class="kpi-value">${formatKg(totalKg)}</div><div class="kpi-label">Total Stock</div></div>
      <div class="kpi-card"><div class="kpi-value">${formatCurrency(totalValue)}</div><div class="kpi-label">Inventory Value</div></div>
      <div class="kpi-card"><div class="kpi-value" style="color:${lowCount > 0 ? 'var(--danger)' : 'var(--success)'}">${lowCount}</div><div class="kpi-label">Low Stock Alerts</div></div>
    `;

    // Inventory table
    const tbody = document.querySelector('#inv-table tbody');
    tbody.innerHTML = inventory.map(i => {
      const statusClass = i.current_kg <= 25 ? 'badge-danger' : i.current_kg <= 100 ? 'badge-warning' : 'badge-success';
      const statusText = i.current_kg <= 25 ? 'Critical' : i.current_kg <= 100 ? 'Low' : 'OK';
      return `<tr>
        <td>${i.code}</td><td>${i.color}</td><td>${i.size_type}</td><td>${i.location}</td>
        <td><strong>${formatKg(i.current_kg)}</strong></td><td>${i.current_sacks}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td><td>${formatCurrency(i.inventory_value)}</td>
      </tr>`;
    }).join('');

    // Capacity table
    const capBody = document.querySelector('#capacity-table tbody');
    capBody.innerHTML = capacity.map(c => `<tr>
      <td>Mold #${c.mold_id} / ${c.size_label}</td><td>${c.material_code} ${c.material_color}</td>
      <td>${formatKg(c.small_available_kg)}</td><td>${formatKg(c.big_available_kg)}</td>
      <td><strong>${c.max_pairs != null ? formatNumber(c.max_pairs) : '∞'}</strong></td>
    </tr>`).join('');

    // Replenish button
    document.getElementById('btn-replenish').onclick = () => {
      const materialId = prompt('Material ID:');
      const kg = prompt('Kilograms to add:');
      const location = prompt('Location:', 'Warehouse A');
      if (materialId && kg) {
        api.post('/material-inventory/replenish', { material_id: parseInt(materialId), kg: parseFloat(kg), location, sacks: Math.ceil(parseFloat(kg) / 25) })
          .then(() => { alert('Replenished!'); init(); })
          .catch(err => alert(err.message));
      }
    };
  } catch (err) {
    document.getElementById('inv-kpis').innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}
