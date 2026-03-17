/**
 * Export data to CSV file and trigger download
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the exported file (without extension)
 * @param {Array} columns - Optional array of column configs: { key: string, label: string }
 */
export function exportToCSV(data, filename, columns = null) {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Determine columns from first item if not provided
  const cols = columns || Object.keys(data[0]).map(key => ({ key, label: key }));
  
  // Create header row
  const headers = cols.map(col => `"${col.label}"`).join(',');
  
  // Create data rows
  const rows = data.map(item => {
    return cols.map(col => {
      let value = item[col.key];
      
      // Handle nested values
      if (col.key.includes('.')) {
        const keys = col.key.split('.');
        value = keys.reduce((obj, k) => obj?.[k], item);
      }
      
      // Handle arrays
      if (Array.isArray(value)) {
        value = value.join('; ');
      }
      
      // Handle objects
      if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Escape quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });
  
  // Combine header and rows
  const csv = [headers, ...rows].join('\n');
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatLastUpdated(date) {
  if (!date) return '';
  
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffSecs < 60) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
