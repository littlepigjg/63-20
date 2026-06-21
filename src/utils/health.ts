import type { ClientHealthScore } from '../../shared/types';

export const healthLevelConfig: Record<
  ClientHealthScore['level'],
  { label: string; color: string; bgColor: string; borderColor: string; icon: string }
> = {
  excellent: {
    label: '优秀',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/30',
    icon: '✅',
  },
  good: {
    label: '良好',
    color: 'text-green-400',
    bgColor: 'bg-green-500/15',
    borderColor: 'border-green-500/30',
    icon: '👍',
  },
  fair: {
    label: '一般',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/15',
    borderColor: 'border-yellow-500/30',
    icon: '⚠️',
  },
  poor: {
    label: '较差',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/15',
    borderColor: 'border-orange-500/30',
    icon: '❌',
  },
  critical: {
    label: '危险',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/15',
    borderColor: 'border-rose-500/30',
    icon: '🚨',
  },
  observing: {
    label: '观察中',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15',
    borderColor: 'border-blue-500/30',
    icon: '🔍',
  },
};

export const severityConfig: Record<
  'low' | 'medium' | 'high' | 'critical',
  { label: string; color: string; bgColor: string }
> = {
  low: { label: '低', color: 'text-slate-400', bgColor: 'bg-slate-500/15' },
  medium: { label: '中', color: 'text-yellow-400', bgColor: 'bg-yellow-500/15' },
  high: { label: '高', color: 'text-orange-400', bgColor: 'bg-orange-500/15' },
  critical: { label: '严重', color: 'text-rose-400', bgColor: 'bg-rose-500/15' },
};

export const issueTypeConfig: Record<
  'heartbeat' | 'online' | 'error' | 'other',
  { label: string; icon: string }
> = {
  heartbeat: { label: '心跳', icon: '💓' },
  online: { label: '在线', icon: '📡' },
  error: { label: '错误', icon: '🐛' },
  other: { label: '其他', icon: '📋' },
};

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-rose-400';
}

export function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-rose-500';
}

export function isLowHealth(level: ClientHealthScore['level']): boolean {
  return level === 'poor' || level === 'critical';
}

export function needsAttention(level: ClientHealthScore['level']): boolean {
  return level === 'fair' || level === 'poor' || level === 'critical';
}
