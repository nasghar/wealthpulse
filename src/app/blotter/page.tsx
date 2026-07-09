'use client';
import { useState } from 'react';
import { usePoll } from '@/lib/usePoll';
import { Card, PageHeader, Pill } from '@/components/ui';
import { fmtMoney, fmtNum, fmtPrice } from '@/lib/format';

type Row = { txn_id: number; symbol: string; txn_type: string; quantity: number; price: number; amount: number; txn_ts: string; client: string; account_type: string };
type Blotter = { rows: Row[]; stats: { trades_today: number; buy_vol: number; sell_vol: number } };
const TYPES = ['ALL', 'BUY', 'SELL', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL', 'FEE'];

export default function BlotterPage() {
  const [type, setType] = useState('ALL');
  const { data } = usePoll<Blotter>(`/api/blotter?type=${type}`, 2500);
  const rows = data?.rows ?? [];

  return (
    <div>
      <PageHeader title="Trade Blotter" subtitle="Firm-wide transaction feed across all client accounts"
        right={<Pill tone="pos"><span className="live-dot" /> Streaming</Pill>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Card hover className="p-4"><div className="label">Trades · 24h</div><div className="text-[22px] font-semibold mt-2 tnum">{fmtNum(data?.stats.trades_today ?? 0)}</div></Card>
        <Card hover className="p-4"><div className="label">Buy Volume · 7d</div><div className="text-[22px] font-semibold mt-2 tnum pos">{fmtMoney(data?.stats.buy_vol ?? 0, { compact: true })}</div></Card>
        <Card hover className="p-4"><div className="label">Sell Volume · 7d</div><div className="text-[22px] font-semibold mt-2 tnum neg">{fmtMoney(data?.stats.sell_vol ?? 0, { compact: true })}</div></Card>
        <Card hover className="p-4"><div className="label">Net Flow · 7d</div><div className={`text-[22px] font-semibold mt-2 tnum ${(data?.stats.buy_vol ?? 0) - (data?.stats.sell_vol ?? 0) >= 0 ? 'neg' : 'pos'}`}>{fmtMoney((data?.stats.sell_vol ?? 0) - (data?.stats.buy_vol ?? 0), { compact: true })}</div></Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="label">Transaction Feed</div>
          <div className="flex gap-1.5 flex-wrap">
            {TYPES.map((t) => (
              <button key={t} onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${type === t ? 'border-[var(--border-strong)] bg-[rgba(255,255,255,0.06)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--muted)] text-[11px] uppercase tracking-wider">
                <th className="text-left font-semibold pb-3 pl-1">Time</th>
                <th className="text-left font-semibold pb-3">Type</th>
                <th className="text-left font-semibold pb-3">Symbol</th>
                <th className="text-left font-semibold pb-3">Client</th>
                <th className="text-left font-semibold pb-3">Account</th>
                <th className="text-right font-semibold pb-3">Qty</th>
                <th className="text-right font-semibold pb-3">Price</th>
                <th className="text-right font-semibold pb-3 pr-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.txn_id} className="border-t border-[var(--border)] hover:bg-[rgba(255,255,255,0.025)]">
                  <td className="py-2.5 pl-1 text-[var(--muted)] text-xs tnum whitespace-nowrap">{new Date(r.txn_ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="py-2.5"><TypeTag type={r.txn_type} /></td>
                  <td className="py-2.5 font-semibold">{r.symbol}</td>
                  <td className="py-2.5 text-[var(--muted)]">{r.client}</td>
                  <td className="py-2.5 text-[var(--muted)] text-xs">{r.account_type}</td>
                  <td className="py-2.5 text-right tnum text-[var(--muted)]">{r.quantity ? fmtNum(r.quantity, r.quantity < 10 ? 4 : 0) : '—'}</td>
                  <td className="py-2.5 text-right tnum text-[var(--muted)]">{r.price ? fmtPrice(r.price) : '—'}</td>
                  <td className="py-2.5 text-right pr-1 tnum font-medium"><span className={Number(r.amount) >= 0 ? 'pos' : 'text-[var(--text)]'}>{Number(r.amount) >= 0 ? '+' : ''}{fmtMoney(Number(r.amount), { compact: true })}</span></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={8}><div className="skeleton h-[420px] w-full my-2" /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function TypeTag({ type }: { type: string }) {
  const map: Record<string, 'blue' | 'gold' | 'pos' | 'neg' | 'default'> = {
    BUY: 'blue', SELL: 'gold', DIVIDEND: 'pos', DEPOSIT: 'pos', WITHDRAWAL: 'neg', FEE: 'default',
  };
  return <Pill tone={map[type] || 'default'}>{type}</Pill>;
}
