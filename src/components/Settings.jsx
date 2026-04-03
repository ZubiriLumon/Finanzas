import { useState, useRef } from 'react';
import { parseCSV } from '../utils/csvParser';
import { categorizeTxns } from '../utils/claudeApi';
import { getCategoryById, DEFAULT_CATEGORIES, saveCategories } from '../utils/categories';
import { formatMXN, genId, todayStr } from '../utils/format';

export default function Settings({ categories, setCategories, onImportTransactions }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('finanzas_claude_key') || '');
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [csvRows, setCsvRows] = useState(null);
  const [csvError, setCsvError] = useState('');
  const [categorizing, setCategorizing] = useState(false);
  const [reviewRows, setReviewRows] = useState(null);
  const [importing, setImporting] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmoji, setAddEmoji] = useState('');
  const fileRef = useRef(null);

  function saveApiKey() {
    localStorage.setItem('finanzas_claude_key', apiKey.trim());
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  }

  async function handleCSVFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError('');
    setCsvRows(null);
    setReviewRows(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      setCsvRows(rows);
    } catch (err) {
      setCsvError(err.message);
    }
    e.target.value = '';
  }

  async function handleAutoCateg() {
    const key = localStorage.getItem('finanzas_claude_key');
    if (!key) { setCsvError('Configura tu clave de Claude primero.'); return; }
    if (!csvRows) return;
    setCategorizing(true);
    try {
      const results = await categorizeTxns(key, csvRows, categories);
      const review = csvRows.map((row, i) => ({
        ...row,
        categoryId: results[i]?.categoryId || 'otro',
        confidence: results[i]?.confidence || 0,
        rowId: genId(),
      }));
      setReviewRows(review);
    } catch (err) {
      setCsvError(err.message || 'Error al categorizar');
    } finally {
      setCategorizing(false);
    }
  }

  function manualCateg() {
    if (!csvRows) return;
    const review = csvRows.map((row) => ({
      ...row,
      categoryId: 'otro',
      confidence: null,
      rowId: genId(),
    }));
    setReviewRows(review);
  }

  function updateReviewCat(rowId, catId) {
    setReviewRows((prev) => prev.map((r) => r.rowId === rowId ? { ...r, categoryId: catId } : r));
  }

  function removeReviewRow(rowId) {
    setReviewRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  function confirmImport() {
    if (!reviewRows) return;
    setImporting(true);
    const txns = reviewRows.map((r) => ({
      id: genId(),
      date: r.date || todayStr(),
      amount: r.amount,
      categoryId: r.categoryId,
      note: r.description,
      source: 'csv',
    }));
    onImportTransactions(txns);
    setCsvRows(null);
    setReviewRows(null);
    setImporting(false);
  }

  // Category management
  function startEdit(cat) {
    setEditingCat(cat.id);
    setNewCatName(cat.name);
    setNewCatEmoji(cat.emoji);
  }
  function saveEdit(id) {
    const updated = categories.map((c) =>
      c.id === id ? { ...c, name: newCatName.trim() || c.name, emoji: newCatEmoji.trim() || c.emoji } : c
    );
    setCategories(updated);
    saveCategories(updated);
    setEditingCat(null);
  }
  function deleteCat(id) {
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    saveCategories(updated);
  }
  function addCat() {
    if (!addName.trim()) return;
    const newCat = {
      id: `cat_${Date.now()}`,
      emoji: addEmoji.trim() || '📌',
      name: addName.trim(),
      type: 'both',
      color: '#475569',
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    saveCategories(updated);
    setAddName('');
    setAddEmoji('');
    setShowAddCat(false);
  }
  function resetCategories() {
    setCategories(DEFAULT_CATEGORIES);
    saveCategories(DEFAULT_CATEGORIES);
  }

  return (
    <div className="page-content" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* API Key */}
      <div className="card">
        <div className="section-header" style={{ marginBottom: '10px' }}>🤖 Claude AI</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.5 }}>
          Tu clave se guarda solo en este dispositivo y nunca se envía a ningún servidor.
        </div>
        <input
          className="input-field"
          type="password"
          placeholder="sk-ant-api…"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{ marginBottom: '10px' }}
        />
        <button
          style={{
            background: 'var(--accent)', color: '#000', border: 'none',
            borderRadius: '10px', padding: '10px 20px', fontWeight: 700,
            fontSize: '0.85rem', cursor: 'pointer', width: '100%', minHeight: '44px',
          }}
          onClick={saveApiKey}
          type="button"
        >
          {apiKeySaved ? '✓ Guardado' : 'Guardar clave'}
        </button>
      </div>

      {/* CSV Import */}
      <div className="card">
        <div className="section-header" style={{ marginBottom: '10px' }}>📄 Importar CSV bancario</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
          Sube el estado de cuenta en CSV. Claude puede auto-categorizar cada movimiento.
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={handleCSVFile}
        />
        <button
          style={{
            background: 'var(--bg-primary)', color: 'var(--text-primary)',
            border: '1px solid var(--border)', borderRadius: '10px',
            padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem',
            cursor: 'pointer', width: '100%', minHeight: '44px',
          }}
          onClick={() => fileRef.current?.click()}
          type="button"
        >
          📂 Seleccionar archivo CSV
        </button>

        {csvError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px', marginTop: '10px', fontSize: '0.8rem', color: '#F87171' }}>
            {csvError}
          </div>
        )}

        {csvRows && !reviewRows && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              {csvRows.length} transacciones encontradas.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{
                  flex: 1, background: 'var(--accent)', color: '#000',
                  border: 'none', borderRadius: '10px', padding: '10px',
                  fontWeight: 700, fontSize: '0.82rem', cursor: categorizing ? 'not-allowed' : 'pointer',
                  opacity: categorizing ? 0.6 : 1, minHeight: '44px',
                }}
                onClick={handleAutoCateg}
                disabled={categorizing}
                type="button"
              >
                {categorizing ? '⏳ Categorizando…' : '✨ Auto-categorizar con Claude'}
              </button>
              <button
                style={{
                  background: 'var(--bg-primary)', color: 'var(--text-primary)',
                  border: '1px solid var(--border)', borderRadius: '10px',
                  padding: '10px', fontWeight: 600, fontSize: '0.82rem',
                  cursor: 'pointer', minHeight: '44px', whiteSpace: 'nowrap',
                }}
                onClick={manualCateg}
                type="button"
              >
                Manual
              </button>
            </div>
          </div>
        )}

        {/* Review screen */}
        {reviewRows && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Revisa y ajusta las categorías antes de importar:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
              {reviewRows.map((row) => {
                const cat = getCategoryById(row.categoryId, categories);
                return (
                  <div key={row.rowId} className="card" style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: '8px' }}>
                        {row.description}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                        <span className="mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: row.isIncome ? 'var(--income-color)' : 'var(--text-primary)' }}>
                          {formatMXN(row.amount)}
                        </span>
                        <button
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                          onClick={() => removeReviewRow(row.rowId)}
                          type="button"
                        >✕</button>
                      </div>
                    </div>
                    <select
                      style={{
                        background: 'var(--bg-primary)', color: 'var(--text-primary)',
                        border: '1px solid var(--border)', borderRadius: '8px',
                        padding: '6px 8px', fontSize: '0.78rem', width: '100%',
                      }}
                      value={row.categoryId}
                      onChange={(e) => updateReviewCat(row.rowId, e.target.value)}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                      ))}
                    </select>
                    {row.confidence !== null && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Confianza: {Math.round((row.confidence || 0) * 100)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                style={{
                  flex: 1, background: 'var(--accent)', color: '#000',
                  border: 'none', borderRadius: '10px', padding: '12px',
                  fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', minHeight: '44px',
                }}
                onClick={confirmImport}
                disabled={importing}
                type="button"
              >
                {importing ? 'Importando…' : `Importar ${reviewRows.length} movimientos`}
              </button>
              <button
                style={{
                  background: 'transparent', color: 'var(--text-muted)',
                  border: '1px solid var(--border)', borderRadius: '10px',
                  padding: '12px', fontWeight: 600, fontSize: '0.82rem',
                  cursor: 'pointer', minHeight: '44px',
                }}
                onClick={() => { setCsvRows(null); setReviewRows(null); }}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category management */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div className="section-header" style={{ marginBottom: 0 }}>🏷️ Categorías</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', cursor: 'pointer' }}
              onClick={resetCategories}
              type="button"
            >
              Restablecer
            </button>
            <button
              style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => setShowAddCat(true)}
              type="button"
            >
              + Añadir
            </button>
          </div>
        </div>

        {showAddCat && (
          <div style={{ background: 'var(--bg-primary)', borderRadius: '10px', padding: '12px', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input className="input-field" style={{ width: '70px' }} placeholder="🏷️" value={addEmoji} onChange={(e) => setAddEmoji(e.target.value)} maxLength={2} />
              <input className="input-field" placeholder="Nombre de categoría" value={addName} onChange={(e) => setAddName(e.target.value)} maxLength={30} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ flex: 1, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', padding: '8px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }} onClick={addCat} type="button">Agregar</button>
              <button style={{ flex: 1, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', fontSize: '0.82rem', cursor: 'pointer' }} onClick={() => setShowAddCat(false)} type="button">Cancelar</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {categories.map((cat) => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-primary)', borderRadius: '10px', padding: '8px 10px' }}>
              {editingCat === cat.id ? (
                <>
                  <input style={{ width: '40px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', padding: '4px 6px', fontSize: '1rem', textAlign: 'center' }} value={newCatEmoji} onChange={(e) => setNewCatEmoji(e.target.value)} maxLength={2} />
                  <input className="input-field" style={{ flex: 1, padding: '6px 10px' }} value={newCatName} onChange={(e) => setNewCatName(e.target.value)} maxLength={30} />
                  <button style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '6px', padding: '6px 10px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }} onClick={() => saveEdit(cat.id)} type="button">✓</button>
                  <button style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.78rem', cursor: 'pointer' }} onClick={() => setEditingCat(null)} type="button">✕</button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '1.2rem' }}>{cat.emoji}</span>
                  <span style={{ flex: 1, fontSize: '0.85rem' }}>{cat.name}</span>
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => startEdit(cat)} type="button">Editar</button>
                  <button style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => deleteCat(cat.id)} type="button">✕</button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="section-header" style={{ marginBottom: '8px' }}>ℹ️ Acerca de</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Finanzas — Chris &amp; Perla<br />
          Control de gastos personales + negocio de brownies 🍫<br />
          Datos guardados localmente en tu dispositivo.
        </div>
      </div>

      <div style={{ height: '8px' }} />
    </div>
  );
}
