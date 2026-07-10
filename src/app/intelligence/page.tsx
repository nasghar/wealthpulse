'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, SquarePen, ArrowUp, Square, ChevronDown, Trash2, PanelLeft, LayoutDashboard, Code2 } from 'lucide-react';
import Link from 'next/link';
import { streamChat } from '@/components/copilot/stream';
import { applyEvent, nextId, seedId, type Msg } from '@/components/copilot/engine';
import { AssistantBubble, UserBubble } from '@/components/copilot/MessageView';

const USER_NAME = 'Nadeem';
const DOMAIN = 'WealthAdvisorContext';
const STORE_KEY = 'wi:conversations';
const AURA = 'linear-gradient(135deg,#e0a3ff,#a855f7 48%,#7c3aed)';

const STARTERS = [
  "What's our firm-wide AUM and how is it split by asset class?",
  'Who are our top 5 advisors by assets under management?',
  'Which clients have the highest concentration risk?',
  'How much advisory fee revenue did we collect this year?',
];

type Conversation = { id: string; title: string; sessionId?: string; msgs: Msg[]; updatedAt: number };

// Distinctive Aura sparkle mark (magenta→violet burst).
function AuraMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <radialGradient id="aura-g" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#ffd6f4" />
          <stop offset="42%" stopColor="#e879f9" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
      </defs>
      <path d="M50 3 C54 30 70 46 97 50 C70 54 54 70 50 97 C46 70 30 54 3 50 C30 46 46 30 50 3 Z" fill="url(#aura-g)" />
    </svg>
  );
}

