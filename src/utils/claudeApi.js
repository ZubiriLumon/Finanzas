const MODEL = 'claude-sonnet-4-6';

/**
 * Auto-categorize CSV transactions using Claude.
 * @param {string} apiKey
 * @param {Array} transactions - [{description, amount, isIncome}]
 * @param {Array} categories - [{id, name, emoji}]
 * @returns {Promise<Array>} - [{categoryId, confidence}] same order as input
 */
export async function categorizeTxns(apiKey, transactions, categories) {
  const catList = categories
    .map((c) => `${c.id}: ${c.emoji} ${c.name}`)
    .join('\n');

  const txList = transactions
    .map((t, i) => `${i + 1}. "${t.description}" — $${t.amount.toFixed(2)} MXN (${t.isIncome ? 'ingreso' : 'gasto'})`)
    .join('\n');

  const prompt = `Eres un asistente financiero para usuarios mexicanos.
Clasifica cada transacción en la categoría más apropiada de la lista.

Categorías disponibles:
${catList}

Transacciones a clasificar:
${txList}

Responde SOLO con un arreglo JSON, sin texto adicional, con este formato exacto:
[{"categoryId":"<id>","confidence":<0.0-1.0>}, ...]

Un objeto por transacción, en el mismo orden.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error de API: ${res.status}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '[]';

  // Extract JSON array from the response
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Respuesta inesperada de Claude');

  return JSON.parse(match[0]);
}

/**
 * Get monthly financial insights from Claude.
 * @param {string} apiKey
 * @param {object} summary - monthly aggregated data
 * @returns {Promise<string>} - markdown insights text
 */
export async function getMonthlyInsights(apiKey, summary) {
  const { month, totalIncome, totalExpenses, balance, byCategoryList, brownieIncome, brownieCosts } = summary;

  const catBreakdown = byCategoryList
    .map((c) => `- ${c.emoji} ${c.name}: $${c.total.toFixed(2)} MXN`)
    .join('\n');

  const prompt = `Eres un asesor financiero personal para Chris y Perla, una pareja mexicana.
Chris trabaja en el IMSS y estudia ingeniería en software por las noches.
Perla estudia nutrición. Los fines de semana tienen un negocio de brownies.

Resumen financiero de ${month}:
- Ingresos totales: $${totalIncome.toFixed(2)} MXN
- Gastos totales: $${totalExpenses.toFixed(2)} MXN
- Balance: $${balance.toFixed(2)} MXN
- Negocio brownies — ingresos: $${brownieIncome.toFixed(2)}, costos: $${brownieCosts.toFixed(2)} MXN

Desglose por categoría:
${catBreakdown}

Proporciona 4–5 observaciones personalizadas y concretas en español (México), considerando:
1. El patrón de ingresos del negocio de brownies vs gastos fijos
2. Gastos variables que se pueden reducir
3. Una recomendación de ahorro realista dada su situación
4. Si el mes fue saludable o preocupante y por qué
5. Un consejo específico para el siguiente mes

Responde en formato de lista con viñetas (usa •), en un tono amigable y directo. Sin introducciones largas.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error de API: ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}
