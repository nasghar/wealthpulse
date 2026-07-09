'use client';
import { useEffect, useRef } from 'react';

// Renders an Aura Analyst ChartBlock (a Plotly figure JSON). Plotly is lazy-loaded
// only when a chart actually appears, and the whole thing is guarded so a malformed
// figure never breaks the message.
export function PlotlyChart({ figure }: { figure: Record<string, unknown> }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const Plotly = (await import('plotly.js-dist-min')).default;
        if (!alive || !ref.current) return;
        const data = (figure?.data as unknown[]) || [];
        const layout = {
          ...((figure?.layout as Record<string, unknown>) || {}),
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color: '#c7d0e0', size: 11 },
          margin: { t: 28, r: 14, b: 38, l: 48 },
          autosize: true,
          showlegend: true,
          legend: { font: { color: '#8b95ab', size: 10 } },
          colorway: ['#d8b25a', '#6ea8fe', '#9d7bff', '#37c2a8', '#f0a93b', '#ff5c6c'],
        };
        await Plotly.react(ref.current, data, layout, { displayModeBar: false, responsive: true });
      } catch {
        if (ref.current) ref.current.innerHTML = '<div style="color:#8b95ab;font-size:12px;padding:8px">Chart could not be rendered.</div>';
      }
    })();
    return () => {
      alive = false;
    };
  }, [figure]);

  return <div ref={ref} style={{ width: '100%', height: 240 }} />;
}
