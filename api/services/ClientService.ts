import { clientRepository } from '../repositories/ClientRepository.js';
import { logService } from './LogService.js';
import { healthService } from './HealthService.js';
import crypto from 'crypto';
import type { ClientInfo } from '../../shared/types.js';

export class ClientService {
  async getAllClients(includeHealth: boolean = true): Promise<ClientInfo[]> {
    const clients = await clientRepository.getAllClients();
    const now = Date.now();

    for (const client of clients) {
      if (!client.createdAt) {
        client.createdAt = client.lastHeartbeat;
      }
      if (!client.heartbeatHistory) {
        client.heartbeatHistory = [];
      }

      const lastHeartbeat = new Date(client.lastHeartbeat).getTime();
      if (now - lastHeartbeat > 60000) {
        client.online = false;
      }

      if (includeHealth) {
        client.healthScore = await healthService.calculateClientHealth(client);
      }
    }

    return clients;
  }

  async registerClient(name: string, ip: string): Promise<ClientInfo> {
    const now = new Date().toISOString();
    const client: ClientInfo = {
      id: `cli_${crypto.randomUUID().slice(0, 8)}`,
      name,
      ip,
      token: crypto.randomBytes(32).toString('hex'),
      lastHeartbeat: now,
      online: true,
      createdAt: now,
      heartbeatHistory: [
        {
          timestamp: now,
          received: true,
        },
      ],
    };
    const result = await clientRepository.addClient(client);
    await logService.addLog('client_register', ip, name, '', '', `新客户端注册: ${name}`);
    return result;
  }

  async deleteClient(id: string): Promise<boolean> {
    return clientRepository.deleteClient(id);
  }

  async heartbeat(id: string): Promise<ClientInfo | null> {
    const client = await clientRepository.updateHeartbeat(id);
    if (client) {
      await healthService.recordHeartbeat(id, true);
    }
    return client;
  }

  async validateToken(token: string): Promise<ClientInfo | undefined> {
    return clientRepository.getClientByToken(token);
  }

  async getClientById(id: string, includeHealth: boolean = true): Promise<ClientInfo | undefined> {
    const client = await clientRepository.getClientById(id);
    if (!client) return undefined;

    if (!client.createdAt) {
      client.createdAt = client.lastHeartbeat;
    }
    if (!client.heartbeatHistory) {
      client.heartbeatHistory = [];
    }

    if (includeHealth) {
      client.healthScore = await healthService.calculateClientHealth(client);
    }

    return client;
  }
}

export const clientService = new ClientService();
