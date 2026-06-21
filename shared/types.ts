export interface ConfigItem {
  key: string;
  value: string;
  description: string;
  encrypted: boolean;
  iv?: string;
  tag?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Environment {
  name: string;
  configs: ConfigItem[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  environments: Environment[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'pull' | 'change' | 'encrypt' | 'decrypt' | 'client_register' | 'notify';
  clientIp: string;
  clientName: string;
  project: string;
  environment: string;
  detail: string;
}

export interface ClientInfo {
  id: string;
  name: string;
  ip: string;
  token: string;
  lastHeartbeat: string;
  online: boolean;
  createdAt: string;
  heartbeatHistory: HeartbeatRecord[];
  healthScore?: ClientHealthScore;
}

export interface HeartbeatRecord {
  timestamp: string;
  received: boolean;
}

export interface HealthConfig {
  heartbeatRegularityWeight: number;
  onlineDurationWeight: number;
  errorLogWeight: number;
  heartbeatIntervalMs: number;
  offlineThresholdMs: number;
  observationPeriodHours: number;
  minHealthyScore: number;
  warningScore: number;
  criticalScore: number;
  historyRetentionDays: number;
}

export interface HealthMetric {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  description: string;
}

export interface ClientHealthScore {
  overallScore: number;
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'observing';
  metrics: HealthMetric[];
  calculatedAt: string;
  observationPeriodEnd?: string;
  issues: HealthIssue[];
  suggestions: string[];
}

export interface HealthIssue {
  type: 'heartbeat' | 'online' | 'error' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export interface HealthHistoryRecord {
  clientId: string;
  timestamp: string;
  score: number;
  level: string;
  metrics: HealthMetric[];
}

export interface ClientsData {
  clients: ClientInfo[];
}

export interface ConfigData {
  encryptionKey: string;
  projects: Project[];
}

export interface LogsData {
  logs: LogEntry[];
}

export interface PullResponse {
  configs: Record<string, string>;
  version: string;
  pulledAt: string;
}

export type LogType = LogEntry['type'];
