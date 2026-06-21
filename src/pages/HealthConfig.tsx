import { useState, useEffect } from 'react';
import { Settings, RefreshCw, Save, RotateCcw, Activity, AlertTriangle, Info } from 'lucide-react';
import { useHealth } from '@/hooks';
import PageHeader from '@/components/PageHeader';
import { getScoreColor, getScoreBgColor } from '@/utils/health';
import type { HealthConfig } from '../../shared/types';

export default function HealthConfig() {
  const { healthConfig, loading, error, fetchHealthConfig, updateHealthConfig, resetHealthConfig } =
    useHealth();
  const [formData, setFormData] = useState<Partial<HealthConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchHealthConfig();
  }, [fetchHealthConfig]);

  useEffect(() => {
    if (healthConfig) {
      setFormData(healthConfig);
    }
  }, [healthConfig]);

  useEffect(() => {
    if (!healthConfig) return;
    const changed = Object.keys(formData).some(
      (key) => formData[key as keyof HealthConfig] !== healthConfig[key as keyof HealthConfig]
    );
    setHasChanges(changed);
  }, [formData, healthConfig]);

  const handleChange = (key: keyof HealthConfig, value: number) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const result = await updateHealthConfig(formData);
    if (result) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleReset = async () => {
    if (!confirm('确定要重置为默认配置吗？')) return;
    const result = await resetHealthConfig();
    if (result) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const totalWeight =
    (formData.heartbeatRegularityWeight || 0) +
    (formData.onlineDurationWeight || 0) +
    (formData.errorLogWeight || 0);

  const weightValid = totalWeight === 100;

  if (!healthConfig && loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#64748B]">
        <Activity className="w-8 h-8 animate-spin mr-3" />
        加载中...
      </div>
    );
  }

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="健康度配置"
        subtitle="配置健康度评分算法的各项参数和权重"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHealthConfig}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#94A3B8] border border-[#334155] rounded-lg hover:bg-[#334155] transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> 刷新
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#94A3B8] border border-[#334155] rounded-lg hover:bg-[#334155] transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> 重置默认
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || !weightValid}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-emerald-500/15 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" /> 保存配置
            </button>
          </div>
        }
      />

      {saveSuccess && (
        <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
          配置已保存成功
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h3 className="text-base font-medium text-[#F1F5F9] mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            指标权重配置
          </h3>
          <p className="text-xs text-[#64748B] mb-6">
            调整各项健康度指标的权重占比，三项权重之和必须等于 100%
          </p>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-[#94A3B8]">心跳规律性权重</label>
                <span
                  className={`text-sm font-mono font-bold ${getScoreColor(
                    formData.heartbeatRegularityWeight || 0
                  )}`}
                >
                  {formData.heartbeatRegularityWeight}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.heartbeatRegularityWeight || 0}
                onChange={(e) =>
                  handleChange('heartbeatRegularityWeight', parseInt(e.target.value))
                }
                className="w-full h-2 bg-[#334155] rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className="text-xs text-[#64748B] mt-1">
                根据客户端心跳上报的规律性和稳定性评分
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-[#94A3B8]">在线时长权重</label>
                <span
                  className={`text-sm font-mono font-bold ${getScoreColor(
                    formData.onlineDurationWeight || 0
                  )}`}
                >
                  {formData.onlineDurationWeight}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.onlineDurationWeight || 0}
                onChange={(e) => handleChange('onlineDurationWeight', parseInt(e.target.value))}
                className="w-full h-2 bg-[#334155] rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className="text-xs text-[#64748B] mt-1">
                根据客户端的在线率和运行时长评分
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-[#94A3B8]">错误日志权重</label>
                <span
                  className={`text-sm font-mono font-bold ${getScoreColor(
                    formData.errorLogWeight || 0
                  )}`}
                >
                  {formData.errorLogWeight}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.errorLogWeight || 0}
                onChange={(e) => handleChange('errorLogWeight', parseInt(e.target.value))}
                className="w-full h-2 bg-[#334155] rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className="text-xs text-[#64748B] mt-1">
                根据客户端相关的错误日志数量评分
              </p>
            </div>

            <div
              className={`p-4 rounded-lg ${
                weightValid ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-rose-500/10 border border-rose-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#94A3B8]">权重合计</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xl font-mono font-bold ${
                      weightValid ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {totalWeight}%
                  </span>
                  {!weightValid && <AlertTriangle className="w-5 h-5 text-rose-400" />}
                </div>
              </div>
              {!weightValid && (
                <p className="text-xs text-rose-400 mt-2">
                  三项权重之和必须等于 100%，当前为 {totalWeight}%
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h3 className="text-base font-medium text-[#F1F5F9] mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            评分阈值配置
          </h3>
          <p className="text-xs text-[#64748B] mb-6">
            配置健康度评分的各项阈值参数
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">心跳间隔（毫秒）</label>
              <input
                type="number"
                value={formData.heartbeatIntervalMs || 0}
                onChange={(e) => handleChange('heartbeatIntervalMs', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F1F5F9] focus:outline-none focus:border-emerald-500/50 font-mono"
              />
              <p className="text-xs text-[#64748B] mt-1">
                客户端预期的心跳上报间隔时间
              </p>
            </div>

            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">离线阈值（毫秒）</label>
              <input
                type="number"
                value={formData.offlineThresholdMs || 0}
                onChange={(e) => handleChange('offlineThresholdMs', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F1F5F9] focus:outline-none focus:border-emerald-500/50 font-mono"
              />
              <p className="text-xs text-[#64748B] mt-1">
                超过此时间未收到心跳则判定为离线
              </p>
            </div>

            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">观察期时长（小时）</label>
              <input
                type="number"
                value={formData.observationPeriodHours || 0}
                onChange={(e) => handleChange('observationPeriodHours', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F1F5F9] focus:outline-none focus:border-emerald-500/50 font-mono"
              />
              <p className="text-xs text-[#64748B] mt-1">
                新注册客户端的观察期时长，此期间评分仅供参考
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#64748B] mb-1">良好阈值</label>
                <input
                  type="number"
                  value={formData.minHealthyScore || 0}
                  onChange={(e) => handleChange('minHealthyScore', parseInt(e.target.value))}
                  className="w-full px-2 py-1.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F1F5F9] focus:outline-none focus:border-emerald-500/50 font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-xs text-[#64748B] mb-1">警告阈值</label>
                <input
                  type="number"
                  value={formData.warningScore || 0}
                  onChange={(e) => handleChange('warningScore', parseInt(e.target.value))}
                  className="w-full px-2 py-1.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F1F5F9] focus:outline-none focus:border-emerald-500/50 font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-xs text-[#64748B] mb-1">危险阈值</label>
                <input
                  type="number"
                  value={formData.criticalScore || 0}
                  onChange={(e) => handleChange('criticalScore', parseInt(e.target.value))}
                  className="w-full px-2 py-1.5 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F1F5F9] focus:outline-none focus:border-emerald-500/50 font-mono text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#94A3B8] mb-2">历史记录保留天数</label>
              <input
                type="number"
                value={formData.historyRetentionDays || 0}
                onChange={(e) => handleChange('historyRetentionDays', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F1F5F9] focus:outline-none focus:border-emerald-500/50 font-mono"
              />
              <p className="text-xs text-[#64748B] mt-1">
                健康度历史记录的保留天数
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-[#1E293B] border border-[#334155] rounded-xl p-6">
        <h3 className="text-base font-medium text-[#F1F5F9] mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          健康度等级说明
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { level: 'excellent', label: '优秀', min: 90, max: 100, color: 'emerald' },
            { level: 'good', label: '良好', min: 80, max: 89, color: 'green' },
            { level: 'fair', label: '一般', min: 60, max: 79, color: 'yellow' },
            { level: 'poor', label: '较差', min: 40, max: 59, color: 'orange' },
            { level: 'critical', label: '危险', min: 0, max: 39, color: 'rose' },
            { level: 'observing', label: '观察中', min: 0, max: 100, color: 'blue' },
          ].map((item) => (
            <div key={item.level} className="text-center p-3 bg-[#0F172A] rounded-lg">
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-${item.color}-500/15 mb-2`}
              >
                <span className={`text-lg font-bold text-${item.color}-400`}>
                  {item.min}
                  {item.max !== item.min && `-${item.max}`}
                </span>
              </div>
              <div className={`text-sm font-medium text-${item.color}-400`}>{item.label}</div>
              <div className="text-xs text-[#64748B] mt-1">
                {item.level === 'observing' ? '新客户端' : `${item.min}-${item.max} 分`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
