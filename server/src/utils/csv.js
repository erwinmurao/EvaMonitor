/* CSV Export Utility */

function arrayToCSV(data, headers = null) {
  if (!data || data.length === 0) return '';

  // Use provided headers or extract from first row
  const cols = headers || Object.keys(data[0]);

  // Escape CSV values
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build CSV
  const csv = [cols.map(escape).join(',')];
  for (const row of data) {
    csv.push(cols.map(col => escape(row[col])).join(','));
  }

  return csv.join('\n');
}

function sendCSV(res, filename, data, headers = null) {
  const csv = arrayToCSV(data, headers);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

module.exports = { arrayToCSV, sendCSV };
