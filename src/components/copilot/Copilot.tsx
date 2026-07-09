'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Sparkles, X, ArrowUp, RefreshCw, Database, Code2, ChevronDown,
  AlertCircle, Lightbulb, Square, ArrowRight,
} from 'lucide-react';
import { PlotlyChart } from './PlotlyChart';
import { streamChat, type AnalystEvent } from './stream';

// ---- streaming message model ----
type Step = { title: string; text: string };
type Block =
  | { kind: 'text'; text: string }
  | { kind: 'data'; title?: string; columns: string[]; rows: unknown[][]; sql?: string }
  | { kind: 'chart'; figure: Record<string, unknown> }
  | { kind: 'pending'; text: string };
type Msg = {
  id: number; role: 'user' | 'assistant'; text?: string;
  steps?: Step[]; thinking?: boolean; thoughtMs?: number; _start?: number;
  blocks?: Block[]; followups?: string[]; status?: string; done?: boolean; error?: string;
};

let _id = 1;
const now = () => Date.now();

// Reduce one SSE event into the assistant message.
function applyEvent(m: Msg, type: string, data: AnalystEvent): Msg {
  const msg: Msg = { ...m, steps: m.steps ? [...m.steps] : [], blocks: m.blocks ? [...m.blocks] : [] };
  const steps = msg.steps!;
  const blocks = msg.blocks!;
  const lastStep = () => steps[steps.length - 1];
  const lastBlock = () => blocks[blocks.length - 1];
  if (!msg._start) msg._start = now();

  switch (type) {
    case 'response.created':
      msg.thinking = true; msg.status = 'Thinking';
      break;
    case 'skill.loading':
      msg.status = 'Loading domain context'; break;
    case 'skill.loaded':
      msg.status = 'Thinking'; break;
    case 'response.output_item.added': {
      const t = (data.item as { type?: string })?.type;
      if (t === 'thinking') { msg.thinking = true; msg.status = 'Thinking'; }
      else if (t === 'message') { msg.thinking = false; msg.thoughtMs = msg.thoughtMs ?? now() - msg._start; msg.status = 'Writing response'; }
      break;
    }
    case 'response.content_part.added': {
      const part = data.part as { type?: string; title?: string; text?: string };
      if (part?.type === 'reasoning') { steps.push({ title: part.title || 'Thinking', text: part.text || '' }); msg.status = part.title || 'Thinking'; msg.thinking = true; }
      else if (part?.type === 'output_text') { blocks.push({ kind: 'pending', text: '' }); }
      break;
    }
    case 'response.reasoning.replace':
      if (steps.length) { steps[steps.length - 1] = { ...lastStep(), text: (data.text as string) || '' }; msg.status = lastStep().title; }
      break;
    case 'response.reasoning.delta':
      if (steps.length) steps[steps.length - 1] = { ...lastStep(), text: (lastStep().text || '') + ((data.delta as string) || '') };
      break;
    case 'response.reasoning.done':
      if (steps.length) steps[steps.length - 1] = { title: (data.title as string) || lastStep().title, text: (data.text as string) ?? lastStep().text };
      break;
    case 'response.output_text.delta': {
      if (!blocks.length) blocks.push({ kind: 'pending', text: '' });
      const b = { ...lastBlock() } as Block & { text: string };
      b.text = (b.text || '') + ((data.delta as string) || '');
      if (b.kind === 'pending' && b.text.trimStart() && !b.text.trimStart().startsWith('{')) (b as Block).kind = 'text';
      blocks[blocks.length - 1] = b;
      msg.thinking = false; msg.status = 'Writing response';
      break;
    }
    case 'response.output_text.done': {
      const raw = ((data.text as string) ?? (lastBlock() as { text?: string })?.text ?? '').toString();
      let parsed: Record<string, unknown> | null = null;
      if (raw.trimStart().startsWith('{')) { try { parsed = JSON.parse(raw); } catch { parsed = null; } }
      if (parsed && parsed.type === 'table' && Array.isArray(parsed.table_data)) {
        blocks[blocks.length - 1] = {
          kind: 'data',
          title: parsed.title as string,
          columns: ((parsed.columns as Array<string | { name: string }>) || []).map((c) => (typeof c === 'string' ? c : c.name)),
          rows: parsed.table_data as unknown[][],
          sql: parsed.query as string,
        };
      } else if (parsed && parsed.type === 'chart') {
        const fig = (parsed.figure as Record<string, unknown>) || (parsed.data ? { data: parsed.data, layout: parsed.layout } : parsed);
        blocks[blocks.length - 1] = { kind: 'chart', figure: fig };
      } else {
        blocks[blocks.length - 1] = { kind: 'text', text: raw };
      }
      break;
    }
    case 'response.follow_up_queries_event':
      msg.followups = (data.follow_up_queries as string[]) || (data.queries as string[]) || [];
      break;
    case 'response.completed':
      msg.done = true; msg.thinking = false; msg.status = undefined;
      msg.thoughtMs = msg.thoughtMs ?? (msg._start ? now() - msg._start : undefined);
      break;
    case 'response.failed':
      msg.error = 'The analyst was unable to complete this request.'; msg.done = true; msg.thinking = false; msg.status = undefined;
      break;
    case 'custom.error_event':
      msg.error = (data.message as string) || (data.error as string) || 'A tool error occurred.';
      break;
  }
  return msg;
}

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
    const assistantId = _id++;
    setMsgs((m) => [...m, { id: _id++, role: 'user', text: q }, { id: assistantId, role: 'assistant', thinking: true, status: 'Thinking', steps: [], blocks: [] }]);
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

