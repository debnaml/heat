'use client';

import { ScanpathPoint } from '@/lib/types';

interface ScanpathOverlayProps {
  scanpath: ScanpathPoint[];
  width: number;
  height: number;
  show: boolean;
}

function getProgressColor(index: number, total: number): string {
  const t = total <= 1 ? 0 : index / (total - 1);
  // Cool blue (start) → warm red (end)
  const r = Math.round(59 + t * 196);
  const g = Math.round(130 + t * (-130));
  const b = Math.round(246 + t * (-206));
  return `rgb(${r}, ${g}, ${b})`;
}

export default function ScanpathOverlay({ scanpath, width, height, show }: ScanpathOverlayProps) {
  if (!show || scanpath.length === 0 || width === 0) return null;

  const sorted = [...scanpath].sort((a, b) => a.order - b.order);

  return (
    <svg
      className="absolute top-0 left-0 w-full pointer-events-none"
      style={{ height }}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.7)" />
        </marker>
      </defs>

      {/* Arrows between points */}
      {sorted.map((point, i) => {
        if (i === 0) return null;
        const prev = sorted[i - 1];
        const x1 = (prev.x / 100) * width;
        const y1 = (prev.y / 100) * height;
        const x2 = (point.x / 100) * width;
        const y2 = (point.y / 100) * height;

        // Control point for quadratic bezier curve
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        // Offset perpendicular to the line
        const offset = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.15, 40);
        const cx = midX + (dy / Math.sqrt(dx * dx + dy * dy || 1)) * offset;
        const cy = midY - (dx / Math.sqrt(dx * dx + dy * dy || 1)) * offset;

        const color = getProgressColor(i, sorted.length);

        return (
          <path
            key={`arrow-${i}`}
            d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.7}
            markerEnd="url(#arrowhead)"
          />
        );
      })}

      {/* Fixation circles with numbers */}
      {sorted.map((point, i) => {
        const cx = (point.x / 100) * width;
        const cy = (point.y / 100) * height;
        const radius = Math.max(12, Math.min(24, point.fixationMs / 30));
        const color = getProgressColor(i, sorted.length);

        return (
          <g key={`point-${i}`}>
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="rgba(0,0,0,0.5)"
              stroke={color}
              strokeWidth={2}
            />
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={11}
              fontWeight="bold"
              fontFamily="var(--font-geist-mono), monospace"
            >
              {point.order}
            </text>
            {/* Label */}
            <text
              x={cx}
              y={cy + radius + 14}
              textAnchor="middle"
              fill="white"
              fontSize={9}
              fontFamily="var(--font-geist-sans), sans-serif"
              opacity={0.8}
            >
              <tspan>{point.label}</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}
