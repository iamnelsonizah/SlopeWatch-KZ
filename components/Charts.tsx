'use client';

import type { Fmd } from '@/lib/seismo';

export function Bars({ data, color = 'var(--accent)', height = 120, label }: { data: { k: string; v: number; hi?: boolean }[]; color?: string; height?: number; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.v));
  const w = Math.max(280, data.length * 18);
  return (
    <svg viewBox={`0 0 ${w} ${height + 22}`} role="img" aria-label={label} className="bars-svg">
      <line x1="4" x2={w - 4} y1={height} y2={height} stroke="var(--line)" />
      {data.map((d, i) => {
        const bw = (w - 8) / data.length, h = (d.v / max) * height;
        return (
          <g key={d.k}>
            <rect x={4 + i * bw + 1} y={height - h} width={Math.max(1, bw - 2)} height={h} fill={d.hi ? 'var(--warn)' : color}><title>{`${d.k}: ${d.v}`}</title></rect>
            {(data.length <= 14 || i % Math.ceil(data.length / 12) === 0) && <text x={4 + i * bw + bw / 2} y={height + 14} textAnchor="middle" className="chart-tick">{d.k}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/** Frequency-magnitude plot: counts per 0.1 bin, cumulative counts, and the Gutenberg-Richter line fitted above Mc. Log scale. */
export function FmdChart({ fmd, label, labels }: { fmd: Fmd; label: string; labels: { cumulative: string; perBin: string; fit: string; magnitude: string; count: string } }) {
  const W = 460, H = 280, L = 50, R = 12, T = 14, B = 40;
  if (!fmd.bins.length) return null;
  const m0 = fmd.bins[0].m, m1 = Math.max(fmd.bins[fmd.bins.length - 1].m, m0 + 1);
  const top = Math.ceil(Math.log10(Math.max(10, fmd.bins[0].cum)));
  const x = (m: number) => L + ((m - m0) / (m1 - m0)) * (W - L - R);
  const y = (n: number) => T + (1 - Math.log10(Math.max(1, n)) / top) * (H - T - B);
  const decades = Array.from({ length: top + 1 }, (_, i) => 10 ** i);
  const ticks: number[] = [];
  for (let m = Math.ceil(m0); m <= m1 + 1e-9; m += 1) ticks.push(m);
  const fit = fmd.b != null && fmd.a != null && fmd.mc != null ? { x1: fmd.mc, x2: m1, n1: 10 ** (fmd.a - fmd.b * fmd.mc), n2: Math.max(1, 10 ** (fmd.a - fmd.b * m1)) } : null;
  return (
    <figure className="fmd">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {decades.map((n) => <g key={n}><line x1={L} x2={W - R} y1={y(n)} y2={y(n)} className="chart-grid" /><text x={L - 6} y={y(n) + 3.5} textAnchor="end" className="chart-tick">{n.toLocaleString('en-US')}</text></g>)}
        {ticks.map((m) => <text key={m} x={x(m)} y={H - B + 16} textAnchor="middle" className="chart-tick">{m.toFixed(1)}</text>)}
        <text x={(L + W - R) / 2} y={H - 3} textAnchor="middle" className="chart-axis">{labels.magnitude}</text>
        <text x={11} y={(T + H - B) / 2} textAnchor="middle" transform={`rotate(-90 11 ${(T + H - B) / 2})`} className="chart-axis">{labels.count}</text>
        {fmd.mc != null && <g><line x1={x(fmd.mc)} x2={x(fmd.mc)} y1={T} y2={H - B} className="chart-mc" /><text x={x(fmd.mc) + 5} y={T + 10} className="chart-mc-label">Mc {fmd.mc.toFixed(1)}</text></g>}
        {fit && <line x1={x(fit.x1)} x2={x(fit.x2)} y1={y(fit.n1)} y2={y(fit.n2)} className="chart-fit" />}
        {fmd.bins.filter((b) => b.n > 0).map((b) => <rect key={`n${b.m}`} x={x(b.m) - 3} y={y(b.n) - 3} width="6" height="6" className="chart-bin"><title>{`M ${b.m.toFixed(1)}: ${b.n}`}</title></rect>)}
        {fmd.bins.filter((b) => b.cum > 0).map((b) => <circle key={`c${b.m}`} cx={x(b.m)} cy={y(b.cum)} r="3" className="chart-cum"><title>{`M ≥ ${b.m.toFixed(1)}: ${b.cum}`}</title></circle>)}
      </svg>
      <figcaption className="chart-key">
        <span><i className="key-cum" />{labels.cumulative}</span><span><i className="key-bin" />{labels.perBin}</span>{fit && <span><i className="key-fit" />{labels.fit}</span>}
      </figcaption>
    </figure>
  );
}
