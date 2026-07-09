'use client';
import { usePoll } from '@/lib/usePoll';
import { Card, PageHeader, Pill } from '@/components/ui';
import { fmtMoney, fmtNum, ASSET_COLORS } from '@/lib/format';

type Risk = {
  concentrations: { symbol: string; name: string; asset_class: string; value: number; pct: number }[];
  portVol: number; hhi: number;
  alloc: { asset_class: string; value: number }[];
  byRisk: { risk_profile: string; value: number; clients: number }[];
};

const TARGET: Record<string, number> = { Equity: 0.35, ETF: 0.30, 'Fixed Income': 0.25, Cash: 0.05, Crypto: 0.05 };

export default function RiskPage() {
  const { data } = usePoll<Risk>('/api/risk', 4000);
  const totalAlloc = data?.alloc.reduce((s, a) => s + a.value, 0) ?? 1;
  const effHoldings = data ? Math.round(1 / data.hhi) : 0;
  const topConc = data?.concentrations[0];

  return (
    <div>
      <PageHeader title="Risk & Rebalance" subtitle="Firm-wide exposure, concentration, and drift from the model portfolio"
        right={<Pill tone="blue">Model: Moderate 35/30/25</Pill>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Gauge label="Portfolio Volatility" value={data ? `${(data.portVol * 100).toFixed(1)}%` : '—'} sub="value-weighted, annualized"
          tone={data && data.portVol > 0.25 ? 'neg' : 'pos'} />
        <Gauge label="Diversification" value={data ? `${effHoldings}` : '—'} sub="effective holdings (1/HHI)" tone="pos" />
        <Gauge label="Largest Position" value={topConc ? `${topConc.pct.toFixed(1)}%` : '—'} sub={topConc ? `${topConc.symbol} of AUM` : ''}
          tone={topConc && topConc.pct > 5 ? 'neg' : 'pos'} />
        <Gauge label="Concentration (HHI)" value={data ? data.hhi.toFixed(3) : '—'} sub={data && data.hhi < 0.05 ? 'well diversified' : 'concentrated'} tone={data && data.hhi < 0.05 ? 'pos' : 'neg'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        {/* Drift vs target */}
        <Card className="p-5">
          <div className="label mb-1">Allocation vs Model Target</div>
          <div className="text-sm text-[var(--muted)] mb-4">Rebalancing drift by asset class</div>
          <div className="flex flex-col gap-4">
            {data?.alloc.slice().sort((a, b) => b.value - a.value).map((a) => {
              const cur = a.value / totalAlloc;
              const tgt = TARGET[a.asset_class] ?? 0;
              const drift = (cur - tgt) * 100;
              return (
                <div key={a.asset_class}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: ASSET_COLORS[a.asset_class] }} />{a.asset_class}</span>
                    <span className="tnum">{(cur * 100).toFixed(1)}% <span className="text-[var(--muted)]">/ {(tgt * 100).toFixed(0)}% target</span></span>
                  </div>
                  <div className="relative h-2.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${cur * 100}%`, background: ASSET_COLORS[a.asset_class] }} />
                    <div className="absolute top-0 h-full w-[2px] bg-white/60" style={{ left: `${tgt * 100}%` }} />
                  </div>
                  <div className={`text-[11px] mt-1 ${Math.abs(drift) > 3 ? (drift > 0 ? 'neg' : 'pos') : 'text-[var(--muted)]'}`}>
                    {Math.abs(drift) < 0.1 ? 'On target' : `${drift > 0 ? 'Overweight' : 'Underweight'} ${Math.abs(drift).toFixed(1)}%`}
                  </div>
                </div>
              );
            }) ?? <div className="skeleton h-[260px]" />}
          </div>
        </Card>

        {/* Risk posture by client */}
        <Card className="p-5">
          <div className="label mb-1">AUM by Risk Posture</div>
          <div className="text-sm text-[var(--muted)] mb-4">Client risk profiles weighted by assets</div>
          <div className="flex flex-col gap-5 mt-2">
            {data?.byRisk.slice().sort((a, b) => b.value - a.value).map((r) => {
              const pct = (r.value / data.byRisk.reduce((s, x) => s + x.value, 0)) * 100;
              const color = r.risk_profile === 'Aggressive' ? '#ff5c6c' : r.risk_profile === 'Conservative' ? '#37c2a8' : '#6ea8fe';
              return (
                <div key={r.risk_profile}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium">{r.risk_profile}</span>
                    <span className="tnum">{fmtMoney(r.value, { compact: true })}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="text-[11px] text-[var(--muted)] mt-1">{fmtNum(r.clients)} clients · {pct.toFixed(0)}% of AUM</div>
                </div>
              );
            }) ?? <div className="skeleton h-[260px]" />}
          </div>
        </Card>
      </div>

      {/* Top concentrations */}
      <Card className="p-5">
        <div className="label mb-4">Top Firm-Wide Concentrations</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          {data?.concentrations.map((c, i) => (
            <div key={c.symbol} className="flex items-center gap-3 py-2">
              <span className="tnum text-[var(--muted)] w-5 text-sm">{i + 1}</span>
              <span className="w-9 h-9 rounded-lg grid place-items-center text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.05)' }}>{c.symbol.slice(0, 3)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{c.symbol} <span className="text-[var(--muted)] font-normal text-xs">{c.asset_class}</span></div>
                <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden mt-1.5">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, c.pct * 12)}%`, background: 'linear-gradient(90deg,#6ea8fe,#9d7bff)' }} />
                </div>
              </div>
              <div className="text-right">
                <div className="tnum text-sm">{fmtMoney(c.value, { compact: true })}</div>
                <div className="tnum text-[11px] text-[var(--muted)]">{c.pct.toFixed(2)}%</div>
              </div>
            </div>
          )) ?? <div className="skeleton h-[200px]" />}
        </div>
      </Card>
    </div>
  );
}

function Gauge({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'pos' | 'neg' }) {
  return (
    <Card hover className="p-4">
      <div className="label">{label}</div>
      <div className={`text-[26px] font-semibold mt-2 tnum ${tone}`}>{value}</div>
      <div className="text-[11px] text-[var(--muted)] mt-1">{sub}</div>
    </Card>
  );
}
