'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Sparkles, Database, Code2, ChevronDown, AlertCircle, ArrowRight,
} from 'lucide-react';
import { PlotlyChart } from './PlotlyChart';
import type { Msg, Step, Block } from './engine';

// Shared message rendering for both the sidecar and the full-page workbench.
export function UserBubble({ text }: { text: string }) {
  return (
    <div className="self-end max-w-[85%]">
      <div className="rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm leading-relaxed" style={{ background: 'rgba(110,168,254,.14)', border: '1px solid rgba(110,168,254,.25)' }}>{text}</div>
    </div>
  );
}

export function AssistantBubble({ msg, onPick }: { msg: Msg; onPick: (q: string) => void }) {
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
  return (
    <div className="flex flex-col gap-2.5">
      {block.title && <div className="text-[12px] font-semibold text-[var(--text)]">{block.title}</div>}
      <DataTable columns={block.columns} rows={block.rows} />
      {block.sql && <SqlView command={block.sql} />}
    </div>
  );
}

// markdown-lite renderer (safe; no dangerouslySetInnerHTML)
export function renderRich(text: string): React.ReactNode {
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
