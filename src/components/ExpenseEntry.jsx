import { useState, useRef, useCallback } from 'react';
import CategoryGrid from './CategoryGrid';
import { useSensoryFeedback } from '../hooks/useSensoryFeedback';
import { formatMXN, todayStr } from '../utils/format';
import { getCategoryById } from '../utils/categories';

const MAX_DIGITS = 10;

export default function ExpenseEntry({ categories, onAdd }) {
  const [digits, setDigits] = useState('');      // raw digits string, no decimal point yet
  const [centMode, setCentMode] = useState(false); // after pressing "."
  const [cents, setCents] = useState('');         // up to 2 digits after "."
  const [selectedCat, setSelectedCat] = useState('');
  const [note, setNote] = useState('');
  const [animClass, setAnimClass] = useState('');
  const [cardClass, setCardClass] = useState('');
  const [saving, setSaving] = useState(false);

  const amountRef = useRef(null);
  const cardRef = useRef(null);
  const { triggerFeedback } = useSensoryFeedback();

  const numericValue = useCallback(() => {
    const whole = digits || '0';
    const dec = centMode ? (cents || '0').padEnd(2, '0') : '00';
    return parseFloat(`${whole}.${dec}`);
  }, [digits, centMode, cents]);

  const displayStr = useCallback(() => {
    if (!digits && !centMode) return '$0';
    const whole = digits || '0';
    const formattedWhole = parseInt(whole, 10).toLocaleString('es-MX');
    if (centMode) return `$${formattedWhole}.${cents}`;
    return `$${formattedWhole}`;
  }, [digits, centMode, cents]);

  function pressDigit(d) {
    if (centMode) {
      if (cents.length < 2) setCents((prev) => prev + d);
    } else {
      if (digits.length < MAX_DIGITS) setDigits((prev) => (prev === '0' ? d : prev + d));
    }
  }

  function pressDot() {
    if (!centMode) {
      setCentMode(true);
      setCents('');
    }
  }

  function pressBackspace() {
    if (centMode) {
      if (cents.length > 0) {
        setCents((prev) => prev.slice(0, -1));
      } else {
        setCentMode(false);
      }
    } else {
      setDigits((prev) => prev.slice(0, -1));
    }
  }

  function reset() {
    setDigits('');
    setCentMode(false);
    setCents('');
    setNote('');
    setSelectedCat('');
    setAnimClass('');
    setCardClass('');
  }

  async function handleSave() {
    const amount = numericValue();
    if (!amount || !selectedCat || saving) return;

    setSaving(true);
    const cat = getCategoryById(selectedCat, categories);
    const isIncome = cat.type === 'income';

    // Trigger sounds + haptics
    triggerFeedback(isIncome);

    // Animate amount
    const animKey = isIncome ? 'anim-rise' : 'anim-fall';
    const cardKey = isIncome ? 'anim-green-glow' : 'anim-red-flash';
    setAnimClass(animKey);
    setCardClass(cardKey);

    onAdd({
      date: todayStr(),
      amount,
      categoryId: selectedCat,
      note: note.trim(),
    });

    await delay(550);
    reset();
    setSaving(false);
  }

  const amount = numericValue();
  const canSave = amount > 0 && selectedCat;

  const numpadKeys = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['.','0','⌫'],
  ];

  return (
    <div className="page-content" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Amount display */}
      <div ref={cardRef} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Monto
        </div>
        <div
          ref={amountRef}
          className={`amount-display ${animClass}`}
          onAnimationEnd={() => setAnimClass('')}
        >
          {displayStr()}
        </div>
      </div>

      {/* Numpad */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
        }}
      >
        {numpadKeys.flat().map((key) => (
          <button
            key={key}
            className="numpad-btn mono"
            type="button"
            onClick={() => {
              if (key === '⌫') pressBackspace();
              else if (key === '.') pressDot();
              else pressDigit(key);
            }}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Category grid */}
      <div>
        <div className="section-header">Categoría</div>
        <CategoryGrid
          categories={categories}
          selected={selectedCat}
          onSelect={setSelectedCat}
        />
      </div>

      {/* Note */}
      <input
        className="input-field"
        type="text"
        placeholder="Nota (opcional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={80}
      />

      {/* Save */}
      <button
        className={`save-btn ${cardClass}`}
        disabled={!canSave}
        onClick={handleSave}
        onAnimationEnd={() => setCardClass('')}
        type="button"
      >
        {saving ? 'Guardando…' : canSave
          ? `Guardar ${getCategoryById(selectedCat, categories)?.emoji || ''} ${formatMXN(amount)}`
          : 'Selecciona monto y categoría'
        }
      </button>

      {/* Spacer for scroll */}
      <div style={{ height: '8px' }} />
    </div>
  );
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }
