import { NextResponse } from 'next/server';
import { getIndices, getAllQuotes, getSectorHeat, getMovers } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const [indices, quotes, sectors, gainers, losers] = await Promise.all([
    getIndices(), getAllQuotes(), getSectorHeat(), getMovers('gainers', 8), getMovers('losers', 8),
  ]);
  return NextResponse.json({ indices, quotes, sectors, gainers, losers });
}
