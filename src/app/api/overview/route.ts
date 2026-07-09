import { NextResponse } from 'next/server';
import {
  getFirmKpis, getAumTrend, getAllocation, getSegmentBreakdown, getMovers,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const [kpis, trend, allocation, segments, gainers, losers] = await Promise.all([
    getFirmKpis(), getAumTrend(), getAllocation(), getSegmentBreakdown(),
    getMovers('gainers'), getMovers('losers'),
  ]);
  return NextResponse.json({ kpis, trend, allocation, segments, gainers, losers });
}
