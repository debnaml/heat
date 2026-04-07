'use client';

import { useState } from 'react';
import { DesignFinding } from '@/lib/types';

interface FindingsListProps {
  findings: DesignFinding[];
  onHighlightZone: (zoneId: string | null) => void;
}

const typeConfig = {
  strength: {
    label: 'Strengths',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  weakness: {
    label: 'Weaknesses',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    ),
  },
  opportunity: {
    label: 'Opportunities',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
  },
} as const;

export default function FindingsList({ findings, onHighlightZone }: FindingsListProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const grouped = {
    strength: findings.filter((f) => f.type === 'strength'),
    weakness: findings.filter((f) => f.type === 'weakness'),
    opportunity: findings.filter((f) => f.type === 'opportunity'),
  };

  const toggleSection = (type: string) => {
    setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="space-y-4">
      {(Object.keys(grouped) as Array<keyof typeof grouped>).map((type) => {
        const items = grouped[type];
        if (items.length === 0) return null;
        const config = typeConfig[type];
        const isCollapsed = collapsed[type];

        return (
          <div
            key={type}
            className={`border rounded-lg overflow-hidden ${config.borderColor} ${config.bgColor}`}
          >
            {/* Section header */}
            <button
              onClick={() => toggleSection(type)}
              className="w-full flex items-center gap-2 px-4 py-3 text-left cursor-pointer hover:bg-white/5 transition-colors"
            >
              <span className={config.color}>{config.icon}</span>
              <span className={`text-sm font-semibold ${config.color}`}>
                {config.label}
              </span>
              <span className="text-xs text-zinc-500 ml-1">({items.length})</span>
              <svg
                className={`w-4 h-4 text-zinc-500 ml-auto transition-transform ${
                  isCollapsed ? '' : 'rotate-180'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Items */}
            {!isCollapsed && (
              <div className="px-4 pb-3 space-y-3">
                {items.map((finding, i) => (
                  <div
                    key={i}
                    className="text-sm cursor-default"
                    onMouseEnter={() => finding.zoneId && onHighlightZone(finding.zoneId)}
                    onMouseLeave={() => onHighlightZone(null)}
                  >
                    <p className="font-medium text-zinc-200">{finding.title}</p>
                    <p className="text-zinc-400 mt-0.5 leading-relaxed">{finding.description}</p>
                    {finding.zoneId && (
                      <button
                        onClick={() => onHighlightZone(finding.zoneId!)}
                        className="text-xs text-blue-400 hover:text-blue-300 mt-1 underline cursor-pointer"
                      >
                        Show on heatmap
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
