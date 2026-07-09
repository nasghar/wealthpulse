'use client';
import { usePoll } from '@/lib/usePoll';
import { Card, Delta, PageHeader, Pill } from '@/components/ui';
import { fmtMoney, fmtNum } from '@/lib/format';

type Adv = { advisor_id: number; name: string; team: string; region: string; clients: number; aum: number; day_pnl: number };

export default function AdvisorsPage() {
  const { data } = usePoll<{ advisors: Adv[] }>('/api/advisors', 3000);
  const rows = data?.advisors ?? [];
  const totalAum = rows.reduce((s, a) => s + a.aum, 0);
  const totalClients = rows.reduce((s, a) => s + a.clients, 0);
  const maxAum = Math.max(...(rows.map((a) => a.aum) ?? [1]), 1);

  return (
    <div>
      <PageHeader title="Advisor Book of Business" subtitle="Live AUM, client count, and intraday P&L by advisor"
        right={<Pill tone="gold">{fmtNum(rows.length)} advisors</Pill>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Stat label="Total Book" value={fmtMoney(totalAum, { compact: true })} />
        <Stat label="Clients Served" value={fmtNum(totalClients)} />
        <Stat label="Top Advisor" value={rows[0]?.name ?? '—'} sub={rows[0] ? fmtMoney(rows[0].aum, { compact: true }) : ''} />
        <Stat label="Avg Book Size" value={rows.length ? fmtMoney(totalAum / rows.length, { compact: true }) : '—'} />
      </div>

      <Card className="p-5">
        <div className="label mb-4">Advisor Leaderboard</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--muted)] text-[11px] uppercase tracking-wider">
                <th className="text-left font-semibold pb-3 pl-1 w-8">#</th>
                <th className="text-left font-semibold pb-3">Advisor</th>
                <th className="text-left font-semibold pb-3">Team</th>
                <th className="text-left font-semibold pb-3">Region</th>
                <th className="text-right font-semibold pb-3">Clients</th>
                <th className="text-left font-semibold pb-3 w-[200px]">AUM</th>
                <th className="text-right font-semibold pb-3 pr-1">Day P&L</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => (
                <tr key={a.advisor_id} className="border-t border-[var(--border)] hover:bg-[rgba(255,255,255,0.025)]">
                  <td className="py-3 pl-1 tnum text-[var(--muted)]">{i + 1}</td>
                  <td className="py-3 font-medium">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full grid place-items-center text-[10px] font-semibold" style={{ background: i < 3 ? 'linear-gradient(135deg,#f0d692,#b88a30)' : 'rgba(255,255,255,0.05)', color: i < 3 ? '#1a1206' : 'inherit' }}>
                        {a.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                      </div>
                      {a.name}
                    </div>
                  </td>
                  <td className="py-3 text-[var(--muted)]">{a.team}</td>
                  <td className="py-3 text-[var(--muted)]">{a.region}</td>
                  <td className="py-3 text-right tnum">{fmtNum(a.clients)}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 rounded-full flex-1 bg-[rgba(255,255,255,0.05)] overflow-hidden min-w-[60px]">
                        <div className="h-full rounded-full" style={{ width: `${(a.aum / maxAum) * 100}%`, background: 'linear-gradient(90deg,#6ea8fe,#9d7bff)' }} />
                      </div>
                      <span className="tnum text-[13px] w-[64px] text-right">{fmtMoney(a.aum, { compact: true })}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right pr-1">
                    <span className={`tnum ${a.day_pnl >= 0 ? 'pos' : 'neg'}`}>{a.day_pnl >= 0 ? '+' : ''}{fmtMoney(a.day_pnl, { compact: true })}</span>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7}><div className="skeleton h-[400px] w-full my-2" /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card hover className="p-4">
      <div className="label">{label}</div>
      <div className="text-xl font-semibold mt-2 truncate">{value}</div>
      {sub && <div className="text-xs text-[var(--muted)] mt-1">{sub}</div>}
    </Card>
  );
}
