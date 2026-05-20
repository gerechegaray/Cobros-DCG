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

  app.get('/api/telegram/users/:telegramId/status', async (req, res) => {
    const config = getTelegramConfig();
    if (config.webhookSecret) {
      const receivedSecret = req.get('x-telegram-bot-api-secret-token');
      if (receivedSecret !== config.webhookSecret) {
        return res.status(401).json({ ok: false, error: 'invalid_webhook_secret' });
      }
    }

    try {
      const telegramId = String(req.params.telegramId || '').trim();
      const doc = await adminDb.collection('telegramUsers').doc(telegramId).get();
      if (!doc.exists) {
        return res.json({ ok: true, telegramId, exists: false });
      }

      const data = doc.data() || {};
      res.json({
        ok: true,
        telegramId,
        exists: true,
        activo: data.activo,
        activoIsBooleanTrue: data.activo === true,
        email: data.email || null,
        name: data.name || null,
        role: data.role || null
      });
    } catch (error) {
      console.error('[TELEGRAM] Error consultando usuario:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
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
