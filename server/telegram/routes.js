import { getSafeTelegramStatus, getTelegramConfig } from './config.js';
import { processTelegramUpdate } from './service.js';

export function registerTelegramRoutes(app, adminDb) {
  app.get('/api/telegram/status', (req, res) => {
    const config = getTelegramConfig();
    res.json({
      ok: true,
      telegram: getSafeTelegramStatus(config)
    });
  });

  app.post('/api/telegram/webhook', async (req, res) => {
    const config = getTelegramConfig();

    if (config.webhookSecret) {
      const receivedSecret = req.get('x-telegram-bot-api-secret-token');
      if (receivedSecret !== config.webhookSecret) {
        return res.status(401).json({ ok: false, error: 'invalid_webhook_secret' });
      }
    }

    try {
      const result = await processTelegramUpdate({
        adminDb,
        config,
        update: req.body
      });

      res.json({ ok: true, result });
    } catch (error) {
      console.error('[TELEGRAM] Error procesando webhook:', error);
      res.json({ ok: false, error: error.message });
    }
  });
}
