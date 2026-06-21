import { healthRepository } from '../repositories/HealthRepository.js';
import { clientRepository } from '../repositories/ClientRepository.js';
import { logRepository } from '../repositories/LogRepository.js';
import type {
  ClientInfo,
  ClientHealthScore,
  HealthMetric,
  HealthIssue,
  HealthConfig,
  HealthHistoryRecord,
  HeartbeatRecord,
} from '../../shared/types.js';

interface HealthCacheEntry {
  score: ClientHealthScore;
  calculatedAt: number;
}

const HEALTH_CACHE_TTL = 60000;
const MAX_HEARTBEAT_HISTORY = 100;
const ERROR_LOG_WINDOW_HOURS = 24;

export class HealthService {
  private healthCache = new Map<string, HealthCacheEntry>();

  async getHealthConfig(): Promise<HealthConfig> {
    return healthRepository.getConfig();
  }

  async updateHealthConfig(config: Partial<HealthConfig>): Promise<HealthConfig> {
    const result = await healthRepository.updateConfig(config);
    this.healthCache.clear();
    return result;
  }

  async resetHealthConfig(): Promise<HealthConfig> {
    const result = await healthRepository.resetConfig();
    this.healthCache.clear();
    return result;
  }

  async calculateClientHealth(client: ClientInfo, forceRecalculate: boolean = false): Promise<ClientHealthScore> {
    const now = Date.now();
    const cached = this.healthCache.get(client.id);

    if (!forceRecalculate && cached && now - cached.calculatedAt < HEALTH_CACHE_TTL) {
      return cached.score;
    }

    const config = await this.getHealthConfig();
    const score = await this.computeHealthScore(client, config);

    this.healthCache.set(client.id, { score, calculatedAt: now });

    await healthRepository.addHistoryRecord({
      clientId: client.id,
      timestamp: new Date().toISOString(),
      score: score.overallScore,
      level: score.level,
      metrics: score.metrics,
    });

    return score;
  }

  async calculateAllClientsHealth(forceRecalculate: boolean = false): Promise<Map<string, ClientHealthScore>> {
    const clients = await clientRepository.getAllClients();
    const results = new Map<string, ClientHealthScore>();

    for (const client of clients) {
      const score = await this.calculateClientHealth(client, forceRecalculate);
      results.set(client.id, score);
    }

    return results;
  }

  async getClientHealth(clientId: string): Promise<ClientHealthScore | null> {
    const client = await clientRepository.getClientById(clientId);
    if (!client) return null;
    return this.calculateClientHealth(client);
  }

  async getClientHealthHistory(clientId: string, limit?: number): Promise<HealthHistoryRecord[]> {
    return healthRepository.getClientHistory(clientId, limit);
  }

  async getHealthHistoryByTimeRange(clientId: string, startTime: string, endTime: string): Promise<HealthHistoryRecord[]> {
    return healthRepository.getHistoryByTimeRange(clientId, startTime, endTime);
  }

  async recordHeartbeat(clientId: string, received: boolean = true): Promise<void> {
    const client = await clientRepository.getClientById(clientId);
    if (!client) return;

    const record: HeartbeatRecord = {
      timestamp: new Date().toISOString(),
      received,
    };

    if (!client.heartbeatHistory) {
      client.heartbeatHistory = [];
    }

    client.heartbeatHistory.push(record);
    if (client.heartbeatHistory.length > MAX_HEARTBEAT_HISTORY) {
      client.heartbeatHistory = client.heartbeatHistory.slice(-MAX_HEARTBEAT_HISTORY);
    }

    await clientRepository.updateClient(clientId, { heartbeatHistory: client.heartbeatHistory });
    this.healthCache.delete(clientId);
  }

  private async computeHealthScore(client: ClientInfo, config: HealthConfig): Promise<ClientHealthScore> {
    const now = Date.now();
    const createdAt = new Date(client.createdAt || client.lastHeartbeat).getTime();
    const observationPeriodEnd = createdAt + config.observationPeriodHours * 60 * 60 * 1000;
    const isInObservation = now < observationPeriodEnd;

    const metrics: HealthMetric[] = [];
    const issues: HealthIssue[] = [];
    const suggestions: string[] = [];

    const heartbeatMetric = await this.calculateHeartbeatMetric(client, config, issues, suggestions);
    const onlineMetric = await this.calculateOnlineMetric(client, config, issues, suggestions);
    const errorMetric = await this.calculateErrorMetric(client, config, issues, suggestions);

    metrics.push(heartbeatMetric, onlineMetric, errorMetric);

    const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
    const weightedScore = metrics.reduce((sum, m) => sum + (m.score / m.maxScore) * m.weight, 0);
    const overallScore = Math.round((weightedScore / totalWeight) * 100);

    let level: ClientHealthScore['level'];

    if (isInObservation) {
      level = 'observing';
      suggestions.unshift('客户端处于观察期，健康度评分仅供参考');
    } else if (overallScore >= 90) {
      level = 'excellent';
    } else if (overallScore >= config.minHealthyScore) {
      level = 'good';
    } else if (overallScore >= config.warningScore) {
      level = 'fair';
    } else if (overallScore >= config.criticalScore) {
      level = 'poor';
    } else {
      level = 'critical';
    }

    return {
      overallScore,
      level,
      metrics,
      calculatedAt: new Date().toISOString(),
      observationPeriodEnd: isInObservation ? new Date(observationPeriodEnd).toISOString() : undefined,
      issues,
      suggestions,
    };
  }

