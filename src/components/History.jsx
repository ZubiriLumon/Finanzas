import { useMemo, useState } from 'react';
import { formatMXN, formatDateShort, currentMonthKey, monthLabel, todayStr } from '../utils/format';
import { getCategoryById } from '../utils/categories';
import EditTransaction from './EditTransaction';

export default function History({ transactions, categories, onDelete, onEdit }) {
  const [selectedCat, setSelectedCat]   = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [search, setSearch]             = useState('');
  const [showSearch, setShowSearch]     = useState(false);
  const [editingTxn, setEditingTxn]     = useState(null);

  const months = useMemo(() => {
    const keys = new Set([currentMonthKey()]);
    transactions.forEach((t) => keys.add(t.date.slice(0, 7)));
    return [...keys].sort().reverse();
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter((t) => {
        const matchMonth = t.date.startsWith(selectedMonth);
        const matchCat   = selectedCat === 'all' || t.categoryId === selectedCat;
        const matchSearch = !q || (t.note || '').toLowerCase().includes(q)
          || getCategoryById(t.categoryId, categories).name.toLowerCase().includes(q);
        return matchMonth && matchCat && matchSearch;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [transactions, selectedMonth, selectedCat, search, categories]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const { income, expenses } = useMemo(() => {
    let inc = 0, exp = 0;
    filtered.forEach((t) => { t.type === 'income' ? (inc += t.amount) : (exp += t.amount); });
    return { income: inc, expenses: exp };
  }, [filtered]);

  function exportCSV() {
    const header = 'Fecha,Categoría,Nota,Tipo,Monto';
    const rows = filtered.map((t) => {
      const cat = getCategoryById(t.categoryId, categories);
      return `${t.date},"${cat.name}","${(t.note || '').replace(/"/g, '""')}",${t.type === 'income' ? 'Ingreso' : 'Gasto'},${t.amount.toFixed(2)}`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `finanzas_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function dateLabel(d) {
    const today = todayStr();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    if (d === today) return 'Hoy';
    if (d === yStr)  return 'Ayer';
    return formatDateShort(d);
  }

  return (
    <>
      {editingTxn && (
        <EditTransaction
          transaction={editingTxn}
          categories={categories}
          onSave={onEdit}
          onDelete={onDelete}
          onClose={() => setEditingTxn(null)}
        />
      )}

      <div className="page-content" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Month chips */}
        <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
          <div style={{ display: 'flex', gap: '8px', width: 'max-content' }}>
            {months.map((m) => (
              <button key={m} className={`chip${selectedMonth === m ? ' active' : ''}`} onClick={() => setSelectedMonth(m)} type="button">
                {monthLabel(m)}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar + export button */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {showSearch ? (
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                className="input-field"
                type="text"
                placeholder="Buscar por nota o categoría…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                style={{ paddingRight: '36px' }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                >✕</button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="chip"
              style={{ fontSize: '0.85rem' }}
            >
              🔍 Buscar
            </button>
          )}
          <button
            type="button"
            onClick={exportCSV}
            className="chip"
            style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}
          >
            ↓ CSV
          </button>
        </div>

        {/* Category filter */}
        <div style={{ overflowX: 'auto', paddingBottom: '2px' }}>
          <div style={{ display: 'flex', gap: '6px', width: 'max-content' }}>
            <button className={`chip${selectedCat === 'all' ? ' active' : ''}`} onClick={() => setSelectedCat('all')} type="button">Todas</button>
            {categories.map((c) => (
              <button key={c.id} className={`chip${selectedCat === c.id ? ' active' : ''}`} onClick={() => setSelectedCat(c.id)} type="button">
                {c.emoji} {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Mini summary */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: 'Ingresos',  value: income,            color: 'var(--income-color)' },
            { label: 'Gastos',    value: expenses,           color: 'var(--expense-color)' },
            { label: 'Balance',   value: income - expenses,  color: income - expenses >= 0 ? 'var(--income-color)' : '#FF6B6B' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ flex: 1, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
              <div className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{formatMXN(value)}</div>
            </div>
          ))}
        </div>

        {/* Transactions grouped by date */}
        {grouped.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📋</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {search ? `Sin resultados para "${search}"` : 'Sin movimientos'}
            </div>
          </div>
        ) : (
          grouped.map(([date, txns]) => (
            <div key={date}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', paddingLeft: '2px' }}>
                {dateLabel(date)}
                <span style={{ marginLeft: '6px', opacity: 0.6 }}>
                  {formatMXN(txns.reduce((s, t) => s + (t.type === 'expense' ? t.amount : 0), 0))} gastos
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {txns.map((t) => (
                  <TxnRow
                    key={t.id}
                    t={t}
                    categories={categories}
                    onEdit={() => setEditingTxn(t)}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        <div style={{ height: '8px' }} />
      </div>
    </>
  );
}

function TxnRow({ t, categories, onEdit }) {
  const cat      = getCategoryById(t.categoryId, categories);
  const isIncome = t.type === 'income';

  return (
    <div
      className="card anim-fade-in"
      style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
      onClick={onEdit}
    >
      <div style={{
        width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
        background: `${cat.color || '#475569'}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
      }}>
        {cat.emoji}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t.note || cat.name}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
          <span>{cat.name}</span>
          {t.source === 'csv' && <span className="badge">CSV</span>}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div className="mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: isIncome ? 'var(--income-color)' : 'var(--text-primary)' }}>
          {isIncome ? '+' : '−'}{formatMXN(t.amount)}
        </div>
        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '1px' }}>
          Toca para editar
        </div>
      </div>
    </div>
  );
}
