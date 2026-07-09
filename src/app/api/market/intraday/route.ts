import { NextRequest, NextResponse } from 'next/server';
import { getIntraday } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol') || 'SPY';
  return NextResponse.json({ symbol, points: await getIntraday(symbol) });
}