export default function WealthIntelligence() {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [sideOpen, setSideOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stick = useRef(true);

  // Load persisted history once.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Conversation[];
        parsed.forEach((c) => c.msgs.forEach((m) => seedId(m.id)));
        setConvos(parsed);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // Persist on change (demo-scale; a handful of conversations).
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(convos.slice(0, 40))); } catch { /* quota */ }
  }, [convos, hydrated]);

  const active = useMemo(() => convos.find((c) => c.id === activeId) || null, [convos, activeId]);
  const msgs = active?.msgs ?? [];

  useEffect(() => { if (stick.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [convos, activeId]);
  useEffect(() => { setTimeout(() => taRef.current?.focus(), 100); }, [activeId]);

  function onScroll() {
    const el = scrollRef.current; if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
  }

  const patchMsg = useCallback((convId: string, msgId: number, fn: (m: Msg) => Msg, sid?: string) => {
    setConvos((prev) => prev.map((c) => c.id !== convId ? c : {
      ...c, updatedAt: Date.now(), sessionId: sid ?? c.sessionId,
      msgs: c.msgs.map((m) => (m.id === msgId ? fn(m) : m)),
    }));
  }, []);

  const ask = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput('');
    stick.current = true;

    const userMsg: Msg = { id: nextId(), role: 'user', text: q };
    const assistant: Msg = { id: nextId(), role: 'assistant', thinking: true, status: 'Thinking', steps: [], blocks: [] };

    // Resolve the target conversation (create one on first message).
    let convId = activeId;
    let priorSession: string | undefined;
    if (!convId) {
      convId = `c-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
      const title = q.length > 48 ? q.slice(0, 48) + '…' : q;
      setConvos((prev) => [{ id: convId!, title, msgs: [userMsg, assistant], updatedAt: Date.now() }, ...prev]);
      setActiveId(convId);
    } else {
      priorSession = convos.find((c) => c.id === convId)?.sessionId;
      setConvos((prev) => prev.map((c) => c.id === convId ? { ...c, updatedAt: Date.now(), msgs: [...c.msgs, userMsg, assistant] } : c));
    }

    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await streamChat({ message: q, session_id: priorSession }, (type, data) => {
        let sid: string | undefined;
        if (type === 'response.created') sid = (data.response as { session_id?: string })?.session_id;
        patchMsg(convId!, assistant.id, (m) => applyEvent(m, type, data), sid);
      }, ctrl.signal);
    } catch (e) {
      const aborted = (e as Error).name === 'AbortError';
      patchMsg(convId!, assistant.id, (m) => ({ ...m, done: true, thinking: false, status: undefined, error: aborted ? undefined : (e as Error).message }));
    } finally {
      patchMsg(convId!, assistant.id, (m) => (m.done ? m : { ...m, done: true, thinking: false, status: undefined }));
      setBusy(false);
      abortRef.current = null;
    }
  }, [busy, activeId, convos, patchMsg]);

  function newChat() { if (busy) return; setActiveId(null); setInput(''); setTimeout(() => taRef.current?.focus(), 60); }
  function stop() { abortRef.current?.abort(); }
  function deleteConv(id: string) {
    setConvos((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

  const filtered = convos.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));
  const empty = !active || msgs.length === 0;

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', background: 'var(--bg)' }}>
      {/* ───────── History sidebar ───────── */}
      {sideOpen && (
        <aside style={{ width: 274, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column',
          borderRight: '1px solid var(--border)', background: 'rgba(8,12,22,.6)', backdropFilter: 'blur(14px)' }}>
          <div style={{ padding: '16px 14px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(168,85,247,.14)', border: '1px solid rgba(168,85,247,.3)' }}>
                <AuraMark size={20} />
              </div>
              <div style={{ lineHeight: 1.1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Wealth Intelligence</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Code2 size={11} style={{ color: '#c084fc' }} /> Powered by Aura Code
                </div>
              </div>
            </div>

            <button onClick={newChat} disabled={busy}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderRadius: 11,
                border: '1px solid rgba(168,85,247,.35)', background: 'rgba(168,85,247,.12)', color: '#e9d5ff', fontWeight: 600, fontSize: 13.5,
                cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1 }}>
              <SquarePen size={15} /> New chat
            </button>

            <div style={{ position: 'relative', marginTop: 10 }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: 10, color: 'var(--muted)' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats…"
                style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 10, background: 'var(--panel-2)',
                  border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 12px' }}>
            <div className="label" style={{ padding: '6px 6px 4px' }}>History</div>
            {filtered.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12.5, padding: '8px 6px' }}>{convos.length ? 'No matches.' : 'Your conversations appear here.'}</div>}
            {filtered.map((c) => (
              <div key={c.id} onClick={() => { if (!busy) { setActiveId(c.id); stick.current = true; } }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 8px', borderRadius: 9, cursor: 'pointer',
                  background: c.id === activeId ? 'rgba(168,85,247,.14)' : 'transparent', marginBottom: 1 }}
                onMouseEnter={(e) => { if (c.id !== activeId) (e.currentTarget.style.background = 'rgba(255,255,255,.04)'); }}
                onMouseLeave={(e) => { if (c.id !== activeId) (e.currentTarget.style.background = 'transparent'); }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: c.id === activeId ? 'var(--text)' : '#c3ccdc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteConv(c.id); }} title="Delete"
                  style={{ opacity: .55, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px', borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: 13 }}>
            <LayoutDashboard size={15} /> Back to WealthPulse
          </Link>
        </aside>
      )}

      {/* ───────── Main ───────── */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={() => setSideOpen((v) => !v)} title="Toggle sidebar"
            style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 8, color: 'var(--muted)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer' }}>
            <PanelLeft size={16} />
          </button>
          <ContextChip />
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="live-dot" style={{ width: 7, height: 7 }} /> One context engine · live data · RBAC-governed
          </span>
        </div>

        {empty ? (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 24 }}>
            <div style={{ width: 'min(720px,100%)', textAlign: 'center' }}>
              <div style={{ display: 'grid', placeItems: 'center', marginBottom: 18 }}>
                <div style={{ width: 62, height: 62, borderRadius: 18, display: 'grid', placeItems: 'center',
                  background: 'rgba(168,85,247,.12)', border: '1px solid rgba(168,85,247,.28)', boxShadow: '0 20px 60px -24px rgba(168,85,247,.6)' }}>
                  <AuraMark size={34} />
                </div>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>👋 Hi {USER_NAME}, how can I help you with your data?</h1>
              <p style={{ color: 'var(--muted)', fontSize: 15, marginTop: 10 }}>Ask anything about clients, advisors, AUM, fees, flows, risk — grounded in live context.</p>
              <div style={{ marginTop: 26 }}><Composer big value={input} setValue={setInput} onSend={() => ask(input)} busy={busy} onStop={stop} taRef={taRef} /></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, justifyContent: 'center', marginTop: 20 }}>
                {STARTERS.map((s, i) => (
                  <button key={i} onClick={() => ask(s)}
                    style={{ fontSize: 12.5, padding: '8px 13px', borderRadius: 999, border: '1px solid var(--border)', color: '#c3ccdc',
                      background: 'rgba(255,255,255,.02)', cursor: 'pointer', maxWidth: 320, textAlign: 'left' }}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ maxWidth: 780, margin: '0 auto', padding: '26px 20px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {msgs.map((m) => (m.role === 'user' ? <UserBubble key={m.id} text={m.text!} /> : <AssistantBubble key={m.id} msg={m} onPick={ask} />))}
            </div>
          </div>
        )}

        {!empty && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px 10px', flexShrink: 0 }}>
            <div style={{ maxWidth: 780, margin: '0 auto' }}>
              <Composer value={input} setValue={setInput} onSend={() => ask(input)} busy={busy} onStop={stop} taRef={taRef} />
              <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--muted)', marginTop: 8 }}>
                Wealth Intelligence uses Aura and can make mistakes · Powered by Aura Code on SingleStore
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ContextChip() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 10,
      border: '1px solid rgba(168,85,247,.32)', background: 'rgba(168,85,247,.1)', fontSize: 12.5, fontWeight: 600, color: '#e9d5ff' }}>
      <AuraMark size={13} /> {DOMAIN} <ChevronDown size={13} style={{ opacity: .7 }} />
    </div>
  );
}

function Composer({ value, setValue, onSend, busy, onStop, taRef, big }: {
  value: string; setValue: (v: string) => void; onSend: () => void; busy: boolean; onStop: () => void;
  taRef: React.RefObject<HTMLTextAreaElement | null>; big?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, borderRadius: 16, border: '1px solid var(--border-strong)',
      background: 'rgba(255,255,255,.03)', padding: big ? '12px 12px 12px 16px' : '9px 9px 9px 14px' }}>
      {big && <div style={{ alignSelf: 'center', marginRight: 2 }}><ContextChipMini /></div>}
      <textarea ref={taRef} value={value} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        rows={1} placeholder="Explore your data…"
        style={{ flex: 1, background: 'transparent', outline: 'none', resize: 'none', color: 'var(--text)',
          fontSize: 14.5, lineHeight: 1.5, maxHeight: 140, paddingTop: 4, fontFamily: 'inherit' }} />
      {busy ? (
        <button onClick={onStop} title="Stop" style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center',
          background: 'rgba(255,255,255,.1)', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
          <Square size={13} style={{ color: 'var(--text)', fill: 'currentColor' }} />
        </button>
      ) : (
        <button onClick={onSend} disabled={!value.trim()} title="Send"
          style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', border: 'none', flexShrink: 0,
            cursor: value.trim() ? 'pointer' : 'default', background: value.trim() ? AURA : 'rgba(255,255,255,.08)' }}>
          <ArrowUp size={17} style={{ color: value.trim() ? '#fff' : 'var(--muted)' }} />
        </button>
      )}
    </div>
  );
}

function ContextChipMini() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 8,
      border: '1px solid rgba(168,85,247,.3)', background: 'rgba(168,85,247,.1)', fontSize: 12, fontWeight: 600, color: '#e9d5ff', whiteSpace: 'nowrap' }}>
      <AuraMark size={12} /> {DOMAIN} <ChevronDown size={12} style={{ opacity: .7 }} />
    </span>
  );
}
