'use client';
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell,
} from 'recharts';
import { fmtMoney } from '@/lib/format';

export function AumAreaChart({ data, color = '#d8b25a', height = 240 }: {
  data: { d: string; v: number }[]; color?: string; height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
        <defs>
          <linearGradient id="aumFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="d" tick={{ fill: '#5d6680', fontSize: 11 }} tickLine={false} axisLine={false}
          minTickGap={50} tickFormatter={(d) => String(d).slice(2, 7)} stroke="#2a3145" />
        <YAxis tick={{ fill: '#5d6680', fontSize: 11 }} tickLine={false} axisLine={false} width={48}
          tickFormatter={(v) => fmtMoney(v, { compact: true })} domain={['dataMin', 'dataMax']} />
        <Tooltip
          contentStyle={{ background: '#0e1424', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: '#8b95ab' }} formatter={(v) => [fmtMoney(Number(v), { compact: true }), 'AUM']} />
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill="url(#aumFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MiniArea({ data, color = '#6ea8fe', height = 60 }: {
  data: { v: number }[]; color?: string; height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`mini-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.6} fill={`url(#mini-${color})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 200 }: {
  data: { name: string; value: number; color: string }[]; height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%"
          paddingAngle={2} stroke="none">
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#0e1424', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 12 }}
          formatter={(v, n) => [fmtMoney(Number(v), { compact: true }), n]} />
      </PieChart>
    </ResponsiveContainer>
  );
}
