'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePoll } from '@/lib/usePoll';
import { Card, PageHeader, Pill } from '@/components/ui';
import { fmtMoney, fmtNum } from '@/lib/format';
import { Search } from 'lucide-react';

type Client = {
  client_id: number; name: string; household: string; segment: string;
  risk_profile: string; advisor: string; accounts: number; aum: number; day_pnl: number;
};
const SEGS = ['All', 'UHNW', 'HNW', 'Mass Affluent'];

export default function ClientsPage() {
  const { data } = usePoll<{ clients: Client[] }>('/api/clients', 3500);
  const [seg, setSeg] = useState('All');
  const [search, setSearch] = useState('');
  const all = data?.clients ?? [];
  const filtered = all.filter((c) =>
    (seg === 'All' || c.segment === seg) &&
    (!search || c.name.toLowerCase().includes(search.toLowerCase()) || c.household.toLowerCase().includes(search.toLowerCase()))
  );
  const shown = filtered.slice(0, 100);

  return (
    <div>
      <PageHeader title="Clients" subtitle="Every household, valued live against the market"
        right={<Pill tone="gold">{fmtNum(all.length)} clients</Pill>} />

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 h-9 rounded-lg border border-[var(--border)] w-[280px]">
            <Search size={15} className="text-[var(--muted)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients or households…"
              className="bg-transparent outline-none text-sm w-full placeholder:text-[var(--muted)]" />
          </div>
          <div className="flex gap-1.5">
            {SEGS.map((s) => (
              <button key={s} onClick={() => setSeg(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${seg === s ? 'border-[var(--border-strong)] bg-[rgba(255,255,255,0.06)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--muted)] text-[11px] uppercase tracking-wider">
                <th className="text-left font-semibold pb-3 pl-1">Client / Household</th>
                <th className="text-left font-semibold pb-3">Segment</th>
                <th className="text-left font-semibold pb-3">Risk</th>
                <th className="text-left font-semibold pb-3">Advisor</th>
                <th className="text-right font-semibold pb-3">Accounts</th>
                <th className="text-right font-semibold pb-3">AUM</th>
                <th className="text-right font-semibold pb-3 pr-1">Day P&L</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.client_id} className="border-t border-[var(--border)] hover:bg-[rgba(255,255,255,0.03)] cursor-pointer">
                  <td className="py-3 pl-1">
                    <Link href={`/clients/${c.client_id}`} className="block">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-[11px] text-[var(--muted)]">{c.household}</div>
                    </Link>
                  </td>
                  <td className="py-3"><SegPill seg={c.segment} /></td>
                  <td className="py-3 text-[var(--muted)]">{c.risk_profile}</td>
                  <td className="py-3 text-[var(--muted)]">{c.advisor}</td>
                  <td className="py-3 text-right tnum">{c.accounts}</td>
                  <td className="py-3 text-right tnum font-medium">{fmtMoney(c.aum, { compact: true })}</td>
                  <td className="py-3 text-right pr-1">
                    <span className={`tnum ${c.day_pnl >= 0 ? 'pos' : 'neg'}`}>{c.day_pnl >= 0 ? '+' : ''}{fmtMoney(c.day_pnl, { compact: true })}</span>
                  </td>
                </tr>
              ))}
              {!all.length && <tr><td colSpan={7}><div className="skeleton h-[400px] w-full my-2" /></td></tr>}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && <div className="text-xs text-[var(--muted)] mt-4 text-center">Showing top 100 of {fmtNum(filtered.length)} by AUM</div>}
      </Card>
    </div>
  );
}

function SegPill({ seg }: { seg: string }) {
  const tone = seg === 'UHNW' ? 'gold' : seg === 'HNW' ? 'blue' : 'default';
  return <Pill tone={tone as 'gold' | 'blue' | 'default'}>{seg}</Pill>;
}
