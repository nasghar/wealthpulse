import { NextRequest, NextResponse } from 'next/server';
import { getAnalystConfig, analystUrl, authHeaders } from '@/lib/analyst';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Pass-through proxy for Aura Analyst's streaming chat (SSE). Keeps the Bearer key
// server-side and streams the upstream event stream straight to the browser.
export async function POST(req: NextRequest) {
  const cfg = getAnalystConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: { code: 'NOT_CONFIGURED', message: 'Analyst API is not configured. Fill in .analyst.json.' } },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const message = (body?.message || '').toString().trim();
  if (!message) {
    return NextResponse.json({ error: { code: 'MISSING_MESSAGE', message: 'Ask a question first.' } }, { status: 400 });
  }

  const payload: Record<string, unknown> = { message };
  if (body.session_id) payload.session_id = body.session_id;
  // included_events omitted → receive every event (reasoning, text, follow-ups, data).

  let upstream: Response;
  try {
    upstream = await fetch(analystUrl(cfg, 'chat'), {
      method: 'POST',
      headers: { ...authHeaders(cfg), Accept: 'text/event-stream' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'UPSTREAM_UNREACHABLE', message: `Could not reach the Analyst API: ${String((e as Error).message)}` } },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    const t = await upstream.text().catch(() => '');
    let j: { error?: { code?: string; message?: string } } = {};
    try { j = JSON.parse(t); } catch { /* non-json */ }
    const err = j.error || {};
    return NextResponse.json(
      { error: { code: err.code || `HTTP_${upstream.status}`, message: err.message || t.slice(0, 300) || `Analyst API returned ${upstream.status}.` } },
      { status: upstream.status }
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
