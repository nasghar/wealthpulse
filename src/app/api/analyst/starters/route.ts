import { NextResponse } from 'next/server';
import { getAnalystConfig, analystUrl, authHeaders } from '@/lib/analyst';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Wealth-domain fallbacks if the API isn't configured or the call fails.
const FALLBACK = [
  'How much advisory fee revenue did we collect last quarter?',
  'Show my top 10 clients by assets under management',
  'Which advisor has the largest book of business?',
  'What is our firm-wide AUM and how much has it moved today?',
  'Which UHNW clients are overweight crypto for their risk profile?',
  'Net new assets by advisor this year',
];

export async function GET() {
  const cfg = getAnalystConfig();
  if (!cfg) return NextResponse.json({ configured: false, starters: FALLBACK });

  try {
    const r = await fetch(analystUrl(cfg, 'conversation-starters', { limit: 6 }), { headers: authHeaders(cfg) });
    if (!r.ok) return NextResponse.json({ configured: true, starters: FALLBACK });
    const arr = await r.json();
    const starters = Array.isArray(arr)
      ? arr.map((s: { starterText?: string }) => s.starterText).filter(Boolean)
      : [];
    return NextResponse.json({ configured: true, starters: starters.length ? starters : FALLBACK });
  } catch {
    return NextResponse.json({ configured: true, starters: FALLBACK });
  }
}
