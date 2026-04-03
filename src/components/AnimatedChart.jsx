import { useEffect, useRef, useState } from 'react';
import { formatMXN } from '../utils/format';

/**
 * Animated horizontal bar chart — bars grow from left on mount.
 */
export function BarChart({ data, maxValue }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((item, i) => {
        const pct = Math.min(100, (item.value / max) * 100);
        return (
          <div key={item.id || i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </span>
              <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {formatMXN(item.value)}
              </span>
            </div>
            <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: '4px',
                  background: item.color || 'var(--accent)',
                  width: mounted ? `${pct}%` : '0%',
                  transition: `width 0.6s cubic-bezier(0.4,0,0.2,1) ${i * 80}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * SVG line chart that draws itself via stroke-dashoffset animation.
 */
export function LineChart({ data, color = 'var(--accent)' }) {
  const svgRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!data || data.length === 0) return null;

  const W = 320;
  const H = 100;
  const PAD = 8;

  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const points = data.map((d, i) => {
    const x = PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2);
    const y = H - PAD - ((d.value - minV) / range) * (H - PAD * 2);
    return [x, y];
  });

  const d = points
    .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(' ');

  // Area fill path
  const area = [
    ...points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)),
    `L${points[points.length - 1][0]},${H}`,
    `L${points[0][0]},${H}`,
    'Z',
  ].join(' ');

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Area fill */}
      <path d={area} fill="url(#lineGrad)" />

      {/* Animated line */}
      <AnimatedPath d={d} color={color} mounted={mounted} />

      {/* Dots */}
      {points.map(([x, y], i) => (
        <circle
          key={i}
          cx={x} cy={y} r={3}
          fill={color}
          style={{
            opacity: mounted ? 1 : 0,
            transition: `opacity 0.3s ease ${0.6 + i * 0.05}s`,
          }}
        />
      ))}

      {/* Zero line */}
      {minV < 0 && (
        <line
          x1={PAD} y1={H - PAD - ((0 - minV) / range) * (H - PAD * 2)}
          x2={W - PAD} y2={H - PAD - ((0 - minV) / range) * (H - PAD * 2)}
          stroke="rgba(255,255,255,0.15)" strokeDasharray="3,3" strokeWidth="1"
        />
      )}
    </svg>
  );
}

function AnimatedPath({ d, color, mounted }) {
  const pathRef = useRef(null);
  const [len, setLen] = useState(1000);

  useEffect(() => {
    if (pathRef.current) {
      setLen(pathRef.current.getTotalLength() || 1000);
    }
  }, [d]);

  return (
    <path
      ref={pathRef}
      d={d}
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        strokeDasharray: len,
        strokeDashoffset: mounted ? 0 : len,
        transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)',
        filter: 'url(#glow)',
      }}
    />
  );
}