  private async calculateHeartbeatMetric(
    client: ClientInfo,
    config: HealthConfig,
    issues: HealthIssue[],
    suggestions: string[]
  ): Promise<HealthMetric> {
    const heartbeatHistory = client.heartbeatHistory || [];
    const now = Date.now();
    const windowStart = now - 24 * 60 * 60 * 1000;

    const recentHeartbeats = heartbeatHistory.filter(
      (h) => new Date(h.timestamp).getTime() > windowStart
    );

    let score = 100;
    let description = '心跳规律正常';

    if (recentHeartbeats.length === 0) {
      score = 0;
      description = '无心跳记录';
      issues.push({
        type: 'heartbeat',
        severity: 'critical',
        message: '客户端在过去24小时内无任何心跳记录',
      });
      suggestions.push('检查客户端是否正常运行，网络连接是否正常');
    } else {
      const missedIntervals = this.calculateMissedHeartbeats(recentHeartbeats, config.heartbeatIntervalMs);
      const expectedCount = Math.ceil((24 * 60 * 60 * 1000) / config.heartbeatIntervalMs);
      const missRate = Math.min(1, missedIntervals / expectedCount);

      score = Math.round((1 - missRate) * 100);

      if (missRate > 0.5) {
        description = `心跳丢失严重，丢失率约 ${Math.round(missRate * 100)}%`;
        issues.push({
          type: 'heartbeat',
          severity: 'high',
          message: `心跳丢失率超过50%，网络或客户端可能不稳定`,
        });
        suggestions.push('检查客户端网络稳定性，调整心跳间隔或检查资源占用');
      } else if (missRate > 0.2) {
        description = `心跳偶有丢失，丢失率约 ${Math.round(missRate * 100)}%`;
        issues.push({
          type: 'heartbeat',
          severity: 'medium',
          message: `心跳丢失率超过20%，网络可能不稳定`,
        });
        suggestions.push('关注客户端网络连接状态，考虑优化网络配置');
      } else if (missRate > 0) {
        description = `心跳基本稳定，丢失率约 ${Math.round(missRate * 100)}%`;
      }

      const lastHeartbeatTime = new Date(client.lastHeartbeat).getTime();
      const timeSinceLastHeartbeat = now - lastHeartbeatTime;

      if (timeSinceLastHeartbeat > config.offlineThresholdMs * 3) {
        score = Math.max(0, score - 50);
        issues.push({
          type: 'heartbeat',
          severity: 'critical',
          message: '客户端长时间未发送心跳，可能已离线',
        });
      } else if (timeSinceLastHeartbeat > config.offlineThresholdMs) {
        score = Math.max(0, score - 20);
        issues.push({
          type: 'heartbeat',
          severity: 'high',
          message: '客户端已超过阈值时间未发送心跳',
        });
      }
    }

    return {
      name: '心跳规律性',
      score,
      maxScore: 100,
      weight: config.heartbeatRegularityWeight,
      description,
    };
  }

