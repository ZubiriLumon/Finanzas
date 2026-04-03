import { useCallback, useRef } from 'react';

export function useSensoryFeedback() {
  const audioCtxRef = useRef(null);

  function getAudioCtx() {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  const playExpenseSound = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;

      // Soft descending "cha-ching" — slightly melancholic
      const notes = [
        { freq: 880, start: 0,    dur: 0.12, gain: 0.18 },
        { freq: 660, start: 0.08, dur: 0.18, gain: 0.14 },
        { freq: 440, start: 0.2,  dur: 0.28, gain: 0.1  },
        { freq: 330, start: 0.36, dur: 0.35, gain: 0.06 },
      ];

      notes.forEach(({ freq, start, dur, gain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);
        gainNode.gain.setValueAtTime(0, now + start);
        gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.05);
      });
    } catch {}
  }, []);

  const playIncomeSound = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;

      // Warm ascending chime — bright and satisfying
      const notes = [
        { freq: 440, start: 0,    dur: 0.15, gain: 0.1  },
        { freq: 554, start: 0.1,  dur: 0.15, gain: 0.14 },
        { freq: 659, start: 0.2,  dur: 0.18, gain: 0.18 },
        { freq: 880, start: 0.32, dur: 0.45, gain: 0.22 },
        { freq: 1109, start: 0.44, dur: 0.5, gain: 0.14 },
      ];

      notes.forEach(({ freq, start, dur, gain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + start);
        gainNode.gain.setValueAtTime(0, now + start);
        gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.05);
      });
    } catch {}
  }, []);

  const vibrateExpense = useCallback(() => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate([80, 40, 80]);
      }
    } catch {}
  }, []);

  const vibrateIncome = useCallback(() => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate([200]);
      }
    } catch {}
  }, []);

  const triggerFeedback = useCallback((isIncome) => {
    if (isIncome) {
      playIncomeSound();
      vibrateIncome();
    } else {
      playExpenseSound();
      vibrateExpense();
    }
  }, [playExpenseSound, playIncomeSound, vibrateExpense, vibrateIncome]);

  return { triggerFeedback };
}
