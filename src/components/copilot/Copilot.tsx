'use client';
import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, ArrowUp, RefreshCw, Lightbulb, Square } from 'lucide-react';
import { streamChat } from './stream';
import { applyEvent, nextId, type Msg } from './engine';
import { AssistantBubble, UserBubble } from './MessageView';

export function Copilot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [starters, setStarters] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stick = useRef(true);

  useEffect(() => {
    if (!open || starters.length) return;
    fetch('/api/analyst/starters').then((r) => r.json()).then((j) => setStarters(j.starters || [])).catch(() => {});
  }, [open, starters.length]);

  useEffect(() => {
    if (stick.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs]);

  useEffect(() => { if (open) setTimeout(() => taRef.current?.focus(), 120); }, [open]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) setOpen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [busy]);

  function onScroll() {
    const el = scrollRef.current; if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput('');
    stick.current = true;
    const assistantId = nextId();
    setMsgs((m) => [...m, { id: nextId(), role: 'user', text: q }, { id: assistantId, role: 'assistant', thinking: true, status: 'Thinking', steps: [], blocks: [] }]);
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await streamChat({ message: q, session_id: sessionId }, (type, data) => {
        if (type === 'response.created') {
          const sid = (data.response as { session_id?: string })?.session_id;
          if (sid) setSessionId(sid);
        }
        setMsgs((prev) => prev.map((x) => (x.id === assistantId ? applyEvent(x, type, data) : x)));
      }, ctrl.signal);
    } catch (e) {
      const aborted = (e as Error).name === 'AbortError';
      setMsgs((prev) => prev.map((x) => (x.id === assistantId
        ? { ...x, done: true, thinking: false, status: undefined, error: aborted ? undefined : (e as Error).message }
        : x)));
    } finally {
      setMsgs((prev) => prev.map((x) => (x.id === assistantId && !x.done ? { ...x, done: true, thinking: false, status: undefined } : x)));
      setBusy(false);
      abortRef.current = null;
    }
  }

  function stop() { abortRef.current?.abort(); }
  function reset() { if (busy) return; setMsgs([]); setSessionId(undefined); }

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="copilot-fab" aria-label="Open Analyst co-pilot">
          <Sparkles size={22} /><span className="copilot-fab-label">Ask Analyst</span>
        </button>
      )}

      {open && (
        <>
          <div className="copilot-scrim" onClick={() => !busy && setOpen(false)} />
          <div className="copilot-panel" role="dialog" aria-label="Analyst co-pilot">
            <div className="flex items-center gap-3 px-4 h-[60px] border-b border-[var(--border)] shrink-0">
              <div className="w-8 h-8 rounded-xl grid place-items-center shrink-0" style={{ background: 'linear-gradient(135deg,#f0d692,#b88a30)', boxShadow: '0 4px 14px -4px rgba(216,178,90,.6)' }}>
                <Sparkles size={17} className="text-[#1a1206]" />
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold leading-none">Analyst Co-pilot</div>
                <div className="text-[11px] text-[var(--muted)] mt-1 truncate">Ask anything about your book</div>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button onClick={reset} disabled={busy} title="New conversation" className="w-7 h-7 grid place-items-center rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[rgba(255,255,255,.06)] transition disabled:opacity-40">
                  <RefreshCw size={14} />
                </button>
                <button onClick={() => !busy && setOpen(false)} title="Collapse" className="w-7 h-7 grid place-items-center rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[rgba(255,255,255,.06)] transition">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              {msgs.length === 0 && <Welcome starters={starters} onPick={ask} />}
              {msgs.map((m) => (m.role === 'user' ? <UserBubble key={m.id} text={m.text!} /> : <AssistantBubble key={m.id} msg={m} onPick={ask} />))}
            </div>

            <div className="px-3 pb-3 pt-2 border-t border-[var(--border)] shrink-0">
              <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,.03)] px-3 py-2 focus-within:border-[var(--border-strong)] transition">
                <textarea
                  ref={taRef} value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } }}
                  rows={1} placeholder="Ask about clients, AUM, fees, risk…"
                  className="flex-1 bg-transparent outline-none resize-none text-sm leading-5 max-h-28 placeholder:text-[var(--muted)] py-1"
                />
                {busy ? (
                  <button onClick={stop} title="Stop" className="w-8 h-8 rounded-xl grid place-items-center shrink-0 bg-[rgba(255,255,255,.1)] hover:bg-[rgba(255,255,255,.16)] transition">
                    <Square size={13} className="text-[var(--text)] fill-current" />
                  </button>
                ) : (
                  <button onClick={() => ask(input)} disabled={!input.trim()} className="w-8 h-8 rounded-xl grid place-items-center shrink-0 transition disabled:opacity-40"
                    style={{ background: input.trim() ? 'linear-gradient(135deg,#f0d692,#b88a30)' : 'rgba(255,255,255,.08)' }}>
                    <ArrowUp size={16} className={input.trim() ? 'text-[#1a1206]' : 'text-[var(--muted)]'} />
                  </button>
                )}
              </div>
              <div className="text-[10px] text-[var(--muted)] text-center mt-2">Powered by SingleStore Aura Analyst · answers may need verification</div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Welcome({ starters, onPick }: { starters: string[]; onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center pt-6 pb-2">
      <div className="w-14 h-14 rounded-2xl grid place-items-center mb-4" style={{ background: 'linear-gradient(135deg,#f0d692,#b88a30)', boxShadow: '0 10px 30px -10px rgba(216,178,90,.6)' }}>
        <Sparkles size={26} className="text-[#1a1206]" />
      </div>
      <div className="text-[17px] font-semibold">Ask me anything about your data</div>
      <div className="text-[13px] text-[var(--muted)] mt-1.5 max-w-[280px]">Beyond the dashboards — clients, advisors, fees, flows, risk, performance. I’ll think it through and write the SQL.</div>
      <div className="flex flex-col gap-2 w-full mt-5">
        {starters.slice(0, 5).map((s, i) => (
          <button key={i} onClick={() => onPick(s)} className="text-left text-[13px] px-3.5 py-2.5 rounded-xl border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[rgba(255,255,255,.03)] transition flex items-center gap-2.5">
            <Lightbulb size={14} className="text-[var(--gold)] shrink-0" /><span>{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