  private calculateMissedHeartbeats(heartbeats: HeartbeatRecord[], intervalMs: number): number {
    if (heartbeats.length < 2) return 0;

    const sorted = [...heartbeats].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let missed = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].timestamp).getTime();
      const curr = new Date(sorted[i].timestamp).getTime();
      const gap = curr - prev;
      const expected = Math.ceil(gap / intervalMs) - 1;
      missed += Math.max(0, expected);
    }

    return missed;
  }

  private async calculateOnlineMetric(
    client: ClientInfo,
    config: HealthConfig,
    issues: HealthIssue[],
    suggestions: string[]
  ): Promise<HealthMetric> {
    const now = Date.now();
    const createdAt = new Date(client.createdAt || client.lastHeartbeat).getTime();
    const totalUptime = now - createdAt;

    const dayMs = 24 * 60 * 60 * 1000;
    const onlineWindow = Math.min(totalUptime, dayMs * 7);

    const heartbeatHistory = client.heartbeatHistory || [];
    const receivedHeartbeats = heartbeatHistory.filter((h) => h.received).length;
    const totalHeartbeats = heartbeatHistory.length || 1;

    let onlineRate = receivedHeartbeats / totalHeartbeats;

    const lastHeartbeat = new Date(client.lastHeartbeat).getTime();
    if (now - lastHeartbeat > config.offlineThresholdMs) {
      onlineRate *= 0.5;
      if (!client.online) {
        issues.push({
          type: 'online',
          severity: 'high',
          message: '客户端当前处于离线状态',
        });
        suggestions.push('检查客户端是否正常启动，网络是否可达');
      }
    }

    const score = Math.round(onlineRate * 100);
    let description = `在线率约 ${score}%`;

    if (score < 50) {
      issues.push({
        type: 'online',
        severity: 'high',
        message: `客户端在线率低于50%，运行稳定性差`,
      });
      suggestions.push('检查客户端运行环境，是否存在频繁重启或崩溃');
    } else if (score < 80) {
      issues.push({
        type: 'online',
        severity: 'medium',
        message: `客户端在线率低于80%，存在不稳定因素`,
      });
      suggestions.push('关注客户端运行日志，排查异常退出原因');
    }

    const uptimeHours = Math.round(totalUptime / (60 * 60 * 1000));
    description += `，已运行 ${uptimeHours} 小时`;

    return {
      name: '在线时长',
      score,
      maxScore: 100,
      weight: config.onlineDurationWeight,
      description,
    };
  }

  private async calculateErrorMetric(
    client: ClientInfo,
    config: HealthConfig,
    issues: HealthIssue[],
    suggestions: string[]
  ): Promise<HealthMetric> {
    const now = Date.now();
    const windowStart = new Date(now - ERROR_LOG_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    const result = await logRepository.getLogs({
      from: windowStart,
      limit: 1000,
    });

    const clientLogs = result.logs.filter(
      (log) =>
        log.clientName === client.name ||
        log.clientIp === client.ip ||
        log.detail.includes(client.name)
    );

    const errorKeywords = ['错误', 'error', 'fail', '失败', 'exception', '异常'];
    const errorLogs = clientLogs.filter((log) => {
      const detail = log.detail.toLowerCase();
      return errorKeywords.some((kw) => detail.includes(kw.toLowerCase()));
    });

    const errorCount = errorLogs.length;
    let score = 100;
    let description = '无错误日志';

    if (errorCount > 0) {
      const penaltyPerError = 10;
      const maxPenalty = 80;
      const penalty = Math.min(maxPenalty, errorCount * penaltyPerError);
      score = Math.max(0, 100 - penalty);
      description = `过去24小时内检测到 ${errorCount} 条错误日志`;

      const severity =
        errorCount >= 10
          ? 'critical'
          : errorCount >= 5
          ? 'high'
          : errorCount >= 2
          ? 'medium'
          : 'low';

      issues.push({
        type: 'error',
        severity,
        message: `检测到 ${errorCount} 条错误日志`,
      });

      if (errorCount >= 10) {
        suggestions.push('客户端错误频发，建议立即检查运行日志并排查问题');
      } else if (errorCount >= 5) {
        suggestions.push('客户端存在较多错误，建议检查日志并修复问题');
      } else {
        suggestions.push('客户端存在少量错误，建议关注日志变化');
      }
    }

    return {
      name: '错误日志',
      score,
      maxScore: 100,
      weight: config.errorLogWeight,
      description,
    };
  }

  getLowHealthClients(threshold?: number): Promise<ClientInfo[]> {
    return this.getClientsByHealthLevel(['poor', 'critical'], threshold);
  }

  private async getClientsByHealthLevel(
    levels: ClientHealthScore['level'][],
    threshold?: number
  ): Promise<ClientInfo[]> {
    const config = await this.getHealthConfig();
    const clients = await clientRepository.getAllClients();
    const results: ClientInfo[] = [];

    for (const client of clients) {
      const health = await this.calculateClientHealth(client);
      if (levels.includes(health.level)) {
        if (threshold === undefined || health.overallScore < threshold) {
          client.healthScore = health;
          results.push(client);
        }
      }
    }

    return results.sort((a, b) => (a.healthScore?.overallScore || 0) - (b.healthScore?.overallScore || 0));
  }

  clearCache(): void {
    this.healthCache.clear();
  }
}

export const healthService = new HealthService();
