'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePoll } from '@/lib/usePoll';
import { Card, Delta, LiveNumber, Pill } from '@/components/ui';
import { AumAreaChart, Donut } from '@/components/charts';
import { fmtMoney, fmtNum, fmtPrice, ASSET_COLORS } from '@/lib/format';
import { ArrowLeft } from 'lucide-react';

type Detail = {
  client: { client_id: number; name: string; household: string; segment: string; risk_profile: string; email: string; join_date: string; advisor: string; team: string };
  accounts: { account_id: number; account_type: string; cash_balance: number; value: number; day_pnl: number }[];
  holdings: { symbol: string; name: string; asset_class: string; sector: string; quantity: number; avg_cost: number; price: number; day_change_pct: number; market_value: number; unrealized: number }[];
  allocation: { asset_class: string; value: number }[];
  perf: { d: string; v: number }[];
  txns: { symbol: string; txn_type: string; quantity: number; price: number; amount: number; txn_ts: string }[];
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = usePoll<Detail>(`/api/clients/${id}`, 2500);

  if (!data) return <div className="skeleton h-[600px] w-full rounded-2xl" />;
  const { client, accounts, holdings, allocation, perf, txns } = data;
  const totalValue = accounts.reduce((s, a) => s + a.value + Number(a.cash_balance), 0);
  const dayPnl = accounts.reduce((s, a) => s + a.day_pnl, 0);
  const unrealized = holdings.reduce((s, h) => s + h.unrealized, 0);
  const costBasis = totalValue - unrealized;

  return (
    <div>
      <Link href="/clients" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)] mb-4 transition">
        <ArrowLeft size={15} /> All clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl grid place-items-center text-lg font-bold" style={{ background: 'linear-gradient(135deg,#f0d692,#b88a30)', color: '#1a1206' }}>
            {client.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <div className="text-sm text-[var(--muted)] mt-0.5">{client.household} · Advisor: {client.advisor} ({client.team})</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Pill tone={client.segment === 'UHNW' ? 'gold' : client.segment === 'HNW' ? 'blue' : 'default'}>{client.segment}</Pill>
          <Pill>{client.risk_profile}</Pill>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Card hover className="p-4">
          <div className="label">Portfolio Value</div>
          <div className="text-[22px] font-semibold mt-2 gold-text"><LiveNumber value={totalValue} format={(n) => fmtMoney(n, { compact: true })} /></div>
          <div className="text-xs mt-1"><Delta value={(dayPnl / (totalValue - dayPnl)) * 100} /> today</div>
        </Card>
        <Card hover className="p-4">
          <div className="label">Intraday P&L</div>
          <div className={`text-[22px] font-semibold mt-2 ${dayPnl >= 0 ? 'pos' : 'neg'}`}><LiveNumber value={dayPnl} format={(n) => `${n >= 0 ? '+' : ''}${fmtMoney(n, { compact: true })}`} /></div>
          <div className="text-xs text-[var(--muted)] mt-1">{fmtNum(holdings.length)} holdings</div>
        </Card>
        <Card hover className="p-4">
          <div className="label">Unrealized Gain</div>
          <div className={`text-[22px] font-semibold mt-2 ${unrealized >= 0 ? 'pos' : 'neg'}`}>{unrealized >= 0 ? '+' : ''}{fmtMoney(unrealized, { compact: true })}</div>
          <div className="text-xs text-[var(--muted)] mt-1">{fmtMoney(costBasis, { compact: true })} cost basis</div>
        </Card>
        <Card hover className="p-4">
          <div className="label">Accounts</div>
          <div className="text-[22px] font-semibold mt-2">{accounts.length}</div>
          <div className="text-xs text-[var(--muted)] mt-1">{accounts.map((a) => a.account_type).join(' · ')}</div>
        </Card>
      </div>

      {/* Perf + allocation */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <Card className="xl:col-span-2 p-5">
          <div className="label mb-1">Portfolio Performance</div>
          <div className="text-sm text-[var(--muted)] mb-3">Total value · trailing 24 months</div>
          <AumAreaChart data={perf} color="#6ea8fe" />
        </Card>
        <Card className="p-5">
          <div className="label mb-2">Allocation</div>
          <Donut data={allocation.map((a) => ({ name: a.asset_class, value: a.value, color: ASSET_COLORS[a.asset_class] || '#888' }))} />
          <div className="flex flex-col gap-1.5 mt-3">
            {allocation.map((a) => (
              <div key={a.asset_class} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: ASSET_COLORS[a.asset_class] }} />{a.asset_class}</span>
                <span className="tnum text-[var(--muted)]">{((a.value / allocation.reduce((s, x) => s + x.value, 0)) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Holdings */}
      <Card className="p-5 mb-5">
        <div className="label mb-4">Holdings · {fmtNum(holdings.length)} positions</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--muted)] text-[11px] uppercase tracking-wider">
                <th className="text-left font-semibold pb-3 pl-1">Symbol</th>
                <th className="text-left font-semibold pb-3">Class</th>
                <th className="text-right font-semibold pb-3">Qty</th>
                <th className="text-right font-semibold pb-3">Avg Cost</th>
                <th className="text-right font-semibold pb-3">Price</th>
                <th className="text-right font-semibold pb-3">Day</th>
                <th className="text-right font-semibold pb-3">Mkt Value</th>
                <th className="text-right font-semibold pb-3 pr-1">Unrealized</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.symbol} className="border-t border-[var(--border)] hover:bg-[rgba(255,255,255,0.025)]">
                  <td className="py-2.5 pl-1"><div className="font-semibold">{h.symbol}</div><div className="text-[11px] text-[var(--muted)] max-w-[180px] truncate">{h.name}</div></td>
                  <td className="py-2.5"><span className="badge" style={{ color: ASSET_COLORS[h.asset_class], borderColor: 'var(--border-strong)' }}>{h.asset_class}</span></td>
                  <td className="py-2.5 text-right tnum text-[var(--muted)]">{fmtNum(h.quantity, h.quantity < 10 ? 4 : 0)}</td>
                  <td className="py-2.5 text-right tnum text-[var(--muted)]">{fmtPrice(h.avg_cost)}</td>
                  <td className="py-2.5 text-right tnum"><LiveNumber value={h.price} format={fmtPrice} /></td>
                  <td className="py-2.5 text-right"><Delta value={h.day_change_pct} showArrow={false} /></td>
                  <td className="py-2.5 text-right tnum font-medium">{fmtMoney(h.market_value, { compact: true })}</td>
                  <td className="py-2.5 text-right pr-1"><span className={`tnum ${h.unrealized >= 0 ? 'pos' : 'neg'}`}>{h.unrealized >= 0 ? '+' : ''}{fmtMoney(h.unrealized, { compact: true })}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent activity */}
      <Card className="p-5">
        <div className="label mb-3">Recent Activity</div>
        <div className="flex flex-col">
          {txns.map((t, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-t border-[var(--border)] first:border-0 text-sm">
              <div className="flex items-center gap-3">
                <TxnTag type={t.txn_type} />
                <span className="font-medium w-14">{t.symbol}</span>
                <span className="text-[var(--muted)] text-xs">{new Date(t.txn_ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <span className={`tnum ${Number(t.amount) >= 0 ? 'pos' : 'text-[var(--text)]'}`}>{Number(t.amount) >= 0 ? '+' : ''}{fmtMoney(Number(t.amount), { compact: true })}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TxnTag({ type }: { type: string }) {
  const map: Record<string, string> = {
    BUY: 'blue', SELL: 'gold', DIVIDEND: 'pos', DEPOSIT: 'pos', WITHDRAWAL: 'neg', FEE: 'default',
  };
  return <Pill tone={(map[type] || 'default') as 'blue' | 'gold' | 'pos' | 'neg' | 'default'}>{type}</Pill>;
}
