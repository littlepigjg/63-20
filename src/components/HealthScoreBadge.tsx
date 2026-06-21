import { healthLevelConfig, getScoreColor } from '@/utils/health';
import type { ClientHealthScore } from '../../shared/types';

interface HealthScoreBadgeProps {
  healthScore?: ClientHealthScore;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function HealthScoreBadge({ healthScore, showIcon = true, size = 'md' }: HealthScoreBadgeProps) {
  if (!healthScore) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-500/15 text-slate-400">
        暂无评分
      </span>
    );
  }

  const config = healthLevelConfig[healthScore.level];
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded ${config.bgColor} ${config.color} ${sizeClasses[size]}`}
    >
      {showIcon && <span>{config.icon}</span>}
      <span className="font-medium">{config.label}</span>
      <span className={`font-mono font-bold ${getScoreColor(healthScore.overallScore)}`}>
        {healthScore.overallScore}
      </span>
    </span>
  );
}
