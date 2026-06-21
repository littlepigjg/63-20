import { useState, useEffect } from 'react';
import { X, AlertTriangle, Lightbulb, Activity, Clock } from 'lucide-react';
import Modal from './Modal';
import HealthScoreBadge from './HealthScoreBadge';
import HealthTrendChart from './HealthTrendChart';
import { useHealth } from '@/hooks';
import {
  healthLevelConfig,
  severityConfig,
  issueTypeConfig,
  getScoreColor,
  getScoreBgColor,
} from '@/utils/health';
import { formatTime } from '@/utils/format';
import type { ClientInfo, ClientHealthScore, HealthHistoryRecord } from '../../shared/types';

interface HealthDetailModalProps {
  open: boolean;
  onClose: () => void;
  client: ClientInfo | null;
}

export default function HealthDetailModal({ open, onClose, client }: HealthDetailModalProps) {
  const [healthScore, setHealthScore] = useState<ClientHealthScore | null>(null);
  const [history, setHistory] = useState<HealthHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { getClientHealth, getClientHealthHistory } = useHealth();

  useEffect(() => {
    if (open && client) {
      loadHealthData();
    } else {
      setHealthScore(null);
      setHistory([]);
    }
  }, [open, client]);

  const loadHealthData = async () => {
    if (!client) return;
    setLoading(true);
    try {
      const [score, historyData] = await Promise.all([
        getClientHealth(client.id, true),
        getClientHealthHistory(client.id, 50),
      ]);
      setHealthScore(score);
      setHistory(historyData);
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  const currentHealthScore = healthScore || client.healthScore;

  return (
    <Modal open={open} onClose={onClose} title={`健康度详情 - ${client.name}`} size="xl">
      <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
        <div className="flex items-center justify-between p-4 bg-[#1E293B] border border-[#334155] rounded-xl">
          <div className="flex items-center gap-4">
            <HealthScoreBadge healthScore={currentHealthScore} size="lg" />
            <div>
              <div className="text-sm text-[#64748B]">客户端ID</div>
              <div className="text-sm font-mono text-[#94A3B8]">{client.id}</div>
            </div>
            <div>
              <div className="text-sm text-[#64748B]">IP地址</div>
              <div className="text-sm font-mono text-[#94A3B8]">{client.ip}</div>
            </div>
          </div>
          <button
            onClick={loadHealthData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#94A3B8] border border-[#334155] rounded-lg hover:bg-[#334155] transition-colors"
          >
            <Activity className="w-4 h-4" /> 刷新
          </button>
        </div>

        {currentHealthScore?.observationPeriodEnd && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <div className="flex items-center gap-2 text-blue-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">观察期</span>
            </div>
            <p className="text-sm text-[#94A3B8] mt-1">
              该客户端处于观察期，健康度评分仅供参考。观察期结束时间：
              <span className="font-mono text-blue-400">
                {formatTime(currentHealthScore.observationPeriodEnd)}
              </span>
            </p>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-[#F1F5F9] mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" /> 健康度指标详情
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentHealthScore?.metrics.map((metric, idx) => (
              <div key={idx} className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#64748B]">{metric.name}</span>
                  <span className="text-xs text-[#64748B]">权重 {metric.weight}%</span>
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span className={`text-2xl font-bold ${getScoreColor(metric.score)}`}>
                    {metric.score}
                  </span>
                  <span className="text-sm text-[#64748B] mb-0.5">/ {metric.maxScore}</span>
                </div>
                <div className="w-full h-2 bg-[#334155] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getScoreBgColor(metric.score)}`}
                    style={{ width: `${(metric.score / metric.maxScore) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-[#64748B] mt-2">{metric.description}</p>
              </div>
            ))}
          </div>
        </div>

        {currentHealthScore?.issues && currentHealthScore.issues.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-[#F1F5F9] mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" /> 检测到的问题
            </h3>
            <div className="space-y-2">
              {currentHealthScore.issues.map((issue, idx) => {
                const severity = severityConfig[issue.severity];
                const type = issueTypeConfig[issue.type];
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-[#1E293B] border border-[#334155] rounded-lg"
                  >
                    <span className="text-lg">{type.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${severity.bgColor} ${severity.color}`}>
                          {severity.label}
                        </span>
                        <span className="text-xs text-[#64748B]">{type.label}问题</span>
                      </div>
                      <p className="text-sm text-[#94A3B8]">{issue.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentHealthScore?.suggestions && currentHealthScore.suggestions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-[#F1F5F9] mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" /> 建议措施
            </h3>
            <div className="space-y-2">
              {currentHealthScore.suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                >
                  <span className="text-yellow-400 font-bold text-sm">{idx + 1}.</span>
                  <p className="text-sm text-[#94A3B8]">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-[#F1F5F9] mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" /> 健康度趋势
          </h3>
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
            <HealthTrendChart history={history} height={200} />
          </div>
        </div>

        <div className="text-xs text-[#64748B] text-right">
          评分计算时间：
          {currentHealthScore?.calculatedAt
            ? formatTime(currentHealthScore.calculatedAt)
            : '未知'}
        </div>
      </div>
    </Modal>
  );
}
