export function fmtMoney(n: number, opts: { compact?: boolean; cents?: boolean } = {}) {
  if (n == null || isNaN(n)) return '—';
  if (opts.compact) {
    const abs = Math.abs(n);
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  });
}

export function fmtNum(n: number, d = 0) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtPct(n: number, d = 2) {
  if (n == null || isNaN(n)) return '—';
  const s = n >= 0 ? '+' : '';
  return `${s}${n.toFixed(d)}%`;
}

export function fmtPrice(n: number) {
  if (n == null || isNaN(n)) return '—';
  if (n < 1) return `$${n.toFixed(4)}`;
  if (n < 100) return `$${n.toFixed(2)}`;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const ASSET_COLORS: Record<string, string> = {
  Equity: '#6ea8fe',
  ETF: '#9d7bff',
  'Fixed Income': '#37c2a8',
  Crypto: '#f0a93b',
  Cash: '#8a93a6',
};
