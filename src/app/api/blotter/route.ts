import { NextRequest, NextResponse } from 'next/server';
import { getBlotter } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED = ['ALL', 'BUY', 'SELL', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL', 'FEE'];

export async function GET(req: NextRequest) {
  const type = (req.nextUrl.searchParams.get('type') || 'ALL').toUpperCase();
  const safe = ALLOWED.includes(type) ? type : 'ALL';
  return NextResponse.json(await getBlotter(80, safe));
}
