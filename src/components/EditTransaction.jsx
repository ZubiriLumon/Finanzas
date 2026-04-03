import { useState } from 'react';
import { getCategoryById } from '../utils/categories';
import { formatMXN, todayStr } from '../utils/format';

export default function EditTransaction({ transaction, categories, onSave, onDelete, onClose }) {
  const cat = getCategoryById(transaction.categoryId, categories);

  const [txType, setTxType]   = useState(transaction.type || (cat.type === 'income' ? 'income' : 'expense'));
  const [amount, setAmount]   = useState(String(transaction.amount));
  const [catId, setCatId]     = useState(transaction.categoryId);
  const [note, setNote]       = useState(transaction.note || '');
  const [date, setDate]       = useState(transaction.date);
  const [confirmDel, setConfirmDel] = useState(false);

  function handleSave() {
    const parsed = parseFloat(amount.replace(/,/g, ''));
    if (!parsed || parsed <= 0 || !catId) return;
    onSave(transaction.id, {
      amount: parsed,
      categoryId: catId,
      note: note.trim(),
      date,
      type: txType,
    });
    onClose();
  }

  function handleDelete() {
    onDelete(transaction.id);
    onClose();
  }

  const visibleCats = categories.filter((c) =>
    txType === 'income' ? c.type === 'income' || c.type === 'both'
                        : c.type === 'expense' || c.type === 'both'
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '20px 20px 0 0',
        width: '100%',
        maxWidth: '480px',
        margin: '0 auto',
        padding: '20px 16px 24px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        maxHeight: '90dvh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>✏️ Editar movimiento</div>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }} onClick={onClose} type="button">✕</button>
        </div>

        {/* Type toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '12px', padding: '3px', gap: '3px' }}>
          {[{ id: 'expense', label: '💸 Gasto' }, { id: 'income', label: '💰 Ingreso' }].map(({ id, label }) => (
            <button key={id} type="button" onClick={() => setTxType(id)}
              style={{
                flex: 1, border: 'none', borderRadius: '9px', padding: '9px',
                fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s',
                background: txType === id ? (id === 'income' ? 'var(--income-color)' : 'var(--expense-color)') : 'transparent',
                color: txType === id ? '#000' : 'var(--text-muted)',
              }}
            >{label}</button>
          ))}
        </div>

        {/* Amount */}
        <div>
          <div className="section-header">Monto (MXN)</div>
          <input
            className="input-field mono"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ fontSize: '1.3rem', fontWeight: 700, textAlign: 'center' }}
          />
        </div>

        {/* Date */}
        <div>
          <div className="section-header">Fecha</div>
          <input className="input-field" type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* Category */}
        <div>
          <div className="section-header">Categoría</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {visibleCats.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCatId(c.id)}
                style={{
                  background: catId === c.id ? 'var(--accent-glow)' : 'var(--bg-card)',
                  border: `2px solid ${catId === c.id ? 'var(--accent)' : 'transparent'}`,
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  color: catId === c.id ? 'var(--accent)' : 'var(--text-primary)',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  transition: 'all 0.15s',
                }}
              >
                <span>{c.emoji}</span>
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <div className="section-header">Nota</div>
          <input className="input-field" type="text" placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} />
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={handleSave}
          style={{
            background: 'var(--accent)', color: '#000', border: 'none',
            borderRadius: '14px', padding: '14px',
            fontWeight: 700, fontSize: '1rem', cursor: 'pointer', minHeight: '50px',
          }}
        >
          Guardar cambios
        </button>

        {confirmDel ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleDelete}
              style={{
                flex: 1, background: '#EF4444', color: '#fff', border: 'none',
                borderRadius: '12px', padding: '12px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              ¿Confirmar eliminación?
            </button>
            <button
              type="button"
              onClick={() => setConfirmDel(false)}
              style={{
                background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '12px', fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDel(true)}
            style={{
              background: 'transparent', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.3)',
              borderRadius: '12px', padding: '11px', fontSize: '0.88rem', cursor: 'pointer',
            }}
          >
            Eliminar movimiento
          </button>
        )}
      </div>
    </div>
  );
}
