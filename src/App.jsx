import { useState } from 'react';
import ExpenseEntry from './components/ExpenseEntry';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Settings from './components/Settings';
import { useFinanceData } from './hooks/useFinanceData';
import { useHealthTheme } from './hooks/useHealthTheme';
import { getCategories, saveCategories } from './utils/categories';

const TABS = [
  { id: 'entry',     icon: '➕', label: 'Registrar' },
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'history',   icon: '📋', label: 'Historial' },
  { id: 'settings',  icon: '⚙️',  label: 'Ajustes' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('entry');
  const [categories, setCategories] = useState(getCategories);
  const { transactions, addTransaction, addTransactions, editTransaction, deleteTransaction } = useFinanceData();
  const { barWidth } = useHealthTheme(transactions, categories);

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

      {/* Page area */}
      <div className="page-area">
        {activeTab === 'entry' && (
          <ExpenseEntry key="entry" categories={categories} onAdd={addTransaction} />
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
            bottom: '72px',
            right: '20px',
            width: '52px', height: '52px',
            borderRadius: '50%',
            background: 'var(--accent)',
            color: '#000',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            boxShadow: '0 4px 20px var(--accent-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
          onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
