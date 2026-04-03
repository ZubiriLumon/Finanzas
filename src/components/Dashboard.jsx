import { useMemo, useState } from 'react';
import { BarChart, LineChart } from './AnimatedChart';
import { formatMXN, monthLabel, todayStr } from '../utils/format';
import { getCategoryById } from '../utils/categories';
import { getMonthlyInsights } from '../utils/claudeApi';
import { getBudgets } from '../utils/budgets';
import MonthReport from './MonthReport';

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function addMonths(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}
function isCurrentMonth(key) {
  return key === monthKey(new Date());
}

export default function Dashboard({ transactions, categories }) {
  const [activeMonth, setActiveMonth] = useState(() => monthKey(new Date()));
  const [loadingInsights, setLoadingInsights]   = useState(false);
  const [insights, setInsights]   = useState('');
  const [insightsError, setInsightsError] = useState('');
  const [showReport, setShowReport] = useState(false);

  const prevMonth = addMonths(activeMonth, -1);

  // ── Current month data ──────────────────────────────────────────────
  const {
    totalIncome, totalExpenses, balance,
    byCat, brownieIncome, brownieCosts, lineData,
    todayExpenses,
  } = useMemo(() => {
    const monthTxns = transactions.filter((t) => t.date.startsWith(activeMonth));
    let income = 0, expenses = 0, brownieIncome = 0, brownieCosts = 0;
    const catMap = {};
    const sorted = [...monthTxns].sort((a, b) => a.date.localeCompare(b.date));

    sorted.forEach((t) => {
      if (t.type === 'income') { income += t.amount; }
      else { expenses += t.amount; }
      if (t.categoryId === 'brownies') {
        if (t.type === 'income') brownieIncome += t.amount;
        else brownieCosts += t.amount;
      }
      catMap[t.categoryId] = (catMap[t.categoryId] || 0) + t.amount;
    });

    const byCat = Object.entries(catMap)
      .map(([id, total]) => {
        const cat = getCategoryById(id, categories);
        return { id, total, emoji: cat.emoji, name: cat.name, color: cat.color, isIncome: cat.type === 'income' };
      })
      .sort((a, b) => b.total - a.total);

    // Running balance
    let running = 0;
    const lineMap = {};
    sorted.forEach((t) => {
      running += t.type === 'income' ? t.amount : -t.amount;
      lineMap[t.date] = running;
    });
    const lineData = Object.entries(lineMap).map(([date, value]) => ({ date, value }));

    // Today
    const today = todayStr();
    const todayExpenses = transactions
      .filter((t) => t.date === today && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    return { totalIncome: income, totalExpenses: expenses, balance: income - expenses, byCat, brownieIncome, brownieCosts, lineData, todayExpenses };
  }, [transactions, categories, activeMonth]);

  // ── Previous month data (for trends) ────────────────────────────────
  const { prevIncome, prevExpenses } = useMemo(() => {
    const prevTxns = transactions.filter((t) => t.date.startsWith(prevMonth));
    let pi = 0, pe = 0;
    prevTxns.forEach((t) => {
      if (t.type === 'income') pi += t.amount;
      else pe += t.amount;
    });
    return { prevIncome: pi, prevExpenses: pe };
  }, [transactions, prevMonth]);

  function trend(cur, prev) {
    if (!prev || prev === 0) return null;
    const pct = Math.round(((cur - prev) / prev) * 100);
    return pct;
  }
  const incomeTrend   = trend(totalIncome, prevIncome);
  const expensesTrend = trend(totalExpenses, prevExpenses);

  // ── Budgets ─────────────────────────────────────────────────────────
  const budgets = getBudgets();

  // ── Claude insights ──────────────────────────────────────────────────
  async function fetchInsights() {
    const apiKey = localStorage.getItem('finanzas_claude_key');
    if (!apiKey) { setInsightsError('Configura tu clave de Claude en Ajustes primero.'); return; }
    setLoadingInsights(true); setInsights(''); setInsightsError('');
    try {
      const byCategoryList = byCat.map((c) => ({ emoji: c.emoji, name: c.name, total: c.total }));
      const text = await getMonthlyInsights(apiKey, {
        month: monthLabel(activeMonth),
        totalIncome, totalExpenses, balance, byCategoryList, brownieIncome, brownieCosts,
      });
      setInsights(text);
    } catch (e) {
      setInsightsError(e.message || 'Error al consultar Claude');
    } finally {
      setLoadingInsights(false);
    }
  }

  const healthScore = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : totalExpenses > 0 ? -1 : 0;
  const healthLabel = healthScore > 0.3 ? 'Saludable 🟢' : healthScore > 0.1 ? 'Estable 🟡' : 'En alerta 🔴';
  const healthColor = healthScore > 0.3 ? 'var(--income-color)' : healthScore > 0.1 ? '#F5A623' : '#FF6B6B';

  const barData = byCat.map((c) => ({ id: c.id, label: c.name, emoji: c.emoji, value: c.total, color: c.color }));

  return (
    <>
      {showReport && (
        <MonthReport transactions={transactions} categories={categories} onClose={() => setShowReport(false)} />
      )}
      <div className="page-content"><div className="page-inner" style={{ gap: '14px' }}>

        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={() => { setActiveMonth(addMonths(activeMonth, -1)); setInsights(''); }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}
          >‹</button>

          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>{monthLabel(activeMonth)}</div>
            <div style={{ fontSize: '0.7rem', color: healthColor, fontWeight: 600 }}>{healthLabel}</div>
          </div>

          <button
            type="button"
            onClick={() => { if (!isCurrentMonth(activeMonth)) { setActiveMonth(addMonths(activeMonth, 1)); setInsights(''); } }}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px',
              color: isCurrentMonth(activeMonth) ? 'var(--border)' : 'var(--text-muted)',
              cursor: isCurrentMonth(activeMonth) ? 'default' : 'pointer', fontSize: '1rem',
            }}
          >›</button>
        </div>

        {/* Today card (only on current month) */}
        {isCurrentMonth(activeMonth) && (
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hoy gastaste</div>
              <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: todayExpenses > 0 ? 'var(--expense-color)' : 'var(--text-muted)' }}>
                {formatMXN(todayExpenses)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowReport(true)}
              style={{
                background: 'var(--bg-primary)', border: '1px solid var(--border)',
                borderRadius: '20px', padding: '6px 14px',
                fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer',
              }}
            >
              ✂️ Corte
            </button>
          </div>
        )}

        {/* Summary cards with trends */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { label: 'Ingresos', value: totalIncome, color: 'var(--income-color)', trend: incomeTrend, good: (p) => p > 0 },
            { label: 'Gastos',   value: totalExpenses, color: 'var(--expense-color)', trend: expensesTrend, good: (p) => p < 0 },
          ].map(({ label, value, color, trend: t, good }) => (
            <div key={label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{formatMXN(value)}</div>
              {t !== null && (
                <div style={{
                  fontSize: '0.65rem', marginTop: '3px', fontWeight: 600,
                  color: good(t) ? 'var(--income-color)' : '#FF6B6B',
                }}>
                  {t > 0 ? '▲' : '▼'} {Math.abs(t)}% vs mes ant.
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Balance */}
        <div className="card" style={{ textAlign: 'center', padding: '14px' }}>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Balance del mes</div>
          <div className="mono" style={{ fontSize: '2rem', fontWeight: 800, color: balance >= 0 ? 'var(--income-color)' : '#FF6B6B' }}>
            {balance >= 0 ? '+' : ''}{formatMXN(balance)}
          </div>
        </div>

        {/* Brownie P&L */}
        {(brownieIncome > 0 || brownieCosts > 0) && (
          <div className="card">
            <div className="section-header" style={{ marginBottom: '10px' }}>🍫 Brownies — P&L</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
              {[
                { label: 'Ventas',   value: brownieIncome,                color: 'var(--income-color)' },
                { label: 'Insumos',  value: brownieCosts,                 color: 'var(--expense-color)' },
                { label: 'Utilidad', value: brownieIncome - brownieCosts, color: brownieIncome - brownieCosts >= 0 ? 'var(--income-color)' : '#FF6B6B' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{label}</div>
                  <div className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color }}>{formatMXN(value)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Budget progress bars */}
        {(() => {
          const cats = byCat.filter((c) => !c.isIncome && budgets[c.id] > 0);
          if (cats.length === 0) return null;
          return (
            <div className="card">
              <div className="section-header" style={{ marginBottom: '12px' }}>🎯 Presupuesto mensual</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cats.map((c) => {
                  const limit = budgets[c.id];
                  const pct = Math.min(100, Math.round((c.total / limit) * 100));
                  const over = c.total > limit;
                  const barColor = pct > 90 ? '#FF6B6B' : pct > 70 ? '#F5A623' : 'var(--income-color)';
                  return (
                    <div key={c.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.8rem' }}>{c.emoji} {c.name}</span>
                        <span className="mono" style={{ fontSize: '0.75rem', color: over ? '#FF6B6B' : 'var(--text-muted)' }}>
                          {formatMXN(c.total)} / {formatMXN(limit)}
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '3px', background: barColor, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                      </div>
                      {over && <div style={{ fontSize: '0.65rem', color: '#FF6B6B', marginTop: '2px' }}>Presupuesto superado por {formatMXN(c.total - limit)}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Running balance line */}
        {lineData.length > 1 && (
          <div className="card">
            <div className="section-header" style={{ marginBottom: '8px' }}>Saldo acumulado</div>
            <LineChart data={lineData} color={balance >= 0 ? 'var(--income-color)' : '#FF6B6B'} />
          </div>
        )}

        {/* Category bar chart */}
        {barData.length > 0 && (
          <div className="card">
            <div className="section-header" style={{ marginBottom: '12px' }}>Por categoría</div>
            <BarChart data={barData} />
          </div>
        )}

        {/* Claude insights */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: insights ? '12px' : 0 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>✨ Consultar a Claude</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Análisis personalizado del mes</div>
            </div>
            <button
              style={{
                background: 'var(--accent)', color: '#000', border: 'none',
                borderRadius: '12px', padding: '10px 16px',
                fontWeight: 700, fontSize: '0.82rem',
                cursor: loadingInsights ? 'not-allowed' : 'pointer',
                opacity: loadingInsights ? 0.6 : 1, minHeight: '40px',
              }}
              onClick={fetchInsights}
              disabled={loadingInsights}
              type="button"
            >
              {loadingInsights ? '⏳' : 'Analizar'}
            </button>
          </div>
          {insightsError && (
            <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '10px', padding: '10px', fontSize: '0.82rem', color: '#FF8080', marginTop: '8px' }}>
              {insightsError}
            </div>
          )}
          {insights && (
            <div style={{ fontSize: '0.85rem', lineHeight: '1.65', whiteSpace: 'pre-wrap', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              {insights}
            </div>
          )}
        </div>

        {transactions.filter((t) => t.date.startsWith(activeMonth)).length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>📊</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sin movimientos en {monthLabel(activeMonth)}</div>
          </div>
        )}

        <div style={{ height: '8px' }} />
      </div></div>
    </>
  );
}
