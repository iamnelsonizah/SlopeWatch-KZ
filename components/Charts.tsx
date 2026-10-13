'use client';

export function Bars({ data, color = 'var(--accent)', height = 120, label }: { data: { k: string; v: number; hi?: boolean }[]; color?: string; height?: number; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.v));
  const w = Math.max(280, data.length * 18);
  return (
    <svg viewBox={`0 0 ${w} ${height + 22}`} role="img" aria-label={label} className="bars-svg" style={{ width: '100%', minWidth: Math.min(w, 520) }}>
      {data.map((d, i) => {
        const bw = (w - 8) / data.length, h = (d.v / max) * height;
        return (
          <g key={d.k}>
            <rect x={4 + i * bw + 1} y={height - h} width={Math.max(1, bw - 2)} height={h} fill={d.hi ? '#d62f4b' : color} rx="1.5"><title>{`${d.k}: ${d.v}`}</title></rect>
            {(data.length <= 14 || i % Math.ceil(data.length / 12) === 0) && <text x={4 + i * bw + bw / 2} y={height + 14} textAnchor="middle" fontSize="10" fill="var(--muted)">{d.k}</text>}
          </g>
        );
      })}
    </svg>
  );
}
