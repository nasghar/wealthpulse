'use client';
import { usePoll } from '@/lib/usePoll';
import { Card, Delta, LiveNumber, PageHeader, Pill } from '@/components/ui';
import { AumAreaChart, Donut } from '@/components/charts';
import { fmtMoney, fmtNum, fmtPrice, ASSET_COLORS } from '@/lib/format';
import Link from 'next/link';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';

type Overview = {
  kpis: { aum: number; dayPnl: number; dayPnlPct: number; clients: number; accounts: number; advisors: number; netFlows: number; avgAccount: number; positions: number };
  trend: { d: string; v: number }[];
  allocation: { asset_class: string; value: number }[];
  segments: { segment: string; value: number; clients: number }[];
  gainers: Mover[]; losers: Mover[];
};
type Mover = { symbol: string; name: string; asset_class: string; price: number; day_change_pct: number };

export default function ExecutivePage() {
  const { data } = usePoll<Overview>('/api/overview', 2500);
  const k = data?.kpis;
  const totalAlloc = data?.allocation.reduce((s, a) => s + a.value, 0) ?? 1;

  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        subtitle="Firm-wide performance, revalued live against the streaming market"
        right={<Pill tone="gold">{fmtNum(k?.positions ?? 0)} positions live</Pill>}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        <Kpi label="Total AUM" main={k ? <LiveNumber value={k.aum} format={(n) => fmtMoney(n, { compact: true })} className="gold-text" /> : '—'}
          sub={k && <span className="text-xs"><Delta value={k.dayPnlPct} /> today</span>} />
        <Kpi label="Intraday P&L" main={k ? <LiveNumber value={k.dayPnl} format={(n) => `${n >= 0 ? '+' : ''}${fmtMoney(n, { compact: true })}`} className={k.dayPnl >= 0 ? 'pos' : 'neg'} /> : '—'}
          sub={k && <span className="text-xs text-[var(--muted)]">{fmtNum(k.positions)} holdings</span>} />
        <Kpi label="Clients" main={fmtNum(k?.clients ?? 0)} sub={<span className="text-xs text-[var(--muted)]">{fmtNum(k?.accounts ?? 0)} accounts</span>} />
        <Kpi label="Net Flows · 90d" main={k ? <span className={k.netFlows >= 0 ? 'pos' : 'neg'}>{k.netFlows >= 0 ? '+' : ''}{fmtMoney(k.netFlows, { compact: true })}</span> : '—'}
          sub={<span className="text-xs text-[var(--muted)]">new assets</span>} />
        <Kpi label="Avg Account" main={fmtMoney(k?.avgAccount ?? 0, { compact: true })} sub={<span className="text-xs text-[var(--muted)]">{fmtNum(k?.advisors ?? 0)} advisors</span>} />
      </div>

      {/* Trend + allocation */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <Card className="xl:col-span-2 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="label">Assets Under Management</div>
              <div className="text-sm text-[var(--muted)] mt-0.5">Trailing 24 months · weekly</div>
            </div>
            <Pill tone="blue">{data ? `${data.trend.length} pts` : ''}</Pill>
          </div>
          {data ? <AumAreaChart data={data.trend} /> : <div className="skeleton h-[240px]" />}
        </Card>

        <Card className="p-5">
          <div className="label mb-1">Asset Allocation</div>
          <div className="text-sm text-[var(--muted)] mb-2">Live market value</div>
          {data ? (
            <>
              <Donut data={data.allocation.map((a) => ({ name: a.asset_class, value: a.value, color: ASSET_COLORS[a.asset_class] || '#888' }))} />
              <div className="flex flex-col gap-2 mt-3">
                {data.allocation.map((a) => (
                  <div key={a.asset_class} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ASSET_COLORS[a.asset_class] }} />
                      {a.asset_class}
                    </span>
                    <span className="tnum text-[var(--muted)]">{((a.value / totalAlloc) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="skeleton h-[200px]" />}
        </Card>
      </div>

      {/* Movers + segments */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <MoversCard title="Top Gainers" icon={<TrendingUp size={16} className="pos" />} movers={data?.gainers} />
        <MoversCard title="Top Decliners" icon={<TrendingDown size={16} className="neg" />} movers={data?.losers} />
        <Card className="p-5">
          <div className="label mb-3">Wealth by Client Segment</div>
          <div className="flex flex-col gap-4 mt-1">
            {data?.segments.slice().sort((a, b) => b.value - a.value).map((s) => {
              const pct = (s.value / (data.segments.reduce((x, y) => x + y.value, 0))) * 100;
              return (
                <div key={s.segment}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium">{s.segment}</span>
                    <span className="tnum">{fmtMoney(s.value, { compact: true })}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#f0d692,#b88a30)' }} />
                  </div>
                  <div className="text-[11px] text-[var(--muted)] mt-1">{fmtNum(s.clients)} clients · {pct.toFixed(0)}% of AUM</div>
                </div>
              );
            }) ?? <div className="skeleton h-[140px]" />}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, main, sub }: { label: string; main: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Card hover className="p-4">
      <div className="label">{label}</div>
      <div className="text-[22px] font-semibold tnum mt-2 leading-none">{main}</div>
      <div className="mt-2">{sub}</div>
    </Card>
  );
}

function MoversCard({ title, icon, movers }: { title: string; icon: React.ReactNode; movers?: Mover[] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">{icon}<span className="label">{title}</span></div>
      <div className="flex flex-col gap-1">
        {movers?.map((m) => (
          <Link key={m.symbol} href="/market" className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg grid place-items-center text-[11px] font-bold" style={{ background: 'rgba(255,255,255,0.05)' }}>{m.symbol.slice(0, 3)}</div>
              <div>
                <div className="text-sm font-medium flex items-center gap-1">{m.symbol}<ArrowUpRight size={12} className="opacity-0 group-hover:opacity-60 transition" /></div>
                <div className="text-[11px] text-[var(--muted)] max-w-[120px] truncate">{m.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm tnum">{fmtPrice(m.price)}</div>
              <div className="text-xs"><Delta value={m.day_change_pct} showArrow={false} /></div>
            </div>
          </Link>
        )) ?? <div className="skeleton h-[200px]" />}
      </div>
    </Card>
  );
}
