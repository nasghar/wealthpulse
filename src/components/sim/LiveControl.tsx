'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Play, Square, RotateCcw, LogOut, ChevronUp } from 'lucide-react';

const CADENCES = [
  { label: '1.5s', ms: 1500 },
  { label: '3s', ms: 3000 },
  { label: '5s', ms: 5000 },
];

// Floating demo control (bottom-left). "Start Live" optionally wipes old history,
// then ticks the market by calling /api/sim/tick on an interval while this tab is
// open — the serverless-friendly way to run the simulation on Vercel.
export function LiveControl() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [cadence, setCadence] = useState(3000);
  const [wipeOnStart, setWipeOnStart] = useState(true);
  const [ticks, setTicks] = useState(0);
  const [lastTs, setLastTs] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);
  const tickCount = useRef(0);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    runningRef.current = false;
    setRunning(false);
  }, []);

  const doTick = useCallback(async () => {
    if (!runningRef.current) return;
    tickCount.current += 1;
    const history = tickCount.current % 3 === 0; // append to price_ticks every 3rd tick
    try {
      const res = await fetch('/api/sim/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history }),
      });
      if (res.status === 401) {
        stop();
        window.location.assign('/login');
        return;
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error?.message || 'tick failed');
      setTicks((t) => t + 1);
      setLastTs(new Date().toLocaleTimeString());
      setErr('');
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [stop]);

  const start = useCallback(async () => {
    setBusy(true);
    setErr('');
    try {
      if (wipeOnStart) {
        const res = await fetch('/api/sim/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'reset' }),
        });
        if (res.status === 401) return window.location.assign('/login');
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error?.message || 'reset failed');
      }
      tickCount.current = 0;
      setTicks(0);
      runningRef.current = true;
      setRunning(true);
      await doTick();
      timer.current = setInterval(doTick, cadence);
    } catch (e) {
      setErr((e as Error).message);
      stop();
    } finally {
      setBusy(false);
    }
  }, [wipeOnStart, cadence, doTick, stop]);

  // Re-arm the interval if cadence changes mid-run.
  useEffect(() => {
    if (!running) return;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(doTick, cadence);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [cadence, running, doTick]);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function resetOnly() {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/sim/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'reset' }),
      });
      if (res.status === 401) return window.location.assign('/login');
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error?.message || 'reset failed');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.reload();
  }

  const pillBg = running
    ? 'linear-gradient(135deg, rgba(47,209,128,.18), rgba(47,209,128,.06))'
    : 'var(--panel-2)';

  return (
    <>
      {open && (
        <div className="card" style={{
          position: 'fixed', left: 24, bottom: 84, zIndex: 60, width: 300, padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span className="label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Activity size={14} style={{ color: 'var(--gold)' }} /> Live Simulation
            </span>
            {running && <span className="badge bg-pos-soft pos">● streaming</span>}
          </div>

          <button
            onClick={running ? stop : start}
            disabled={busy}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px 14px', borderRadius: 11, border: 'none', cursor: busy ? 'default' : 'pointer',
              fontWeight: 650, fontSize: 14, color: running ? 'var(--text)' : '#1a1206',
              background: running ? 'var(--panel-2)' : 'linear-gradient(135deg, #f0d692, #d8b25a 55%, #b88a30)',
              boxShadow: running ? 'inset 0 0 0 1px var(--border-strong)' : 'none',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {running ? <><Square size={15} /> Stop simulation</>
              : <><Play size={15} /> {wipeOnStart ? 'Start Live (fresh)' : 'Start Live'}</>}
          </button>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '13px 2px 0', fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={wipeOnStart} disabled={running}
              onChange={(e) => setWipeOnStart(e.target.checked)} />
            Wipe history on start
          </label>

          <div style={{ marginTop: 13 }}>
            <div className="label" style={{ marginBottom: 6 }}>Tick speed</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {CADENCES.map((c) => (
                <button key={c.ms} onClick={() => setCadence(c.ms)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 9, fontSize: 13, cursor: 'pointer',
                    border: '1px solid ' + (cadence === c.ms ? 'var(--gold)' : 'var(--border)'),
                    background: cadence === c.ms ? 'rgba(216,178,90,.12)' : 'transparent',
                    color: cadence === c.ms ? 'var(--gold-soft)' : 'var(--muted)',
                  }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divider" style={{ margin: '14px 0 12px' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
            <span>Ticks sent</span><span className="tnum" style={{ color: 'var(--text)' }}>{ticks}</span>
          </div>
          {lastTs && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              <span>Last tick</span><span className="tnum">{lastTs}</span>
            </div>
          )}
          {err && <div style={{ color: 'var(--neg)', fontSize: 12, marginTop: 10 }}>{err}</div>}

          <p style={{ fontSize: 11, color: 'var(--muted)', margin: '12px 0 0', lineHeight: 1.5 }}>
            Ticks run only while this tab is open. For 24/7 movement, install the DB
            scheduled event (see&nbsp;DEPLOY.md).
          </p>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={resetOnly} disabled={busy}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 0', borderRadius: 9, fontSize: 13, cursor: 'pointer',
                border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)' }}>
              <RotateCcw size={13} /> Reset data
            </button>
            <button onClick={signOut}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 9, fontSize: 13, cursor: 'pointer',
                border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)' }}>
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed', left: 24, bottom: 24, zIndex: 60,
          display: 'flex', alignItems: 'center', gap: 9, height: 44, padding: '0 15px',
          borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          color: running ? 'var(--pos)' : 'var(--muted)',
          background: pillBg, border: '1px solid var(--border-strong)',
          boxShadow: '0 10px 30px -12px rgba(0,0,0,.6)',
        }}
      >
        {running ? <span className="live-dot" /> : <Activity size={15} />}
        {running ? 'Live' : 'Simulate'}
        <ChevronUp size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', opacity: 0.7 }} />
      </button>
    </>
  );
}
