// Shared streaming-message model + SSE event reducer for the Aura Analyst UIs.
// Used by BOTH the embedded sidecar (Copilot) and the full-page Wealth
// Intelligence workbench — same API, same rendering, one source of truth.
import type { AnalystEvent } from './stream';

export type Step = { title: string; text: string };
export type Block =
  | { kind: 'text'; text: string }
  | { kind: 'data'; title?: string; columns: string[]; rows: unknown[][]; sql?: string }
  | { kind: 'chart'; figure: Record<string, unknown> }
  | { kind: 'pending'; text: string };
export type Msg = {
  id: number; role: 'user' | 'assistant'; text?: string;
  steps?: Step[]; thinking?: boolean; thoughtMs?: number; _start?: number;
  blocks?: Block[]; followups?: string[]; status?: string; done?: boolean; error?: string;
};

let _id = 1;
export const nextId = () => _id++;
// Bump the counter past ids restored from persisted history so new messages
// never reuse a key that already exists in a reopened conversation.
export const seedId = (n: number) => { if (n >= _id) _id = n + 1; };
const now = () => Date.now();

// Reduce one SSE event into the assistant message.
export function applyEvent(m: Msg, type: string, data: AnalystEvent): Msg {
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
