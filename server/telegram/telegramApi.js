import fetch from 'node-fetch';

export async function sendTelegramMessage(config, chatId, text) {
  if (!config.token) {
    console.warn('[TELEGRAM] TELEGRAM_BOT_TOKEN no configurado. Respuesta no enviada.');
    return { skipped: true, reason: 'missing_token' };
  }

  const response = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendMessage fallo (${response.status}): ${body}`);
  }

  return response.json();
}
