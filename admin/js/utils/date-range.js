/* Date Range utility */
function getDateRange() {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  return {
    startDate: weekAgo.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0]
  };
}

function createDateRangePicker(container, onChange) {
  const { startDate, endDate } = getDateRange();
  container.innerHTML = `
    <input type="date" id="dr-start" value="${startDate}" style="padding:6px 12px;border:1px solid var(--border);border-radius:6px;font-size:0.9rem;">
    <span>to</span>
    <input type="date" id="dr-end" value="${endDate}" style="padding:6px 12px;border:1px solid var(--border);border-radius:6px;font-size:0.9rem;">
    <button class="btn btn-primary btn-sm" id="dr-apply">Apply</button>
  `;
  container.querySelector('#dr-apply').onclick = () => {
    onChange(container.querySelector('#dr-start').value, container.querySelector('#dr-end').value);
  };
}

export { getDateRange, createDateRangePicker };
