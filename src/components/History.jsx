import { useMemo, useState } from 'react';
import { formatMXN, formatDateShort, currentMonthKey, monthLabel } from '../utils/format';
import { getCategoryById } from '../utils/categories';

export default function History({ transactions, categories, onDelete }) {
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());

  // Available months (from transactions + current)
  const months = useMemo(() => {
    const keys = new Set([currentMonthKey()]);
    transactions.forEach((t) => keys.add(t.date.slice(0, 7)));
    return [...keys].sort().reverse();
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        const matchMonth = t.date.startsWith(selectedMonth);
        const matchCat = selectedCat === 'all' || t.categoryId === selectedCat;
        return matchMonth && matchCat;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedMonth, selectedCat]);

  // Group by date
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // Total for filtered view
  const { income, expenses } = useMemo(() => {
    let income = 0, expenses = 0;
    filtered.forEach((t) => {
      const cat = getCategoryById(t.categoryId, categories);
      if (cat.type === 'income') income += t.amount;
      else expenses += t.amount;
    });
    return { income, expenses };
  }, [filtered, categories]);

  return (
    <div className="page-content" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Month selector */}
      <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
        <div style={{ display: 'flex', gap: '8px', width: 'max-content' }}>
          {months.map((m) => (
            <button
              key={m}
              className={`chip${selectedMonth === m ? ' active' : ''}`}
              onClick={() => setSelectedMonth(m)}
              type="button"
            >
              {monthLabel(m)}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
        <div style={{ display: 'flex', gap: '8px', width: 'max-content' }}>
          <button
            className={`chip${selectedCat === 'all' ? ' active' : ''}`}
            onClick={() => setSelectedCat('all')}
            type="button"
          >
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`chip${selectedCat === c.id ? ' active' : ''}`}
              onClick={() => setSelectedCat(c.id)}
              type="button"
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Summary mini */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <div className="card" style={{ flex: 1, padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ingresos</div>
          <div className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--income-color)' }}>{formatMXN(income)}</div>
        </div>
        <div className="card" style={{ flex: 1, padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gastos</div>
          <div className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--expense-color)' }}>{formatMXN(expenses)}</div>
        </div>
        <div className="card" style={{ flex: 1, padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</div>
          <div className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: income - expenses >= 0 ? 'var(--income-color)' : '#EF4444' }}>
            {formatMXN(income - expenses)}
          </div>
        </div>
      </div>

      {/* Transaction list */}
      {grouped.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 0', fontSize: '0.9rem' }}>
          Sin transacciones.<br /><span style={{ fontSize: '1.5rem' }}>📋</span>
        </div>
      ) : (
        grouped.map(([date, txns]) => (
          <div key={date}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', paddingLeft: '2px' }}>
              {formatDateShort(date)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {txns.map((t) => (
                <TransactionRow key={t.id} t={t} categories={categories} onDelete={onDelete} />
              ))}
            </div>
          </div>
        ))
      )}

      <div style={{ height: '8px' }} />
    </div>
  );
}

function TransactionRow({ t, categories, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const cat = getCategoryById(t.categoryId, categories);
  const isIncome = cat.type === 'income';

  return (
    <div
      className="card anim-fade-in"
      style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}
    >
      {/* Emoji */}
      <div style={{
        width: 40, height: 40,
        borderRadius: '10px',
        background: `${cat.color || 'var(--accent)'}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.3rem', flexShrink: 0,
      }}>
        {cat.emoji}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t.note || cat.name}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', marginTop: '2px' }}>
          <span>{cat.name}</span>
          {t.source === 'csv' && <span className="badge">CSV</span>}
        </div>
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div className="mono" style={{
          fontWeight: 700,
          fontSize: '0.95rem',
          color: isIncome ? 'var(--income-color)' : 'var(--text-primary)',
        }}>
          {isIncome ? '+' : '−'}{formatMXN(t.amount)}
        </div>
        {confirming ? (
          <button
            style={{ fontSize: '0.65rem', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => { onDelete(t.id); setConfirming(false); }}
            type="button"
          >
            ¿Eliminar?
          </button>
        ) : (
          <button
            style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => setConfirming(true)}
            type="button"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
