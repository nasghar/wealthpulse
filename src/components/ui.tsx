'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { fmtPct } from '@/lib/format';

export function Card({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return <div className={`card ${hover ? 'card-hover' : ''} ${className}`}>{children}</div>;
}

export function Delta({ value, suffix = '%', className = '', showArrow = true }: { value: number; suffix?: string; className?: string; showArrow?: boolean }) {
  if (value == null || isNaN(value)) return <span className="text-[var(--muted)]">—</span>;
  const up = value >= 0;
  return (
    <span className={`tnum ${up ? 'pos' : 'neg'} ${className}`}>
      {showArrow && (up ? '▲' : '▼')} {up ? '+' : ''}{value.toFixed(2)}{suffix}
    </span>
  );
}

// number that flashes green/red when it changes
export function LiveNumber({ value, format, className = '' }: { value: number; format: (n: number) => string; className?: string }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState('');
  useEffect(() => {
    if (value > prev.current) setFlash('flash-up');
    else if (value < prev.current) setFlash('flash-down');
    prev.current = value;
    const t = setTimeout(() => setFlash(''), 800);
    return () => clearTimeout(t);
  }, [value]);
  return <span className={`tnum rounded px-1 ${flash} ${className}`}>{format(value)}</span>;
}

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'gold' | 'pos' | 'neg' | 'blue' }) {
  const tones: Record<string, string> = {
    default: 'text-[var(--muted)] border-[var(--border-strong)]',
    gold: 'text-[var(--gold)] border-[rgba(216,178,90,0.4)] bg-[rgba(216,178,90,0.08)]',
    pos: 'pos border-[rgba(47,209,128,0.4)] bg-pos-soft',
    neg: 'neg border-[rgba(255,92,108,0.4)] bg-neg-soft',
    blue: 'text-[var(--accent)] border-[rgba(110,168,254,0.4)] bg-[rgba(110,168,254,0.08)]',
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--muted)] mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

// tiny inline sparkline
export function Sparkline({ data, color = 'var(--accent)', w = 80, h = 26 }: { data: number[]; color?: string; w?: number; h?: number }) {
  if (!data || data.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / rng) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function StatBlock({ label, children, delta, sub }: { label: string; children: ReactNode; delta?: number; sub?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="label">{label}</div>
      <div className="text-2xl font-semibold tnum leading-none">{children}</div>
      {delta != null && <div className="text-xs">{fmtPct(delta)}</div>}
      {sub}
    </div>
  );
}
