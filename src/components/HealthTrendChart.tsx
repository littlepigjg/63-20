import { useMemo, useState } from 'react';
import { getScoreColor, getScoreBgColor, healthLevelConfig } from '@/utils/health';
import { formatTime } from '@/utils/format';
import type { HealthHistoryRecord } from '../../shared/types';

interface HealthTrendChartProps {
  history: HealthHistoryRecord[];
  height?: number;
  showLegend?: boolean;
}

export default function HealthTrendChart({
  history,
  height = 200,
  showLegend = true,
}: HealthTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (history.length === 0) return [];
    return [...history].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [history]);

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const width = '100%';
  const chartWidth = `calc(100% - ${padding.left + padding.right}px)`;
  const chartHeight = height - padding.top - padding.bottom;

  const maxScore = 100;
  const minScore = 0;

  const getX = (index: number) => {
    if (chartData.length <= 1) return 50;
    return (index / (chartData.length - 1)) * 100;
  };

  const getY = (score: number) => {
    return 100 - ((score - minScore) / (maxScore - minScore)) * 100;
  };

  const generatePath = () => {
    if (chartData.length < 2) return '';

    const points = chartData.map((d, i) => {
      const x = getX(i);
      const y = getY(d.score);
      return `${x}% ${y}%`;
    });

    let path = `M ${points[0]}`;
    for (let i = 1; i < points.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];
      const prevX = getX(i - 1);
      const currX = getX(i);
      const cpX = (prevX + currX) / 2;
      const prevY = getY(prev.score);
      const currY = getY(curr.score);

      path += ` C ${cpX}% ${prevY}%, ${cpX}% ${currY}%, ${points[i]}`;
    }

    return path;
  };

  const generateAreaPath = () => {
    if (chartData.length < 2) return '';

    const linePath = generatePath();
    const firstX = getX(0);
    const lastX = getX(chartData.length - 1);

    return `${linePath} L ${lastX}% 100% L ${firstX}% 100% Z`;
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center text-[#64748B] text-sm" style={{ height }}>
        暂无历史数据
      </div>
    );
  }

  const hoveredPoint = hoveredIndex !== null ? chartData[hoveredIndex] : null;

  return (
    <div className="w-full">
      {showLegend && (
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {(['excellent', 'good', 'fair', 'poor', 'critical'] as const).map((level) => (
            <div key={level} className="flex items-center gap-1.5">
              <div
                className={`w-3 h-3 rounded ${healthLevelConfig[level].bgColor}`}
              />
              <span className="text-xs text-[#64748B]">{healthLevelConfig[level].label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="relative" style={{ height }}>
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 100 100`}
          preserveAspectRatio="none"
        >
          <line
            x1="0%"
            y1={getY(80)}
            x2="100%"
            y2={getY(80)}
            stroke="#334155"
            strokeWidth="0.2"
            strokeDasharray="1 1"
          />
          <line
            x1="0%"
            y1={getY(60)}
            x2="100%"
            y2={getY(60)}
            stroke="#334155"
            strokeWidth="0.2"
            strokeDasharray="1 1"
          />
          <line
            x1="0%"
            y1={getY(40)}
            x2="100%"
            y2={getY(40)}
            stroke="#334155"
            strokeWidth="0.2"
            strokeDasharray="1 1"
          />

          {chartData.length >= 2 && (
            <>
              <path
                d={generateAreaPath()}
                fill="url(#areaGradient)"
                opacity="0.3"
              />
              <path
                d={generatePath()}
                fill="none"
                stroke="#10B981"
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 100 100`}
          preserveAspectRatio="none"
          style={{ pointerEvents: 'none' }}
        >
          {chartData.map((d, i) => {
            const isHovered = hoveredIndex === i;
            const x = getX(i);
            const y = getY(d.score);
            return (
              <g key={i}>
                <circle
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r={isHovered ? 2 : 1}
                  fill={d.score >= 80 ? '#10B981' : d.score >= 60 ? '#EAB308' : d.score >= 40 ? '#F97316' : '#EF4444'}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                {isHovered && (
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="3"
                    fill="none"
                    stroke={d.score >= 80 ? '#10B981' : d.score >= 60 ? '#EAB308' : d.score >= 40 ? '#F97316' : '#EF4444'}
                    strokeWidth="0.5"
                    opacity="0.5"
                  />
                )}
              </g>
            );
          })}
        </svg>

        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-[#64748B] font-mono">
          <span>100</span>
          <span>80</span>
          <span>60</span>
          <span>40</span>
          <span>0</span>
        </div>

        {chartData.length >= 2 && (
          <div className="absolute bottom-0 left-10 right-5 flex justify-between text-[10px] text-[#64748B] font-mono">
            <span>{formatTime(chartData[0].timestamp).split(' ')[0]}</span>
            <span>
              {formatTime(chartData[Math.floor(chartData.length / 2)].timestamp).split(' ')[0]}
            </span>
            <span>
              {formatTime(chartData[chartData.length - 1].timestamp).split(' ')[0]}
            </span>
          </div>
        )}

        {hoveredPoint && (
          <div
            className="absolute z-10 px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg shadow-lg text-xs whitespace-nowrap"
            style={{
              left: `calc(${getX(hoveredIndex!)}% + ${padding.left}px)`,
              top: `calc(${getY(hoveredPoint.score)}% - 10px)`,
              transform: 'translateX(-50%) translateY(-100%)',
            }}
          >
            <div className={`font-bold ${getScoreColor(hoveredPoint.score)}`}>
              {hoveredPoint.score} 分
            </div>
            <div className="text-[#64748B]">{formatTime(hoveredPoint.timestamp)}</div>
          </div>
        )}
      </div>

      {chartData.length === 1 && (
        <div className="mt-4 text-center text-sm text-[#64748B]">
          当前仅1条记录，需要更多数据才能显示趋势
        </div>
      )}
    </div>
  );
}
