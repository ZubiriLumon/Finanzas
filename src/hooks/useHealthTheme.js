import { useEffect, useMemo } from 'react';
import { currentMonthKey } from '../utils/format';
import { getCategoryById } from '../utils/categories';

export function useHealthTheme(transactions, categories) {
  const { score, theme, totalIncome, totalExpenses } = useMemo(() => {
    const key = currentMonthKey();
    const monthTxns = transactions.filter((t) => t.date.startsWith(key));

    let income = 0;
    let expenses = 0;
    monthTxns.forEach((t) => {
      const cat = getCategoryById(t.categoryId, categories);
      if (cat.type === 'income') {
        income += t.amount;
      } else {
        expenses += t.amount;
      }
    });

    const score = income > 0 ? (income - expenses) / income : expenses > 0 ? -1 : 0;

    let theme = 'healthy';
    if (score < 0.1) theme = 'stressed';
    else if (score < 0.3) theme = 'okay';

    return { score, theme, totalIncome: income, totalExpenses: expenses };
  }, [transactions, categories]);

  useEffect(() => {
    const themeMap = { healthy: '', okay: 'okay', stressed: 'stressed' };
    document.documentElement.setAttribute('data-theme', themeMap[theme]);
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'stressed' ? '#120E0E' : theme === 'okay' ? '#111008' : '#0E0F14'
    );
  }, [theme]);

  // Health bar width as a percentage (clamped)
  const barWidth = Math.max(5, Math.min(100, Math.round(Math.max(0, score) * 100)));

  return { score, theme, barWidth, totalIncome, totalExpenses };
}
