'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Activity, Users, UserSquare2, ShieldAlert, ReceiptText, FileText } from 'lucide-react';

const NAV = [
  { href: '/', label: 'Executive', icon: LayoutDashboard },
  { href: '/market', label: 'Market Monitor', icon: Activity },
  { href: '/advisors', label: 'Advisor Book', icon: UserSquare2 },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/risk', label: 'Risk & Rebalance', icon: ShieldAlert },
  { href: '/blotter', label: 'Trade Blotter', icon: ReceiptText },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-[244px] shrink-0 h-screen sticky top-0 border-r border-[var(--border)] flex flex-col px-4 py-5 bg-[rgba(8,12,22,0.6)] backdrop-blur-xl">
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl grid place-items-center"
          style={{ background: 'linear-gradient(135deg, #f0d692, #b88a30)', boxShadow: '0 6px 20px -8px rgba(216,178,90,0.6)' }}>
          <span className="text-[#1a1206] font-bold text-lg">W</span>
        </div>
        <div>
          <div className="font-semibold leading-none text-[15px]">WealthPulse</div>
          <div className="text-[11px] text-[var(--muted)] mt-1">Private Wealth Platform</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`}>
              <Icon size={18} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <a href="/deck.html" target="_blank" rel="noreferrer"
          className="card p-3 text-[11px] text-[var(--muted)] hover:border-[var(--border-strong)] transition flex items-center gap-2">
          <FileText size={14} className="text-[var(--gold)]" />
          <span className="text-[var(--text)] font-semibold">Architecture briefing</span>
          <span className="ml-auto">↗</span>
        </a>
        <div className="card p-3 text-[11px] text-[var(--muted)] leading-relaxed">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="live-dot" />
            <span className="text-[var(--text)] font-semibold">Live HTAP feed</span>
          </div>
          Positions revalued in real time on <span className="text-[var(--gold)]">SingleStore</span>.
        </div>
      </div>
    </aside>
  );
}
