/**
 * Parse a bank-statement CSV file.
 * Tries to detect columns for date, description, and amount.
 * Returns array of { date, description, amount, rawRow }
 */
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('El archivo CSV está vacío o tiene formato incorrecto.');

  // Parse header
  const header = splitCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

  // Try to find relevant columns
  const dateIdx = findColIndex(header, ['fecha', 'date', 'día', 'dia', 'f.operacion', 'f.valor']);
  const descIdx = findColIndex(header, ['concepto', 'descripcion', 'descripción', 'description', 'referencia', 'comercio', 'detalle', 'movimiento']);
  const amountIdx = findColIndex(header, ['importe', 'monto', 'cargo', 'abono', 'amount', 'valor', 'total']);
  const creditIdx = findColIndex(header, ['abono', 'deposito', 'depósito', 'credit', 'credito', 'crédito', 'ingreso']);
  const debitIdx = findColIndex(header, ['cargo', 'debito', 'débito', 'debit', 'egreso', 'retiro']);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = splitCSVLine(line);

    let date = dateIdx >= 0 ? cols[dateIdx] || '' : '';
    let description = descIdx >= 0 ? cols[descIdx] || '' : cols.join(' ');
    let amount = 0;

    if (amountIdx >= 0) {
      amount = parseAmount(cols[amountIdx]);
    } else if (creditIdx >= 0 && debitIdx >= 0) {
      const credit = parseAmount(cols[creditIdx]);
      const debit = parseAmount(cols[debitIdx]);
      amount = credit > 0 ? credit : -debit;
    } else if (creditIdx >= 0) {
      amount = parseAmount(cols[creditIdx]);
    } else if (debitIdx >= 0) {
      amount = -parseAmount(cols[debitIdx]);
    }

    if (isNaN(amount) || amount === 0) continue;

    rows.push({
      date: normalizeDate(date),
      description: description.trim(),
      amount: Math.abs(amount),
      isIncome: amount > 0,
      rawRow: cols,
    });
  }

  if (rows.length === 0) throw new Error('No se encontraron transacciones válidas en el archivo CSV.');
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

function findColIndex(header, candidates) {
  for (const c of candidates) {
    const idx = header.findIndex((h) => h.includes(c));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseAmount(str) {
  if (!str) return 0;
  const cleaned = str.replace(/[$,\s]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function normalizeDate(raw) {
  if (!raw) return new Date().toISOString().split('T')[0];
  // Try ISO format first
  const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  // DD/MM/YYYY or DD-MM-YYYY
  const mxMatch = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (mxMatch) {
    const [, d, m, y] = mxMatch;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  return new Date().toISOString().split('T')[0];
}
