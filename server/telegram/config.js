function parseBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on', 'si'].includes(String(value).trim().toLowerCase());
}

function parseCsvSet(value) {
  if (!value) return new Set();
  return new Set(
    String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

export function getTelegramConfig(env = process.env) {
  return {
    enabled: parseBool(env.TELEGRAM_BOT_ENABLED, false),
    dryRun: parseBool(env.TELEGRAM_DRY_RUN, true),
    token: env.TELEGRAM_BOT_TOKEN || '',
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET || '',
    allowedChatIds: parseCsvSet(env.TELEGRAM_ALLOWED_CHAT_IDS),
    sessionTtlMs: 2 * 60 * 60 * 1000,
    productAliasesRaw: env.TELEGRAM_PRODUCT_ALIASES || ''
  };
}

export function getSafeTelegramStatus(config) {
  return {
    enabled: config.enabled,
    dryRun: config.dryRun,
    hasToken: Boolean(config.token),
    hasWebhookSecret: Boolean(config.webhookSecret),
    allowedChatIds: config.allowedChatIds.size,
    sessionTtlHours: config.sessionTtlMs / (60 * 60 * 1000)
  };
}
