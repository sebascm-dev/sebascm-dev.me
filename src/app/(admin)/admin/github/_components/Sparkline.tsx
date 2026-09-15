interface SparklineProps {
  values: number[]
  width?: number
  height?: number
}

/** Trend in the de-emphasis gray, with the current segment and end dot in the accent */
export function Sparkline({ values, width = 120, height = 40 }: SparklineProps) {
  if (values.length < 2) return null

  const padding = 5
  const max = Math.max(...values, 1)
  const step = (width - padding * 2) / (values.length - 1)
  const points = values.map(
    (value, index) => [padding + index * step, height - padding - (value / max) * (height - padding * 2)] as const
  )
  const toAttribute = (list: (readonly [number, number])[]) =>
    list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lastX, lastY] = points[points.length - 1]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="shrink-0">
      <polyline
        points={toAttribute(points.slice(0, -1))}
        fill="none"
        stroke="#4b5563"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline points={toAttribute(points.slice(-2))} fill="none" stroke="#22d3ee" strokeWidth={2} strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={4} fill="#22d3ee" stroke="#0d0d0d" strokeWidth={2} />
    </svg>
  )
}
