import { readFileSync } from 'node:fs';
import path from 'node:path';

export type AnalystConfig = { baseUrl: string; orgId: string; projectId: string; apiKey: string };

// Read .analyst.json (kept out of the client bundle / git). Returns null when the
// file is missing or still has placeholder values.
export function getAnalystConfig(): AnalystConfig | null {
  let c: AnalystConfig | null = null;
  try {
    c = JSON.parse(readFileSync(path.join(process.cwd(), '.analyst.json'), 'utf8')) as AnalystConfig;
  } catch {
    // No file (e.g. cloud host) — fall back to env vars.
    const e = process.env;
    if (e.ANALYST_BASE_URL || e.ANALYST_API_KEY) {
      c = {
        baseUrl: e.ANALYST_BASE_URL ?? '',
        orgId: e.ANALYST_ORG_ID ?? '',
        projectId: e.ANALYST_PROJECT_ID ?? '',
        apiKey: e.ANALYST_API_KEY ?? '',
      };
    }
  }
  if (!c || !c.baseUrl || !c.orgId || !c.projectId || !c.apiKey) return null;
  if (Object.values(c).some((v) => String(v).startsWith('REPLACE_'))) return null;
  return c;
}

// Build a full Analyst endpoint URL. Tolerates a baseUrl that was copied straight
// from the Cloud Portal (which already includes /v1/.../analyst/<verb>) by
// trimming everything from /v1/organizations onward.
export function analystUrl(c: AnalystConfig, suffix: string, query?: Record<string, string | number | undefined>) {
  let b = c.baseUrl.trim();
  const idx = b.indexOf('/v1/organizations');
  if (idx >= 0) b = b.slice(0, idx);
  b = b.replace(/\/+$/, '');
  let url = `${b}/v1/organizations/${c.orgId}/projects/${c.projectId}/analyst/${suffix}`;
  if (query) {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }
  return url;
}

export function authHeaders(c: AnalystConfig): Record<string, string> {
  return { Authorization: `Bearer ${c.apiKey}`, 'Content-Type': 'application/json' };
}
