/**
 * Parse a PDF bank statement file.
 * Uses pdfjs-dist to extract text, then applies heuristics
 * to find transaction rows (date + description + amount).
 *
 * Returns array of { date, description, amount, isIncome }
 */

// Use CDN worker to avoid Vite bundling issues with pdfjs worker
let pdfjsLibInstance = null;

async function getPdfjsLib() {
  if (pdfjsLibInstance) return pdfjsLibInstance;
  const pdfjsLib = await import('pdfjs-dist');
  // Use the CDN-hosted worker matching the installed version
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  pdfjsLibInstance = pdfjsLib;
  return pdfjsLib;
}

export async function parsePDF(file) {
  const pdfjsLib = await getPdfjsLib();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Extract all text from all pages
  const allLines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Group items by Y position (same row = same line)
    const lineMap = {};
    content.items.forEach((item) => {
      if (!item.str.trim()) return;
      const y = Math.round(item.transform[5]);
      if (!lineMap[y]) lineMap[y] = [];
      lineMap[y].push({ x: item.transform[4], text: item.str });
    });
    // Sort lines top-to-bottom, items left-to-right
    Object.entries(lineMap)
      .sort(([ya], [yb]) => Number(yb) - Number(ya))
      .forEach(([, items]) => {
        const lineText = items
          .sort((a, b) => a.x - b.x)
          .map((i) => i.text)
          .join(' ');
        allLines.push(lineText.trim());
      });
  }

  return parseLines(allLines);
}

/**
 * Heuristic parser: looks for lines containing a date and an amount.
 * Works well for BBVA, Banamex, Santander, HSBC, Banorte PDF formats.
 */
function parseLines(lines) {
  const rows = [];

  // Patterns
  const datePattern = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b|\b(\d{4})[\/\-](\d{2})[\/\-](\d{2})\b|\b(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+(\d{2,4})\b/i;
  const amountPattern = /\$?\s*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?|\d+\.\d{2})/g;

  const monthMap = { ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sep:9,oct:10,nov:11,dic:12 };

  for (const line of lines) {
    const dateMatch = datePattern.exec(line);
    if (!dateMatch) continue;

    // Extract all amounts from the line
    const amounts = [];
    let m;
    const amtRe = /\$?\s*(\d{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{2})?)/g;
    while ((m = amtRe.exec(line)) !== null) {
      const raw = m[1].replace(/[$\s]/g, '');
      // Detect if comma is thousands separator or decimal
      const val = parseFloat(raw.replace(/,(\d{3})/g, '$1').replace(',', '.'));
      if (!isNaN(val) && val > 0) amounts.push(val);
    }
    if (amounts.length === 0) continue;

    // The largest amount on the line is most likely the transaction amount
    const amount = Math.max(...amounts);
    if (amount < 1) continue;

    // Parse date
    let dateStr = '';
    if (dateMatch[1] && dateMatch[2] && dateMatch[3]) {
      // DD/MM/YYYY or DD/MM/YY
      const y = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
      dateStr = `${y}-${dateMatch[2].padStart(2,'0')}-${dateMatch[1].padStart(2,'0')}`;
    } else if (dateMatch[4] && dateMatch[5] && dateMatch[6]) {
      // YYYY-MM-DD
      dateStr = `${dateMatch[4]}-${dateMatch[5]}-${dateMatch[6]}`;
    } else if (dateMatch[7] && dateMatch[8] && dateMatch[9]) {
      // D MMM YY
      const mon = monthMap[dateMatch[8].toLowerCase()] || 1;
      const y = dateMatch[9].length === 2 ? `20${dateMatch[9]}` : dateMatch[9];
      dateStr = `${y}-${String(mon).padStart(2,'0')}-${dateMatch[7].padStart(2,'0')}`;
    }
    if (!dateStr) continue;

    // Extract description: text between date match end and first amount
    const desc = line
      .slice(dateMatch.index + dateMatch[0].length)
      .replace(amtRe, '')
      .replace(/[+\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);

    // Income heuristic: line contains words like "abono", "deposito", "nomina", "credito", "ingreso"
    const incomeKeywords = /abono|dep[oó]sito|n[oó]mina|cr[eé]dito|spei\s+recibido|pago\s+recibido|ingreso|transferencia\s+recibida/i;
    const isIncome = incomeKeywords.test(line);

    rows.push({
      date: dateStr,
      description: desc || 'Movimiento',
      amount,
      isIncome,
    });
  }

  if (rows.length === 0) {
    throw new Error('No se encontraron transacciones en el PDF. Verifica que sea un estado de cuenta bancario.');
  }

  return rows;
}
