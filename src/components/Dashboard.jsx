import { useMemo, useState } from 'react';
import { BarChart, LineChart } from './AnimatedChart';
import { formatMXN, currentMonthKey, monthLabel } from '../utils/format';
import { getCategoryById } from '../utils/categories';
import { getMonthlyInsights } from '../utils/claudeApi';

export default function Dashboard({ transactions, categories }) {
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insights, setInsights] = useState('');
  const [insightsError, setInsightsError] = useState('');

  const key = currentMonthKey();

  const monthTxns = useMemo(
    () => transactions.filter((t) => t.date.startsWith(key)),
    [transactions, key]
  );

  const { totalIncome, totalExpenses, balance, byCat, brownieIncome, brownieCosts, lineData } =
    useMemo(() => {
      let income = 0, expenses = 0;
      let brownieIncome = 0, brownieCosts = 0;
      const catMap = {};

      const sorted = [...monthTxns].sort((a, b) => a.date.localeCompare(b.date));

      sorted.forEach((t) => {
        const cat = getCategoryById(t.categoryId, categories);
        if (cat.type === 'income') {
          income += t.amount;
        } else {
          expenses += t.amount;
        }
        if (t.categoryId === 'brownies') {
          if (cat.type === 'income') brownieIncome += t.amount;
          else brownieCosts += t.amount;
        }
        catMap[t.categoryId] = (catMap[t.categoryId] || 0) + t.amount;
      });

      const byCat = Object.entries(catMap)
        .map(([id, total]) => {
          const cat = getCategoryById(id, categories);
          return { id, total, emoji: cat.emoji, name: cat.name, color: cat.color };
        })
        .sort((a, b) => b.total - a.total);

      // Running balance day-by-day
      let running = 0;
      const lineMap = {};
      sorted.forEach((t) => {
        const cat = getCategoryById(t.categoryId, categories);
        running += cat.type === 'income' ? t.amount : -t.amount;
        lineMap[t.date] = running;
      });
      const lineData = Object.entries(lineMap).map(([date, value]) => ({ date, value }));

      return { totalIncome: income, totalExpenses: expenses, balance: income - expenses, byCat, brownieIncome, brownieCosts, lineData };
    }, [monthTxns, categories]);

  async function fetchInsights() {
    const apiKey = localStorage.getItem('finanzas_claude_key');
    if (!apiKey) {
      setInsightsError('Configura tu clave de Claude en Ajustes primero.');
      return;
    }
    setLoadingInsights(true);
    setInsights('');
    setInsightsError('');
    try {
      const byCategoryList = byCat.map((c) => ({
        emoji: c.emoji,
        name: c.name,
        total: c.total,
      }));
      const text = await getMonthlyInsights(apiKey, {
        month: monthLabel(key),
        totalIncome,
        totalExpenses,
        balance,
        byCategoryList,
        brownieIncome,
        brownieCosts,
      });
      setInsights(text);
    } catch (e) {
      setInsightsError(e.message || 'Error al consultar Claude');
    } finally {
      setLoadingInsights(false);
    }
  }

  const barData = byCat.map((c) => ({
    id: c.id,
    label: c.name,
    emoji: c.emoji,
    value: c.total,
    color: c.color,
  }));

  const healthScore = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : totalExpenses > 0 ? -1 : 0;
  const healthLabel = healthScore > 0.3 ? 'Saludable' : healthScore > 0.1 ? 'Estable' : 'En alerta';
  const healthColor = healthScore > 0.3 ? 'var(--income-color)' : healthScore > 0.1 ? '#F59E0B' : '#EF4444';

  return (
    <div className="page-content" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Month + health */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mes actual</div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{monthLabel(key)}</div>
        </div>
        <div style={{ background: `${healthColor}22`, borderRadius: '20px', padding: '4px 12px', border: `1px solid ${healthColor}66` }}>
          <span style={{ color: healthColor, fontWeight: 700, fontSize: '0.82rem' }}>{healthLabel}</span>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ingresos</div>
          <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--income-color)' }}>{formatMXN(totalIncome)}</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gastos</div>
          <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--expense-color)' }}>{formatMXN(totalExpenses)}</div>
        </div>
      </div>

      {/* Balance */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Balance del mes</div>
        <div className="mono" style={{
          fontSize: '1.8rem', fontWeight: 700,
          color: balance >= 0 ? 'var(--income-color)' : '#EF4444',
        }}>
          {formatMXN(balance)}
        </div>
      </div>

      {/* Brownie P&L */}
      <div className="card">
        <div className="section-header" style={{ marginBottom: '12px' }}>🍫 Negocio — Brownies</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Ventas</div>
            <div className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--income-color)' }}>{formatMXN(brownieIncome)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Insumos</div>
            <div className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--expense-color)' }}>{formatMXN(brownieCosts)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Utilidad</div>
            <div className="mono" style={{
              fontSize: '0.9rem', fontWeight: 700,
              color: brownieIncome - brownieCosts >= 0 ? 'var(--income-color)' : '#EF4444',
            }}>
              {formatMXN(brownieIncome - brownieCosts)}
            </div>
          </div>
        </div>
      </div>

      {/* Running balance line */}
      {lineData.length > 1 && (
        <div className="card">
          <div className="section-header" style={{ marginBottom: '10px' }}>Saldo acumulado</div>
          <LineChart data={lineData} color={balance >= 0 ? 'var(--income-color)' : '#EF4444'} />
        </div>
      )}

      {/* Category breakdown */}
      {barData.length > 0 && (
        <div className="card">
          <div className="section-header" style={{ marginBottom: '12px' }}>Gastos por categoría</div>
          <BarChart data={barData} />
        </div>
      )}

      {/* Claude insights */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: insights ? '12px' : '0' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Consultar a Claude</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Análisis personalizado del mes</div>
          </div>
          <button
            style={{
              background: 'var(--accent)',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: loadingInsights ? 'not-allowed' : 'pointer',
              opacity: loadingInsights ? 0.6 : 1,
              whiteSpace: 'nowrap',
              minHeight: '40px',
            }}
            onClick={fetchInsights}
            disabled={loadingInsights}
            type="button"
          >
            {loadingInsights ? '⏳ Analizando…' : '✨ Analizar'}
          </button>
        </div>

        {insightsError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 12px', fontSize: '0.82rem', color: '#F87171', marginTop: '8px' }}>
            {insightsError}
          </div>
        )}

        {insights && (
          <div style={{ fontSize: '0.85rem', lineHeight: '1.65', color: 'var(--text-primary)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
            {insights}
          </div>
        )}
      </div>

      {monthTxns.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: '0.9rem' }}>
          Sin transacciones este mes.<br />
          <span style={{ fontSize: '1.5rem' }}>📊</span>
        </div>
      )}

      <div style={{ height: '8px' }} />
    </div>
  );
}
