import { NextResponse } from 'next/server';
import { getClientList } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({ clients: await getClientList() });
}
