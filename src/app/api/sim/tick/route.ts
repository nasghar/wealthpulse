import { NextRequest, NextResponse } from 'next/server';
import { runTick } from '@/lib/sim';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// One simulation step. The UI polls this on an interval while "Live" is on.
// Protected by the auth proxy, so only logged-in visitors can drive the market.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const withHistory = Boolean(body?.history);
  try {
    const r = await runTick(withHistory);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'TICK_FAILED', message: (e as Error).message } },
      { status: 500 }
    );
  }
}