function UserBubble({ text }: { text: string }) {
  return (
    <div className="self-end max-w-[85%]">
      <div className="rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm leading-relaxed" style={{ background: 'rgba(110,168,254,.14)', border: '1px solid rgba(110,168,254,.25)' }}>{text}</div>
    </div>
  );
}

function AssistantBubble({ msg, onPick }: { msg: Msg; onPick: (q: string) => void }) {
  const hasText = msg.blocks?.some((b) => (b.kind === 'text' || b.kind === 'pending') && (b as { text?: string }).text);
  const showStatus = !msg.done && !!msg.status && !hasText;
  const lastTextIdx = (() => { let idx = -1; (msg.blocks || []).forEach((b, i) => { if (b.kind === 'text') idx = i; }); return idx; })();
  return (
    <div className="self-start w-full flex flex-col gap-2.5">
      {!!msg.steps?.length && <ThinkingPanel steps={msg.steps} thinking={!!msg.thinking} thoughtMs={msg.thoughtMs} status={msg.status} done={!!msg.done} />}
      {showStatus && <StatusLine label={msg.status!} />}
      {(msg.blocks || []).map((b, i) => <BlockView key={i} block={b} streaming={!msg.done && i === lastTextIdx} />)}
      {msg.error && (
        <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-[13px] bg-neg-soft border border-[rgba(255,92,108,.3)]">
          <AlertCircle size={15} className="neg shrink-0 mt-0.5" /><span className="neg">{msg.error}</span>
        </div>
      )}
      {msg.done && !!msg.followups?.length && (
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="label">Suggested follow-ups</div>
          {msg.followups.map((f, i) => (
            <button key={i} onClick={() => onPick(f)} className="text-left text-[12.5px] px-3 py-2 rounded-xl border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[rgba(255,255,255,.03)] transition flex items-center gap-2 group">
              <span className="flex-1">{f}</span>
              <ArrowRight size={13} className="opacity-0 group-hover:opacity-70 transition shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
      <Sparkles size={14} className="text-[var(--gold)] copilot-spin" />
      <span>{label}</span><span className="copilot-dots"><i /><i /><i /></span>
    </div>
  );
}

function ThinkingPanel({ steps, thinking, thoughtMs, status, done }: { steps: Step[]; thinking: boolean; thoughtMs?: number; status?: string; done: boolean }) {
  const [open, setOpen] = useState(true);
  const collapsed = useRef(false);
  useEffect(() => { if (done && !collapsed.current) { collapsed.current = true; setOpen(false); } }, [done]);
  const secs = thoughtMs ? Math.max(1, Math.round(thoughtMs / 1000)) : null;
  return (
    <div className="card rounded-xl overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] transition hover:bg-[rgba(255,255,255,.02)]">
        <Sparkles size={13} className={`text-[var(--gold)] ${thinking ? 'copilot-spin' : ''}`} />
        {thinking ? (
          <span className="flex items-center gap-2 text-[var(--text)] font-medium">
            <span>{status || 'Thinking'}</span><span className="copilot-dots"><i /><i /><i /></span>
          </span>
        ) : (
          <span className="text-[var(--muted)] font-medium">Thought{secs ? ` for ${secs}s` : ''} · {steps.length} step{steps.length === 1 ? '' : 's'}</span>
        )}
        <ChevronDown size={14} className={`ml-auto text-[var(--muted)] transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-[var(--border)] px-3 py-2.5 flex flex-col gap-3">
          {steps.map((s, i) => (
            <div key={i} className="relative pl-4">
              <span className="absolute left-0 top-[5px] w-1.5 h-1.5 rounded-full" style={{ background: i === steps.length - 1 && thinking ? 'var(--gold)' : 'var(--border-strong)' }} />
              <div className="text-[12px] font-medium text-[var(--text)]">{s.title}</div>
              {s.text && <div className="text-[11.5px] text-[var(--muted)] leading-relaxed mt-0.5 whitespace-pre-wrap">{renderRich(s.text)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BlockView({ block, streaming }: { block: Block; streaming: boolean }) {
  if (block.kind === 'pending') return <div className="skeleton h-4 w-40 rounded" />;
  if (block.kind === 'text') return <div className="text-[13.5px] leading-relaxed text-[var(--text)] copilot-rich">{renderRich(block.text)}{streaming && <span className="copilot-cursor" />}</div>;
  if (block.kind === 'chart') return <div className="card p-2 rounded-xl"><PlotlyChart figure={block.figure} /></div>;
  // data
  return (
    <div className="flex flex-col gap-2.5">
      {block.title && <div className="text-[12px] font-semibold text-[var(--text)]">{block.title}</div>}
      <DataTable columns={block.columns} rows={block.rows} />
      {block.sql && <SqlView command={block.sql} />}
    </div>
  );
}

// markdown-lite renderer (safe; no dangerouslySetInnerHTML)
function renderRich(text: string): React.ReactNode {
  const blocks = text.trim().split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const lines = block.split('\n');
    const isList = lines.every((l) => /^\s*[-*•]\s+/.test(l));
    const isNum = lines.every((l) => /^\s*\d+[.)]\s+/.test(l));
    if (isList || isNum) {
      const Tag = (isNum ? 'ol' : 'ul') as 'ol' | 'ul';
      return <Tag key={bi} className={`${isNum ? 'list-decimal' : 'list-disc'} pl-5 my-1 flex flex-col gap-1`}>{lines.map((l, li) => <li key={li}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ''))}</li>)}</Tag>;
    }
    if (/^#{1,3}\s/.test(block)) return <div key={bi} className="font-semibold text-[14px] mt-1">{inline(block.replace(/^#{1,3}\s/, ''))}</div>;
    return <p key={bi} className="my-1">{lines.map((l, i) => <span key={i}>{inline(l)}{i < lines.length - 1 && <br />}</span>)}</p>;
  });
}

function inline(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} className="font-semibold text-[var(--text)]">{p.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(p)) return <code key={i} className="px-1 py-0.5 rounded bg-[rgba(255,255,255,.08)] text-[var(--gold)] text-[12px]">{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  });
}

function fmtCell(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number') {
    if (Number.isInteger(v) && Math.abs(v) >= 1000) return v.toLocaleString('en-US');
    if (!Number.isInteger(v)) return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return String(v);
  }
  // numeric strings (the API returns big decimals as strings)
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) && v.length > 4) {
    const n = Number(v);
    if (!isNaN(n)) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return String(v);
}

function DataTable({ columns, rows }: { columns: string[]; rows: unknown[][] }) {
  const shown = rows.slice(0, 100);
  const numeric = columns.map((_, c) => rows.length > 0 && rows.every((r) => r[c] == null || typeof r[c] === 'number' || (typeof r[c] === 'string' && /^-?\d+(\.\d+)?$/.test(r[c] as string))));
  return (
    <div className="card rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] text-[11px] text-[var(--muted)]">
        <Database size={13} className="text-[var(--gold)]" />
        <span className="font-semibold uppercase tracking-wider">{rows.length} {rows.length === 1 ? 'row' : 'rows'}</span>
      </div>
      <div className="overflow-auto max-h-[280px]">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-[#0e1424]">
            <tr className="text-[var(--muted)]">{columns.map((c, i) => <th key={i} className={`text-${numeric[i] ? 'right' : 'left'} font-semibold px-3 py-2 whitespace-nowrap`}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((row, ri) => (
              <tr key={ri} className="border-t border-[var(--border)]">
                {columns.map((_, ci) => <td key={ci} className={`px-3 py-1.5 whitespace-nowrap tnum text-${numeric[ci] ? 'right' : 'left'} ${numeric[ci] ? '' : 'text-[var(--text)]'}`}>{fmtCell(row[ci])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > shown.length && <div className="text-[11px] text-[var(--muted)] px-3 py-1.5 border-t border-[var(--border)]">+{rows.length - shown.length} more rows</div>}
    </div>
  );
}

function SqlView({ command }: { command: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="card rounded-xl overflow-hidden">
      <button onClick={() => setShow((v) => !v)} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--muted)] hover:text-[var(--text)] transition">
        <Code2 size={13} className="text-[var(--accent)]" /><span className="font-semibold uppercase tracking-wider">Generated SQL</span>
        <ChevronDown size={14} className={`ml-auto transition ${show ? 'rotate-180' : ''}`} />
      </button>
      {show && <pre className="px-3 py-2.5 text-[11.5px] leading-relaxed overflow-auto text-[#cdd6e6] font-mono whitespace-pre-wrap border-t border-[var(--border)]">{command.trim()}</pre>}
    </div>
  );
}
