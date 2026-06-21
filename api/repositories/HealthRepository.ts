import { JsonRepository } from './JsonRepository.js';
import type { HealthConfig, HealthHistoryRecord } from '../../shared/types.js';

export interface HealthData {
  config: HealthConfig;
  history: HealthHistoryRecord[];
}

const DEFAULT_HEALTH_CONFIG: HealthConfig = {
  heartbeatRegularityWeight: 40,
  onlineDurationWeight: 30,
  errorLogWeight: 30,
  heartbeatIntervalMs: 30000,
  offlineThresholdMs: 60000,
  observationPeriodHours: 24,
  minHealthyScore: 80,
  warningScore: 60,
  criticalScore: 40,
  historyRetentionDays: 7,
};

export class HealthRepository {
  private repo: JsonRepository<HealthData>;

  constructor() {
    this.repo = new JsonRepository<HealthData>('health.json', {
      config: DEFAULT_HEALTH_CONFIG,
      history: [],
    });
  }

  async getConfig(): Promise<HealthConfig> {
    const data = await this.repo.read();
    return data.config;
  }

  async updateConfig(config: Partial<HealthConfig>): Promise<HealthConfig> {
    const data = await this.repo.read();
    data.config = { ...data.config, ...config };
    await this.repo.write(data);
    return data.config;
  }

  async resetConfig(): Promise<HealthConfig> {
    const data = await this.repo.read();
    data.config = { ...DEFAULT_HEALTH_CONFIG };
    await this.repo.write(data);
    return data.config;
  }

  async addHistoryRecord(record: HealthHistoryRecord): Promise<HealthHistoryRecord> {
    const data = await this.repo.read();
    data.history.push(record);

    const cutoffTime = Date.now() - data.config.historyRetentionDays * 24 * 60 * 60 * 1000;
    data.history = data.history.filter((h) => new Date(h.timestamp).getTime() > cutoffTime);

    await this.repo.write(data);
    return record;
  }

  async getClientHistory(clientId: string, limit?: number): Promise<HealthHistoryRecord[]> {
    const data = await this.repo.read();
    let records = data.history.filter((h) => h.clientId === clientId);
    records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (limit) {
      records = records.slice(0, limit);
    }
    return records;
  }

  async getAllHistory(limit?: number): Promise<HealthHistoryRecord[]> {
    const data = await this.repo.read();
    let records = [...data.history];
    records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (limit) {
      records = records.slice(0, limit);
    }
    return records;
  }

  async getHistoryByTimeRange(clientId: string, startTime: string, endTime: string): Promise<HealthHistoryRecord[]> {
    const data = await this.repo.read();
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return data.history.filter((h) => {
      const t = new Date(h.timestamp).getTime();
      return h.clientId === clientId && t >= start && t <= end;
    });
  }
}

export const healthRepository = new HealthRepository();
