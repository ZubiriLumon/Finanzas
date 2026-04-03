/**
 * Format number as MXN currency.
 * e.g. 1234.5 → "$1,234.50"
 */
export function formatMXN(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date string (YYYY-MM-DD) as "3 de abril de 2026"
 */
export function formatDateLong(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Format date string as short "3 abr"
 */
export function formatDateShort(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}

/**
 * Get current month key "2026-04"
 */
export function currentMonthKey() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get month label "Abril 2026"
 */
export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Generate unique id
 */
export function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Get YYYY-MM-DD for today
 */
export function todayStr() {
  return new Date().toISOString().split('T')[0];
}
