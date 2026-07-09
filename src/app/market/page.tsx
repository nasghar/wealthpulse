'use client';
import { useState } from 'react';
import { usePoll } from '@/lib/usePoll';
import { Card, Delta, LiveNumber, PageHeader, Pill } from '@/components/ui';
import { fmtMoney, fmtNum, fmtPrice, ASSET_COLORS } from '@/lib/format';

type Quote = { symbol: string; name: string; asset_class: string; sector: string; price: number; prev_close: number; day_change_pct: number };
type Idx = { symbol: string; name: string; price: number; prev_close: number; day_change_pct: number };
type Sector = { sector: string; asset_class: string; exposure: number; chg: number; n: number };
type Market = { indices: Idx[]; quotes: Quote[]; sectors: Sector[]; gainers: Quote[]; losers: Quote[] };

const CLASSES = ['All', 'Equity', 'ETF', 'Fixed Income', 'Crypto'];

function heat(chg: number) {
  const x = Math.max(-1, Math.min(1, chg / 3));
  return x >= 0 ? `rgba(47,209,128,${0.1 + 0.55 * x})` : `rgba(255,92,108,${0.1 + 0.55 * -x})`;
}

export default function MarketPage() {
  const { data } = usePoll<Market>('/api/market', 2000);
  const [cls, setCls] = useState('All');
  const quotes = (data?.quotes ?? []).filter((q) => cls === 'All' || q.asset_class === cls);
  const maxExp = Math.max(...(data?.sectors.map((s) => s.exposure) ?? [1]));

  return (
    <div>
      <PageHeader title="Market Monitor" subtitle="Live quotes streaming into SingleStore · prices flash on every tick"
        right={<Pill tone="pos"><span className="live-dot" /> Live feed</Pill>} />

      {/* Indices strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {(data?.indices ?? Array(6).fill(null)).map((ix, i) => (
          <Card key={ix?.symbol ?? i} hover className="p-4">
            {ix ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{ix.symbol}</span>
                  <Delta value={ix.day_change_pct} showArrow={false} className="text-xs" />
                </div>
                <div className="text-lg font-semibold mt-2">
                  <LiveNumber value={ix.price} format={fmtPrice} />
                </div>
                <div className="text-[11px] text-[var(--muted)] mt-1 truncate">{ix.name}</div>
              </>
            ) : <div className="skeleton h-[70px]" />}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        {/* Sector heatmap */}
        <Card className="xl:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div><div className="label">Sector Heatmap</div><div className="text-sm text-[var(--muted)] mt-0.5">Tile size = firm exposure · color = today&apos;s move</div></div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {data?.sectors.map((s) => {
              const scale = 0.4 + 0.6 * (s.exposure / maxExp);
              return (
                <div key={s.sector} className="rounded-xl border border-[var(--border)] p-3 flex flex-col justify-between transition hover:border-[var(--border-strong)]"
                  style={{ background: heat(s.chg), flexGrow: s.exposure, minWidth: 130, height: 92 * scale + 40 }}>
                  <div className="text-[13px] font-semibold leading-tight">{s.sector}</div>
                  <div>
                    <div className="tnum text-sm font-semibold">{(s.chg >= 0 ? '+' : '') + s.chg.toFixed(2)}%</div>
                    <div className="text-[10px] text-[rgba(255,255,255,0.6)]">{fmtMoney(s.exposure, { compact: true })} · {s.n} names</div>
                  </div>
                </div>
              );
            }) ?? <div className="skeleton h-[260px] w-full" />}
          </div>
        </Card>

        {/* Movers */}
        <Card className="p-5">
          <div className="label mb-3">Biggest Movers</div>
          <div className="grid grid-cols-1 gap-1">
            {[...(data?.gainers?.slice(0, 5) ?? []), ...(data?.losers?.slice(0, 5).reverse() ?? [])].map((m) => (
              <div key={m.symbol} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-8 rounded-full" style={{ background: m.day_change_pct >= 0 ? 'var(--pos)' : 'var(--neg)' }} />
                  <div>
                    <div className="text-sm font-medium">{m.symbol}</div>
                    <div className="text-[11px] text-[var(--muted)] max-w-[110px] truncate">{m.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm tnum">{fmtPrice(m.price)}</div>
                  <Delta value={m.day_change_pct} showArrow={false} className="text-xs" />
                </div>
              </div>
            )) || <div className="skeleton h-[300px]" />}
          </div>
        </Card>
      </div>

      {/* Quote board */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="label">Live Quote Board · {fmtNum(quotes.length)} instruments</div>
          <div className="flex gap-1.5">
            {CLASSES.map((c) => (
              <button key={c} onClick={() => setCls(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${cls === c ? 'border-[var(--border-strong)] bg-[rgba(255,255,255,0.06)] text-[var(--text)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--muted)] text-[11px] uppercase tracking-wider">
                <th className="text-left font-semibold pb-2 pl-1">Symbol</th>
                <th className="text-left font-semibold pb-2">Name</th>
                <th className="text-left font-semibold pb-2">Class</th>
                <th className="text-right font-semibold pb-2">Price</th>
                <th className="text-right font-semibold pb-2">Prev Close</th>
                <th className="text-right font-semibold pb-2 pr-1">Day</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.symbol} className="border-t border-[var(--border)] hover:bg-[rgba(255,255,255,0.025)]">
                  <td className="py-2.5 pl-1 font-semibold">{q.symbol}</td>
                  <td className="py-2.5 text-[var(--muted)] max-w-[260px] truncate">{q.name}</td>
                  <td className="py-2.5">
                    <span className="badge" style={{ color: ASSET_COLORS[q.asset_class], borderColor: 'var(--border-strong)' }}>{q.asset_class}</span>
                  </td>
                  <td className="py-2.5 text-right tnum"><LiveNumber value={q.price} format={fmtPrice} /></td>
                  <td className="py-2.5 text-right tnum text-[var(--muted)]">{fmtPrice(q.prev_close)}</td>
                  <td className="py-2.5 text-right pr-1"><Delta value={q.day_change_pct} showArrow={false} /></td>
                </tr>
              ))}
              {!quotes.length && <tr><td colSpan={6}><div className="skeleton h-[300px] w-full my-2" /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
