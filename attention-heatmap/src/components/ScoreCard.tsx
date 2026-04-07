'use client';

import { useEffect, useState } from 'react';

interface ScoreCardProps {
  score: number;
  pageType: string;
  summary: string;
}

function getScoreColor(score: number): string {
  if (score < 30) return '#ef4444';   // red
  if (score < 50) return '#f97316';   // orange
  if (score < 70) return '#eab308';   // yellow
  if (score < 90) return '#22c55e';   // green
  return '#10b981';                   // bright green
}

function getScoreLabel(score: number): string {
  if (score < 30) return 'Critical';
  if (score < 50) return 'Poor';
  if (score < 70) return 'Average';
  if (score < 90) return 'Good';
  return 'Exceptional';
}

export default function ScoreCard({ score, pageType, summary }: ScoreCardProps) {
  const [displayed, setDisplayed] = useState(0);
  const color = getScoreColor(score);

  // Animate count up
  useEffect(() => {
    setDisplayed(0);
    const duration = 1200;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayed(score);
        clearInterval(interval);
      } else {
        setDisplayed(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [score]);

  // SVG circle math
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayed / 100) * circumference;

  return (
    <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-6 text-center">
      {/* Circular gauge */}
      <div className="relative inline-block">
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />
          {/* Score arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        {/* Score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-4xl font-bold font-mono tabular-nums"
            style={{ color }}
          >
            {displayed}
          </span>
          <span className="text-xs text-zinc-400 uppercase tracking-wider mt-0.5">
            {getScoreLabel(score)}
          </span>
        </div>
      </div>

      {/* Page type badge */}
      <div className="mt-4">
        <span className="inline-block px-3 py-1 text-xs font-mono bg-zinc-700 text-zinc-300 rounded-full">
          {pageType}
        </span>
      </div>

      {/* Summary */}
      <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{summary}</p>
    </div>
  );
}
