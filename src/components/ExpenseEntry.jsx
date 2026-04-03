import { useState, useRef, useCallback } from 'react';
import CategoryGrid from './CategoryGrid';
import { useSensoryFeedback } from '../hooks/useSensoryFeedback';
import { formatMXN, todayStr } from '../utils/format';
import { getCategoryById } from '../utils/categories';

const MAX_DIGITS = 9;
const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000, 5000];

export default function ExpenseEntry({ categories, onAdd }) {
  const [txType, setTxType]     = useState('expense'); // 'expense' | 'income'
  const [digits, setDigits]     = useState('');
  const [centMode, setCentMode] = useState(false);
  const [cents, setCents]       = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [note, setNote]         = useState('');
  const [date, setDate]         = useState(todayStr());
  const [animClass, setAnimClass] = useState('');
  const [cardClass, setCardClass] = useState('');
  const [saving, setSaving]     = useState(false);

  const amountRef = useRef(null);
  const { triggerFeedback } = useSensoryFeedback();

  const numericValue = useCallback(() => {
    const whole = digits || '0';
    const dec   = centMode ? (cents || '0').padEnd(2, '0') : '00';
    return parseFloat(`${whole}.${dec}`);
  }, [digits, centMode, cents]);

  const displayStr = useCallback(() => {
    if (!digits && !centMode) return '$0';
    const n = parseInt(digits || '0', 10).toLocaleString('es-MX');
    return centMode ? `$${n}.${cents}` : `$${n}`;
  }, [digits, centMode, cents]);

  function pressDigit(d) {
    if (centMode) { if (cents.length < 2) setCents((p) => p + d); }
    else { if (digits.length < MAX_DIGITS) setDigits((p) => (p === '0' ? d : p + d)); }
  }
  function pressDot()  { if (!centMode) { setCentMode(true); setCents(''); } }
  function pressBack() {
    if (centMode) { cents.length > 0 ? setCents((p) => p.slice(0,-1)) : setCentMode(false); }
    else setDigits((p) => p.slice(0,-1));
  }
  function setQuick(v) {
    const whole = String(Math.floor(v));
    const dec   = String(v % 1 > 0 ? Math.round((v % 1)*100) : 0).padStart(2,'0');
    setDigits(whole); setCentMode(false); setCents('');
  }

  function switchType(t) {
    setTxType(t);
    // Auto-select matching category if current doesn't fit
    if (selectedCat) {
      const cat = getCategoryById(selectedCat, categories);
      const fits = t === 'income' ? cat.type === 'income' || cat.type === 'both'
                                  : cat.type === 'expense' || cat.type === 'both';
      if (!fits) setSelectedCat('');
    }
  }

  function reset() {
    setDigits(''); setCentMode(false); setCents('');
    setNote(''); setSelectedCat(''); setDate(todayStr());
    setAnimClass(''); setCardClass('');
  }

  async function handleSave() {
    const amount = numericValue();
    if (!amount || !selectedCat || saving) return;
    setSaving(true);
    const isIncome = txType === 'income';
    triggerFeedback(isIncome);
    setAnimClass(isIncome ? 'anim-rise' : 'anim-fall');
    setCardClass(isIncome ? 'anim-green-glow' : 'anim-red-flash');
    onAdd({ date, amount, categoryId: selectedCat, note: note.trim(), type: txType });
    await delay(560);
    reset();
    setSaving(false);
  }

  const amount   = numericValue();
  const canSave  = amount > 0 && selectedCat;
  const isIncome = txType === 'income';

  // Filter categories by type
  const visibleCats = categories.filter((c) =>
    isIncome ? c.type === 'income' || c.type === 'both'
             : c.type === 'expense' || c.type === 'both'
  );

  const numKeys = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];

  return (
    <div className="page-content" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Type toggle */}
      <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '14px', padding: '3px', gap: '3px' }}>
        {[
          { id: 'expense', label: '💸 Gasto', color: 'var(--expense-color)' },
          { id: 'income',  label: '💰 Ingreso', color: 'var(--income-color)' },
        ].map(({ id, label, color }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchType(id)}
            style={{
              flex: 1, border: 'none', borderRadius: '11px',
              padding: '10px',
              fontWeight: 700, fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: txType === id ? color : 'transparent',
              color: txType === id ? '#000' : 'var(--text-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Amount display */}
      <div
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '16px', textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '6px' }}>
          Monto
        </div>
        <div
          ref={amountRef}
          className={`amount-display ${animClass}`}
          style={{ color: isIncome ? 'var(--income-color)' : 'var(--text-primary)' }}
          onAnimationEnd={() => setAnimClass('')}
        >
          {displayStr()}
        </div>

        {/* Quick amounts */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginTop: '12px', paddingBottom: '2px' }}>
          {QUICK_AMOUNTS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setQuick(v)}
              style={{
                background: 'var(--bg-primary)', border: '1px solid var(--border)',
                borderRadius: '20px', padding: '4px 12px',
                fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              ${v.toLocaleString('es-MX')}
            </button>
          ))}
        </div>
      </div>

      {/* Numpad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '7px' }}>
        {numKeys.map((key) => (
          <button
            key={key}
            className="numpad-btn mono"
            type="button"
            onClick={() => {
              if (key === '⌫') pressBack();
              else if (key === '.') pressDot();
              else pressDigit(key);
            }}
            style={key === '⌫' ? { fontSize: '1.2rem' } : {}}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Category */}
      <div>
        <div className="section-header">Categoría</div>
        <CategoryGrid
          categories={visibleCats}
          selected={selectedCat}
          onSelect={setSelectedCat}
        />
      </div>

      {/* Note + date row */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          className="input-field"
          type="text"
          placeholder="Nota (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={80}
          style={{ flex: 1 }}
        />
        <input
          className="input-field"
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
          style={{ width: '130px', flexShrink: 0 }}
        />
      </div>

      {/* Save button */}
      <button
        className={`save-btn ${cardClass}`}
        disabled={!canSave}
        onClick={handleSave}
        onAnimationEnd={() => setCardClass('')}
        type="button"
        style={canSave ? { background: isIncome ? 'var(--income-color)' : 'var(--accent)' } : {}}
      >
        {saving ? 'Guardando…' : canSave
          ? `Guardar ${getCategoryById(selectedCat, categories)?.emoji || ''} ${formatMXN(amount)}`
          : 'Selecciona monto y categoría'}
      </button>

      <div style={{ height: '8px' }} />
    </div>
  );
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }
