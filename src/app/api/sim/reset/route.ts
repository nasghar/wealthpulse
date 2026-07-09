import { NextRequest, NextResponse } from 'next/server';
import { resetSimulation, trimHistory } from '@/lib/sim';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Clean up history and reset the board. Body { mode: 'reset' | 'trim', keepHours? }.
// 'reset' (default) wipes price_ticks + flattens the day; 'trim' keeps a rolling window.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  try {
    if (body?.mode === 'trim') {
      const r = await trimHistory(Number(body?.keepHours) || 48);
      return NextResponse.json(r);
    }
    const r = await resetSimulation();
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'RESET_FAILED', message: (e as Error).message } },
      { status: 500 }
    );
  }
}
