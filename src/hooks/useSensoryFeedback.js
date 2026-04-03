/**
 * useSensoryFeedback — sonido + hápticos al guardar movimientos.
 *
 * iOS Safari requiere que el AudioContext sea creado O reanudado
 * dentro de un manejador de gesto de usuario. Usamos un contexto
 * compartido a nivel de módulo y lo desbloqueamos en el primer toque.
 */

// Contexto compartido entre todas las instancias del hook
let _ctx = null;

function getCtx() {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // En iOS el contexto arranca "suspended" hasta el primer gesto
  if (_ctx.state === 'suspended') {
    _ctx.resume();
  }
  return _ctx;
}

/**
 * Llama esto en el primer toque/click del usuario para desbloquear
 * el audio en iOS Safari. Se exporta para usarse en App.jsx.
 */
export function unlockAudio() {
  try {
    const ctx = getCtx();
    // Reproducir un buffer silencioso — esto desbloquea el contexto en iOS
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch (_) {
    // Silencioso — no todos los navegadores soportan Web Audio
  }
}

export function useSensoryFeedback() {
  function playExpenseSound() {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;

      // Cha-ching descendente, ligeramente melancólico
      const notes = [
        { freq: 880, start: 0,    dur: 0.12, gain: 0.22 },
        { freq: 660, start: 0.09, dur: 0.18, gain: 0.17 },
        { freq: 440, start: 0.21, dur: 0.28, gain: 0.13 },
        { freq: 330, start: 0.37, dur: 0.38, gain: 0.08 },
      ];

      notes.forEach(({ freq, start, dur, gain }) => {
        const osc  = ctx.createOscillator();
        const amp  = ctx.createGain();
        osc.connect(amp);
        amp.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);
        amp.gain.setValueAtTime(0, now + start);
        amp.gain.linearRampToValueAtTime(gain, now + start + 0.015);
        amp.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.05);
      });
    } catch (_) {}
  }

  function playIncomeSound() {
    try {
      const ctx = getCtx();
      const now = ctx.currentTime;

      // Chime ascendente, cálido y satisfactorio
      const notes = [
        { freq: 440,  start: 0,    dur: 0.15, gain: 0.12 },
        { freq: 554,  start: 0.10, dur: 0.16, gain: 0.16 },
        { freq: 659,  start: 0.21, dur: 0.20, gain: 0.21 },
        { freq: 880,  start: 0.34, dur: 0.45, gain: 0.26 },
        { freq: 1109, start: 0.46, dur: 0.55, gain: 0.18 },
      ];

      notes.forEach(({ freq, start, dur, gain }) => {
        const osc  = ctx.createOscillator();
        const amp  = ctx.createGain();
        osc.connect(amp);
        amp.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + start);
        amp.gain.setValueAtTime(0, now + start);
        amp.gain.linearRampToValueAtTime(gain, now + start + 0.025);
        amp.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.05);
      });
    } catch (_) {}
  }

  function vibrateExpense() {
    try { navigator.vibrate?.([80, 40, 80]); } catch (_) {}
  }

  function vibrateIncome() {
    try { navigator.vibrate?.([200]); } catch (_) {}
  }

  function triggerFeedback(isIncome) {
    if (isIncome) {
      playIncomeSound();
      vibrateIncome();
    } else {
      playExpenseSound();
      vibrateExpense();
    }
  }

  return { triggerFeedback };
}
