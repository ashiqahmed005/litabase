// ===== Utilities =====
// Pure functions with no side effects and no dependencies.
// Safe to call from any layer.
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const Utils = {
  // "Mar 5, 2026"
  formatDate(iso) {
    if (!iso) return '';
    return dayjs(iso).format('MMM D, YYYY');
  },

  // "3 hours ago", "2 days ago"
  fromNow(iso) {
    if (!iso) return '';
    return dayjs(iso).fromNow();
  },

  exportCsv(columns, rows, filename = 'export.csv') {
    const escape = (cell) => {
      if (cell == null) return '';
      const s = String(cell);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv  = [columns.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
    const url  = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  },
};
