import { useState, useEffect, useCallback } from 'react';
import ExpenseEntry from './components/ExpenseEntry';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Settings from './components/Settings';
import { useFinanceData } from './hooks/useFinanceData';
import { useHealthTheme } from './hooks/useHealthTheme';
import { getCategories, saveCategories } from './utils/categories';
import { unlockAudio } from './hooks/useSensoryFeedback';
import { getCategoryById } from './utils/categories';
import { formatMXN } from './utils/format';

const TABS = [
  { id: 'entry',     icon: '➕', label: 'Registrar' },
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'history',   icon: '📋', label: 'Historial' },
  { id: 'settings',  icon: '⚙️',  label: 'Ajustes' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('entry');
  const [categories, setCategories] = useState(getCategories);
  const [toast, setToast] = useState(null); // { msg, isIncome }
  const { transactions, addTransaction, addTransactions, editTransaction, deleteTransaction } = useFinanceData();
  const { barWidth } = useHealthTheme(transactions, categories);

  // Desbloquear Web Audio API en el primer toque del usuario (requerido en iOS Safari)
  useEffect(() => {
    const handler = () => { unlockAudio(); };
    document.addEventListener('touchstart', handler, { once: true, passive: true });
    document.addEventListener('mousedown',  handler, { once: true });
    return () => {
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('mousedown',  handler);
    };
  }, []);

  const showToast = useCallback((txn) => {
    const cat = getCategoryById(txn.categoryId, categories);
    const isIncome = txn.type === 'income';
    const msg = `${cat.emoji} ${isIncome ? '+' : '−'}${formatMXN(txn.amount)} registrado`;
    setToast({ msg, isIncome });
    setTimeout(() => setToast(null), 2200);
  }, [categories]);

  function handleAdd(txnData) {
    const saved = addTransaction(txnData);
    showToast({ ...txnData, ...saved });
  }

  function handleImport(txns) {
    addTransactions(txns);
    setActiveTab('history');
  }

  function handleCategoriesChange(cats) {
    setCategories(cats);
    saveCategories(cats);
  }

  return (
    <>
      {/* Health bar */}
      <div style={{ height: '3px', background: 'var(--border)', flexShrink: 0 }}>
        <div className="health-bar-fill" style={{ width: `${barWidth}%` }} />
      </div>

      {/* Header */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 16px 9px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
          🍫 Finanzas
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Chris &amp; Perla</div>
      </div>

      {/* Toast de confirmación */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 300,
          background: toast.isIncome ? 'var(--income-color)' : 'var(--bg-card)',
          color: toast.isIncome ? '#000' : 'var(--text-primary)',
          border: toast.isIncome ? 'none' : '1px solid var(--border)',
          borderRadius: '24px',
          padding: '10px 20px',
          fontWeight: 700,
          fontSize: '0.9rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
          animation: 'toastIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards',
          pointerEvents: 'none',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Page area */}
      <div className="page-area">
        {activeTab === 'entry' && (
          <ExpenseEntry key="entry" categories={categories} onAdd={handleAdd} />
        )}
        {activeTab === 'dashboard' && (
          <Dashboard key="dashboard" transactions={transactions} categories={categories} />
        )}
        {activeTab === 'history' && (
          <History
            key="history"
            transactions={transactions}
            categories={categories}
            onDelete={deleteTransaction}
            onEdit={editTransaction}
          />
        )}
        {activeTab === 'settings' && (
          <Settings
            key="settings"
            categories={categories}
            setCategories={handleCategoriesChange}
            onImportTransactions={handleImport}
          />
        )}
      </div>

      {/* Floating add button (on non-entry tabs) */}
      {activeTab !== 'entry' && (
        <button
          type="button"
          onClick={() => setActiveTab('entry')}
          style={{
            position: 'fixed',
            bottom: '72px', right: '20px',
            width: '52px', height: '52px',
            borderRadius: '50%',
            background: 'var(--accent)',
            color: '#000',
            border: 'none',
            fontSize: '1.6rem',
            cursor: 'pointer',
            boxShadow: '0 4px 24px var(--accent-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50,
          }}
        >
          +
        </button>
      )}

      {/* Bottom tab bar */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
