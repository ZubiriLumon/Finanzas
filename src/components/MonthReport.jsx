import { useState, useMemo, useRef } from 'react';
import { formatMXN, formatDateLong, formatDateShort } from '../utils/format';
import { getCategoryById } from '../utils/categories';

/**
 * MonthReport — modal de corte de mes.
 * El usuario define fecha inicio y fecha fin, y genera un reporte
 * que puede imprimir o descargar como HTML.
 */
export default function MonthReport({ transactions, categories, onClose }) {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = today.slice(0, 7) + '-01';

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [reportGenerated, setReportGenerated] = useState(false);
  const printRef = useRef(null);

  const reportData = useMemo(() => {
    if (!reportGenerated) return null;
    const txns = transactions
      .filter((t) => t.date >= startDate && t.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));

    let income = 0, expenses = 0;
    let brownieIncome = 0, brownieCosts = 0;
    const catMap = {};

    txns.forEach((t) => {
      const cat = getCategoryById(t.categoryId, categories);
      if (cat.type === 'income') income += t.amount;
      else expenses += t.amount;

      if (t.categoryId === 'brownies') {
        if (cat.type === 'income') brownieIncome += t.amount;
        else brownieCosts += t.amount;
      }

      if (!catMap[t.categoryId]) catMap[t.categoryId] = { total: 0, cat };
      catMap[t.categoryId].total += t.amount;
    });

    const byCat = Object.entries(catMap)
      .map(([id, { total, cat }]) => ({ id, total, emoji: cat.emoji, name: cat.name, isIncome: cat.type === 'income' }))
      .sort((a, b) => b.total - a.total);

    return { txns, income, expenses, balance: income - expenses, byCat, brownieIncome, brownieCosts };
  }, [reportGenerated, startDate, endDate, transactions, categories]);

  function handlePrint() {
    window.print();
  }

  function generate() {
    setReportGenerated(true);
  }

  const periodLabel = `${formatDateLong(startDate)} — ${formatDateLong(endDate)}`;

  return (
    <>
      {/* Print styles — injected via a style tag */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-report, #print-report * { visibility: visible !important; }
          #print-report {
            position: fixed !important;
            inset: 0 !important;
            background: #fff !important;
            color: #111 !important;
            padding: 24px !important;
            font-family: Georgia, serif !important;
            font-size: 12pt !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Modal overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: '20px 20px 0 0',
            marginTop: 'auto',
            padding: '20px 16px',
            maxHeight: '92dvh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>✂️ Corte de Mes</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Define el período y genera tu reporte
              </div>
            </div>
            <button
              className="no-print"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer', padding: '4px' }}
              onClick={onClose}
              type="button"
            >
              ✕
            </button>
          </div>

          {/* Date range pickers */}
          <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
            <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Desde</span>
              <input
                type="date"
                className="input-field"
                style={{ padding: '10px 12px' }}
                value={startDate}
                max={endDate}
                onChange={(e) => { setStartDate(e.target.value); setReportGenerated(false); }}
              />
            </label>
            <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hasta</span>
              <input
                type="date"
                className="input-field"
                style={{ padding: '10px 12px' }}
                value={endDate}
                min={startDate}
                max={today}
                onChange={(e) => { setEndDate(e.target.value); setReportGenerated(false); }}
              />
            </label>
          </div>

          {/* Quick range chips */}
          <div className="no-print" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'Mes actual', fn: () => { const t = new Date(); setStartDate(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-01`); setEndDate(today); } },
              { label: 'Mes anterior', fn: () => { const t = new Date(); t.setDate(0); const end = t.toISOString().split('T')[0]; t.setDate(1); setStartDate(t.toISOString().split('T')[0]); setEndDate(end); } },
              { label: 'Últimos 30 días', fn: () => { const t = new Date(); t.setDate(t.getDate()-30); setStartDate(t.toISOString().split('T')[0]); setEndDate(today); } },
              { label: 'Últimos 3 meses', fn: () => { const t = new Date(); t.setMonth(t.getMonth()-3); setStartDate(t.toISOString().split('T')[0]); setEndDate(today); } },
            ].map(({ label, fn }) => (
              <button
                key={label}
                className="chip"
                style={{ fontSize: '0.75rem' }}
                onClick={() => { fn(); setReportGenerated(false); }}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Generate button */}
          <button
            className="no-print save-btn"
            onClick={generate}
            type="button"
          >
            📊 Generar reporte
          </button>

          {/* Report content */}
          {reportData && (
            <div
              id="print-report"
              ref={printRef}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              {/* Report header */}
              <div className="card" style={{ textAlign: 'center', padding: '18px 16px' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>🍫 Finanzas — Chris &amp; Perla</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '4px' }}>Reporte Financiero</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{periodLabel}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {reportData.txns.length} movimientos
                </div>
              </div>

              {/* Summary totals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Ingresos', value: reportData.income, color: 'var(--income-color)' },
                  { label: 'Gastos', value: reportData.expenses, color: 'var(--expense-color)' },
                  { label: 'Balance', value: reportData.balance, color: reportData.balance >= 0 ? 'var(--income-color)' : '#FF6B6B' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
                    <div className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{formatMXN(value)}</div>
                  </div>
                ))}
              </div>

              {/* Brownie P&L */}
              {(reportData.brownieIncome > 0 || reportData.brownieCosts > 0) && (
                <div className="card">
                  <div className="section-header" style={{ marginBottom: '10px' }}>🍫 Negocio — Brownies</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Ventas</div>
                      <div className="mono" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--income-color)' }}>{formatMXN(reportData.brownieIncome)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Insumos</div>
                      <div className="mono" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--expense-color)' }}>{formatMXN(reportData.brownieCosts)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Utilidad</div>
                      <div className="mono" style={{
                        fontSize: '0.88rem', fontWeight: 700,
                        color: reportData.brownieIncome - reportData.brownieCosts >= 0 ? 'var(--income-color)' : '#FF6B6B',
                      }}>
                        {formatMXN(reportData.brownieIncome - reportData.brownieCosts)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* By category */}
              <div className="card">
                <div className="section-header" style={{ marginBottom: '12px' }}>Por categoría</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reportData.byCat.map((c) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.85rem' }}>{c.emoji} {c.name}</span>
                      <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: c.isIncome ? 'var(--income-color)' : 'var(--text-primary)' }}>
                        {formatMXN(c.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full transaction list */}
              <div className="card">
                <div className="section-header" style={{ marginBottom: '12px' }}>
                  Detalle de movimientos ({reportData.txns.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {reportData.txns.map((t) => {
                    const cat = getCategoryById(t.categoryId, categories);
                    const isIncome = cat.type === 'income';
                    return (
                      <div
                        key={t.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '8px 0',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{cat.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.note || cat.name}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {formatDateShort(t.date)} · {cat.name}
                            {t.source === 'csv' ? ' · CSV' : ''}
                          </div>
                        </div>
                        <span
                          className="mono"
                          style={{
                            fontSize: '0.88rem', fontWeight: 700, flexShrink: 0,
                            color: isIncome ? 'var(--income-color)' : 'var(--text-primary)',
                          }}
                        >
                          {isIncome ? '+' : '−'}{formatMXN(t.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {reportData.txns.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
                  Sin movimientos en este período.
                </div>
              )}

              {/* Print button */}
              {reportData.txns.length > 0 && (
                <button
                  className="no-print save-btn"
                  onClick={handlePrint}
                  type="button"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                >
                  🖨️ Imprimir / Guardar como PDF
                </button>
              )}
            </div>
          )}

          <div style={{ height: '8px' }} />
        </div>
      </div>
    </>
  );
}
