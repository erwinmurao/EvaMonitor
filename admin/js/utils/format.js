/* Format utilities */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

function formatDuration(seconds) {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatKg(kg) {
  return kg != null ? `${Number(kg).toFixed(1)} kg` : '-';
}

function formatCurrency(amount) {
  return amount != null ? `$${Number(amount).toFixed(2)}` : '-';
}

function formatPercent(value) {
  return value != null ? `${Number(value).toFixed(1)}%` : '-';
}

function formatNumber(n) {
  return n != null ? Number(n).toLocaleString() : '-';
}

export { formatDate, formatDuration, formatKg, formatCurrency, formatPercent, formatNumber };
