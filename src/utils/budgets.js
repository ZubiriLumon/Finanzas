const KEY = 'finanzas_budgets';

export function getBudgets() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function saveBudgets(budgets) {
  localStorage.setItem(KEY, JSON.stringify(budgets));
}

/** Percentage spent: 0–100+ */
export function budgetPct(spent, limit) {
  if (!limit || limit <= 0) return null;
  return Math.round((spent / limit) * 100);
}
