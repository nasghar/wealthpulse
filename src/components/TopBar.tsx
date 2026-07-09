'use client';
import { usePoll } from '@/lib/usePoll';
import { LiveNumber, Delta } from '@/components/ui';
import { fmtMoney } from '@/lib/format';
import { Search } from 'lucide-react';

type Pulse = { aum: number; dayPnl: number; dayPnlPct: number };

export function TopBar() {
  const { data } = usePoll<Pulse>('/api/pulse', 2000);
  const now = new Date();
  return (
    <header className="sticky top-0 z-20 h-[68px] px-7 flex items-center justify-between border-b border-[var(--border)] bg-[rgba(7,11,22,0.72)] backdrop-blur-xl">
      <div className="flex items-center gap-7">
        <div className="flex flex-col">
          <span className="label">Assets Under Management</span>
          <div className="flex items-baseline gap-3">
            <LiveNumber
              value={data?.aum ?? 0}
              format={(n) => fmtMoney(n, { compact: true })}
              className="text-xl font-semibold gold-text"
            />
            {data && (
              <span className="text-xs">
                <Delta value={data.dayPnlPct} /> <span className="text-[var(--muted)]">today</span>
              </span>
            )}
          </div>
        </div>
        <div className="hidden lg:flex flex-col border-l border-[var(--border)] pl-7">
          <span className="label">Intraday P&amp;L</span>
          {data && (
            <span className={`text-xl font-semibold tnum ${data.dayPnl >= 0 ? 'pos' : 'neg'}`}>
              {data.dayPnl >= 0 ? '+' : ''}{fmtMoney(data.dayPnl, { compact: true })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg border border-[var(--border)] text-[var(--muted)] text-sm w-[220px]">
          <Search size={15} />
          <span className="text-[13px]">Search clients, symbols…</span>
        </div>
        <div className="flex items-center gap-2 px-3 h-9 rounded-lg border border-[var(--border)]">
          <span className="live-dot" />
          <span className="text-[13px] font-medium">Markets Open</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full grid place-items-center text-[12px] font-semibold"
            style={{ background: 'linear-gradient(135deg,#2a3550,#1a2236)' }}>NA</div>
          <div className="hidden xl:block">
            <div className="text-[13px] font-medium leading-none">Nadeem A.</div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">Head of Wealth</div>
          </div>
        </div>
      </div>
    </header>
  );
}
