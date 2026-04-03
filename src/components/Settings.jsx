import { useState, useRef } from 'react';
import { parseCSV } from '../utils/csvParser';
import { parsePDF } from '../utils/pdfParser';
import { categorizeTxns } from '../utils/claudeApi';
import { getCategoryById, DEFAULT_CATEGORIES, saveCategories } from '../utils/categories';
import { formatMXN, genId, todayStr } from '../utils/format';
import { getBudgets, saveBudgets } from '../utils/budgets';

export default function Settings({ categories, setCategories, onImportTransactions }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('finanzas_claude_key') || '');
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [importRows, setImportRows] = useState(null);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [reviewRows, setReviewRows] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmoji, setAddEmoji] = useState('');
  const [budgets, setBudgetsState] = useState(getBudgets);
  const fileRef = useRef(null);

  function updateBudget(catId, val) {
    const n = parseFloat(val) || 0;
    const updated = { ...budgets, [catId]: n > 0 ? n : undefined };
    if (!updated[catId]) delete updated[catId];
    setBudgetsState(updated);
    saveBudgets(updated);
  }

  function saveApiKey() {
    localStorage.setItem('finanzas_claude_key', apiKey.trim());
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportRows(null);
    setReviewRows(null);
    setParsing(true);
    try {
      let rows;
      const isPDF = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      if (isPDF) {
        rows = await parsePDF(file);
      } else {
        const text = await file.text();
        rows = parseCSV(text);
      }
      setImportRows(rows);
    } catch (err) {
      setImportError(err.message);
    } finally {
      setParsing(false);
    }
    e.target.value = '';
  }

  async function handleAutoCateg() {
    const key = localStorage.getItem('finanzas_claude_key');
    if (!key) { setImportError('Configura tu clave de Claude primero.'); return; }
    if (!importRows) return;
    setCategorizing(true);
    try {
      const results = await categorizeTxns(key, importRows, categories);
      const review = importRows.map((row, i) => ({
        ...row,
        categoryId: results[i]?.categoryId || 'otro',
        confidence: results[i]?.confidence || 0,
        rowId: genId(),
      }));
      setReviewRows(review);
    } catch (err) {
      setImportError(err.message || 'Error al categorizar');
    } finally {
      setCategorizing(false);
    }
  }

  function manualCateg() {
    if (!importRows) return;
    const review = importRows.map((row) => ({
      ...row,
      categoryId: row.isIncome ? 'ingresos_imss' : 'otro',
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
    const txns = reviewRows.map((r) => {
      const cat = getCategoryById(r.categoryId, categories);
      // Determinar type: primero por categoría, luego por heurística del parser
      const type = cat.type === 'income' ? 'income'
                 : cat.type === 'expense' ? 'expense'
                 : (r.isIncome ? 'income' : 'expense');
      return {
        id: genId(),
        date: r.date || todayStr(),
        amount: r.amount,
        categoryId: r.categoryId,
        note: r.description,
        source: 'csv',
        type,
      };
    });
    onImportTransactions(txns);
    setImportRows(null);
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

      {/* PDF / CSV Import */}
      <div className="card">
        <div className="section-header" style={{ marginBottom: '10px' }}>📄 Importar estado de cuenta</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
          Sube tu estado de cuenta en <strong style={{ color: 'var(--text-primary)' }}>PDF o CSV</strong>. Claude puede auto-categorizar cada movimiento.
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.csv,application/pdf,text/csv"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
        <button
          style={{
            background: 'var(--bg-primary)', color: 'var(--text-primary)',
            border: '1px solid var(--border)', borderRadius: '10px',
            padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem',
            cursor: parsing ? 'not-allowed' : 'pointer', width: '100%', minHeight: '48px',
            opacity: parsing ? 0.7 : 1,
          }}
          onClick={() => !parsing && fileRef.current?.click()}
          type="button"
        >
          {parsing ? '⏳ Leyendo archivo…' : '📂 Seleccionar PDF o CSV'}
        </button>

        {/* Format badges */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
          {['PDF', 'CSV'].map((fmt) => (
            <span key={fmt} style={{
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em',
              background: 'var(--accent-glow)', color: 'var(--accent)',
              borderRadius: '4px', padding: '2px 7px',
            }}>{fmt}</span>
          ))}
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: '20px' }}>
            BBVA · Banamex · Santander · HSBC · Banorte
          </span>
        </div>

        {importError && (
          <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '10px', padding: '10px', marginTop: '10px', fontSize: '0.8rem', color: '#FF8080' }}>
            {importError}
          </div>
        )}

        {importRows && !reviewRows && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              {importRows.length} transacciones encontradas.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{
                  flex: 1, background: 'var(--accent)', color: '#000',
                  border: 'none', borderRadius: '10px', padding: '10px',
                  fontWeight: 700, fontSize: '0.82rem',
                  cursor: categorizing ? 'not-allowed' : 'pointer',
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
              {reviewRows.map((row) => (
                <div key={row.rowId} className="card" style={{ padding: '10px 12px', background: 'var(--bg-primary)' }}>
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
                      background: 'var(--bg-card)', color: 'var(--text-primary)',
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
              ))}
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
                onClick={() => { setImportRows(null); setReviewRows(null); }}
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
                  <button style={{ background: 'none', border: 'none', color: '#FF6B6B', cursor: 'pointer', fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => deleteCat(cat.id)} type="button">✕</button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Budget goals */}
      <div className="card">
        <div className="section-header" style={{ marginBottom: '4px' }}>🎯 Presupuesto mensual</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Define un límite por categoría. Se muestra como barra de progreso en el Dashboard.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {categories.filter((c) => c.type === 'expense' || c.type === 'both').map((cat) => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.1rem', width: '24px', textAlign: 'center' }}>{cat.emoji}</span>
              <span style={{ flex: 1, fontSize: '0.83rem' }}>{cat.name}</span>
              <div style={{ position: 'relative', width: '110px' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem', pointerEvents: 'none' }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Sin límite"
                  value={budgets[cat.id] || ''}
                  onChange={(e) => updateBudget(cat.id, e.target.value)}
                  style={{
                    background: 'var(--bg-primary)', border: '1px solid var(--border)',
                    borderRadius: '8px', color: 'var(--text-primary)',
                    padding: '7px 8px 7px 20px', fontSize: '0.82rem', width: '100%',
                    outline: 'none',
                  }}
                />
              </div>
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
