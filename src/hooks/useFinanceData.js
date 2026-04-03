import { useState, useCallback } from 'react';
import { genId, todayStr } from '../utils/format';

const STORAGE_KEY = 'finanzas_data';

function getMockTransactions() {
  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  const d1 = new Date(today); d1.setDate(today.getDate() - 1);
  const d2 = new Date(today); d2.setDate(today.getDate() - 5);
  const d3 = new Date(today); d3.setDate(today.getDate() - 7);
  const d4 = new Date(today); d4.setDate(today.getDate() - 8);
  const d5 = new Date(today); d5.setDate(today.getDate() - 12);
  return [
    { id: genId(), date: fmt(d5), amount: 12800, categoryId: 'ingresos_imss', note: 'Quincena IMSS', source: 'manual', type: 'income' },
    { id: genId(), date: fmt(d4), amount: 1200,  categoryId: 'brownies',      note: 'Venta fin de semana', source: 'manual', type: 'income' },
    { id: genId(), date: fmt(d3), amount: 850,   categoryId: 'super',         note: 'Bodega Aurrera', source: 'manual', type: 'expense' },
    { id: genId(), date: fmt(d2), amount: 320,   categoryId: 'comida',        note: 'Cena restaurante', source: 'manual', type: 'expense' },
    { id: genId(), date: fmt(d1), amount: 180,   categoryId: 'transporte',    note: 'Gasolina', source: 'manual', type: 'expense' },
  ];
}

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migrate old transactions without explicit type
        return parsed.map((t) => {
          if (!t.type) {
            // Derive type from categoryId for backwards compat
            const incomeIds = ['ingresos_imss'];
            return { ...t, type: incomeIds.includes(t.categoryId) ? 'income' : 'expense' };
          }
          return t;
        });
      }
    }
  } catch {}
  const mocks = getMockTransactions();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mocks));
  return mocks;
}

function saveTransactions(txns) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(txns));
}

export function useFinanceData() {
  const [transactions, setTransactions] = useState(loadTransactions);

  const addTransaction = useCallback((txn) => {
    const newTxn = { ...txn, id: genId(), source: txn.source || 'manual' };
    setTransactions((prev) => {
      const updated = [newTxn, ...prev];
      saveTransactions(updated);
      return updated;
    });
    return newTxn;
  }, []);

  const addTransactions = useCallback((txns) => {
    setTransactions((prev) => {
      const updated = [...txns.map((t) => ({ ...t, id: genId() })), ...prev];
      saveTransactions(updated);
      return updated;
    });
  }, []);

  const editTransaction = useCallback((id, updates) => {
    setTransactions((prev) => {
      const updated = prev.map((t) => t.id === id ? { ...t, ...updates } : t);
      saveTransactions(updated);
      return updated;
    });
  }, []);

  const deleteTransaction = useCallback((id) => {
    setTransactions((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveTransactions(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    const mocks = getMockTransactions();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mocks));
    setTransactions(mocks);
  }, []);

  return { transactions, addTransaction, addTransactions, editTransaction, deleteTransaction, clearAll };
}
