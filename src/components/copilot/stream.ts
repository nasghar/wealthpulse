// Fetch-based SSE client for the Analyst chat proxy. Parses `event:`/`data:` frames
// (skipping the leading `ready` token), tolerates partial frames across chunks, and
// invokes onEvent(type, data) per frame. Lenient by design — bad frames are skipped.
export type AnalystEvent = { type: string; [k: string]: unknown };

export async function streamChat(
  body: { message: string; session_id?: string },
  onEvent: (type: string, data: AnalystEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch('/api/analyst/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.error?.message || j?.error?.code || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let sep: number;
    // SSE frames are separated by a blank line.
    while ((sep = buf.indexOf('\n\n')) >= 0) {
      const frame = buf.slice(0, sep);
      buf = buf.slice(sep + 2);

      let evt = '';
      let dataStr = '';
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) evt = line.slice(6).trim();
        else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
      }
      if (!dataStr) continue; // e.g. the leading `ready` priming token

      let data: AnalystEvent;
      try {
        data = JSON.parse(dataStr);
      } catch {
        continue;
      }
      onEvent(evt || data.type, data);
    }
  }
}
