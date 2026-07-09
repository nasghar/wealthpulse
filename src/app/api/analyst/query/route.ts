import { NextRequest, NextResponse } from 'next/server';
import { getAnalystConfig, analystUrl, authHeaders } from '@/lib/analyst';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Proxy to Aura Analyst's Structured Query endpoint. Keeps the Bearer key
// server-side and folds the resolved session id / trace id into the JSON body.
export async function POST(req: NextRequest) {
  const cfg = getAnalystConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: { code: 'NOT_CONFIGURED', message: 'Analyst API is not configured. Fill in .analyst.json (baseUrl, orgId, projectId, apiKey).' } },
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
  if (body.include_thoughts) payload.include_thoughts = true;
  // output_modes omitted → Analyst auto-selects (text / data / sql / chart).

  let upstream: Response;
  try {
    upstream = await fetch(analystUrl(cfg, 'query'), {
      method: 'POST',
      headers: authHeaders(cfg),
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'UPSTREAM_UNREACHABLE', message: `Could not reach the Analyst API: ${String((e as Error).message)}` } },
      { status: 502 }
    );
  }

  const sessionId = upstream.headers.get('x-s2-analyst-session-id') || undefined;
  const traceId = upstream.headers.get('singlestore-trace-id') || undefined;
  const text = await upstream.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { error: { code: 'BAD_UPSTREAM_RESPONSE', message: text.slice(0, 400) || 'Non-JSON response from Analyst API.' } };
  }

  if (!upstream.ok) {
    const err = (json.error as Record<string, unknown>) || {};
    const code = (err.code || err.error_category || `HTTP_${upstream.status}`) as string;
    const message = (err.message || err.error_code || `Analyst API returned ${upstream.status}.`) as string;
    return NextResponse.json({ error: { code, message }, traceId }, { status: upstream.status });
  }

  return NextResponse.json({ ...json, sessionId, traceId });
}
