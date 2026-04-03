export const DEFAULT_CATEGORIES = [
  { id: 'brownies',      emoji: '🍫', name: 'Brownies',         type: 'both',    color: '#92400E' },
  { id: 'super',         emoji: '🛒', name: 'Super',            type: 'expense', color: '#1D4ED8' },
  { id: 'comida',        emoji: '🍔', name: 'Comida fuera',     type: 'expense', color: '#EA580C' },
  { id: 'transporte',    emoji: '🚌', name: 'Transporte',       type: 'expense', color: '#7C3AED' },
  { id: 'salud',         emoji: '💊', name: 'Salud',            type: 'expense', color: '#DB2777' },
  { id: 'escuela',       emoji: '📚', name: 'Escuela',          type: 'expense', color: '#0891B2' },
  { id: 'servicios',     emoji: '💡', name: 'Servicios',        type: 'expense', color: '#D97706' },
  { id: 'entretenimiento', emoji: '🎬', name: 'Entretenimiento', type: 'expense', color: '#7C3AED' },
  { id: 'ropa',          emoji: '👕', name: 'Ropa y personales', type: 'expense', color: '#0D9488' },
  { id: 'ingresos_imss', emoji: '💰', name: 'Ingresos IMSS',    type: 'income',  color: '#16A34A' },
  { id: 'casa',          emoji: '🏠', name: 'Casa',             type: 'expense', color: '#64748B' },
  { id: 'deudas',        emoji: '💳', name: 'Deudas',           type: 'expense', color: '#DC2626' },
  { id: 'otro',          emoji: '➕', name: 'Otro',             type: 'both',    color: '#475569' },
];

export function getCategories() {
  try {
    const stored = localStorage.getItem('finanzas_categories');
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_CATEGORIES;
}

export function saveCategories(cats) {
  localStorage.setItem('finanzas_categories', JSON.stringify(cats));
}

export function getCategoryById(id, cats) {
  return (cats || DEFAULT_CATEGORIES).find((c) => c.id === id) || {
    id: 'otro', emoji: '➕', name: 'Otro', type: 'both', color: '#475569',
  };
}

export function isIncomeCategory(cat) {
  return cat && (cat.type === 'income' || cat.id === 'ingresos_imss');
}
