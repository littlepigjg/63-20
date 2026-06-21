import { Router } from 'express';
import { healthService } from '../services/HealthService.js';
import { clientService } from '../services/ClientService.js';
import type { HealthConfig } from '../../shared/types.js';

const router = Router();

router.get('/config', async (req, res) => {
  try {
    const config = await healthService.getHealthConfig();
    res.json({ success: true, data: config });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch health config' });
  }
});

router.put('/config', async (req, res) => {
  try {
    const config = req.body as Partial<HealthConfig>;

    if (config.heartbeatRegularityWeight !== undefined) {
      if (config.heartbeatRegularityWeight < 0 || config.heartbeatRegularityWeight > 100) {
        res.status(400).json({ success: false, error: '心跳规律性权重必须在0-100之间' });
        return;
      }
    }
    if (config.onlineDurationWeight !== undefined) {
      if (config.onlineDurationWeight < 0 || config.onlineDurationWeight > 100) {
        res.status(400).json({ success: false, error: '在线时长权重必须在0-100之间' });
        return;
      }
    }
    if (config.errorLogWeight !== undefined) {
      if (config.errorLogWeight < 0 || config.errorLogWeight > 100) {
        res.status(400).json({ success: false, error: '错误日志权重必须在0-100之间' });
        return;
      }
    }

    if (
      config.heartbeatRegularityWeight !== undefined &&
      config.onlineDurationWeight !== undefined &&
      config.errorLogWeight !== undefined
    ) {
      const total =
        config.heartbeatRegularityWeight + config.onlineDurationWeight + config.errorLogWeight;
      if (total !== 100) {
        res.status(400).json({ success: false, error: '三项权重之和必须等于100' });
        return;
      }
    }

    const updatedConfig = await healthService.updateHealthConfig(config);
    res.json({ success: true, data: updatedConfig });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update health config' });
  }
});

router.post('/config/reset', async (req, res) => {
  try {
    const config = await healthService.resetHealthConfig();
    res.json({ success: true, data: config });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to reset health config' });
  }
});

router.get('/clients/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { force } = req.query;
    const client = await clientService.getClientById(clientId, false);

    if (!client) {
      res.status(404).json({ success: false, error: 'Client not found' });
      return;
    }

    const healthScore = await healthService.calculateClientHealth(
      client,
      force === 'true'
    );

    res.json({ success: true, data: healthScore });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to calculate client health' });
  }
});

router.get('/clients/:clientId/history', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit, start, end } = req.query;

    let history;
    if (start && end) {
      history = await healthService.getHealthHistoryByTimeRange(
        clientId,
        start as string,
        end as string
      );
    } else {
      history = await healthService.getClientHealthHistory(
        clientId,
        limit ? parseInt(limit as string) : undefined
      );
    }

    res.json({ success: true, data: history });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch health history' });
  }
});

router.get('/low-health', async (req, res) => {
  try {
    const { threshold } = req.query;
    const clients = await healthService.getLowHealthClients(
      threshold ? parseInt(threshold as string) : undefined
    );
    res.json({ success: true, data: clients });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch low health clients' });
  }
});

router.post('/recalculate', async (req, res) => {
  try {
    await healthService.calculateAllClientsHealth(true);
    res.json({ success: true, message: 'Health scores recalculated for all clients' });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to recalculate health scores' });
  }
});

router.post('/cache/clear', async (req, res) => {
  try {
    healthService.clearCache();
    res.json({ success: true, message: 'Health cache cleared' });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to clear health cache' });
  }
});

export default router;
