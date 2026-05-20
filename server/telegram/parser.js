import { CONDICION_ALIASES, FORMA_PAGO_ALIASES, OBS_MARKERS } from './aliases.js';
import { normalizeText } from './normalization.js';

export function parseTelegramMessage(text) {
  const raw = String(text || '').trim();
  const normalized = normalizeText(raw);

  if (!raw) return { intent: null, error: 'Mensaje vacio' };
  if (normalized.startsWith('/')) return { intent: 'command', command: normalized.split(/\s+/)[0] };
  if (['confirmar', 'confirma', 'ok', 'si'].includes(normalized)) return { intent: 'confirmar' };
  if (['cancelar', 'cancela', '/cancelar'].includes(normalized)) return { intent: 'cancelar' };
  if (['resumen', 'ver resumen'].includes(normalized)) return { intent: 'resumen' };

  if (normalized.startsWith('pedido')) return parsePedido(raw);
  if (normalized.startsWith('cobro')) return parseCobro(raw);

  return { intent: null, error: 'No pude detectar si es pedido o cobro' };
}

export function parsePedido(text) {
  const body = text.replace(/^\s*pedido\b/i, '').trim();
  const { textWithoutNotes, notes } = extractNotes(body);
  const { cleanedText, condicionPago } = extractCondition(textWithoutNotes);
  const lines = cleanedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let clienteQuery = '';
  let itemLines = [];

  if (lines.length > 1) {
    clienteQuery = lines[0];
    itemLines = lines.slice(1);
  } else {
    const firstQuantity = findFirstQuantityIndex(cleanedText);
    if (firstQuantity >= 0) {
      clienteQuery = cleanedText.slice(0, firstQuantity).trim();
      itemLines = splitInlineItems(cleanedText.slice(firstQuantity).trim());
    } else {
      clienteQuery = cleanedText.trim();
    }
  }

  return {
    intent: 'pedido',
    clienteQuery,
    condicionPago: condicionPago || 'contado',
    observaciones: notes,
    items: itemLines.map(parsePedidoItem).filter((item) => item.productoQuery)
  };
}

export function parseCobro(text) {
  const body = text.replace(/^\s*cobro\b/i, '').trim();
  const { textWithoutNotes, notes } = extractNotes(body);
  const { cleanedText, formaPago } = extractFormaPago(textWithoutNotes);
  const amountMatch = cleanedText.match(/\$?\s*\d+(?:[.,]\d{3})*(?:[.,]\d+)?\s*k?\b/i);
  const monto = amountMatch ? parseAmount(amountMatch[0]) : null;

  let clienteQuery = cleanedText;
  if (amountMatch) {
    clienteQuery = `${cleanedText.slice(0, amountMatch.index)} ${cleanedText.slice(amountMatch.index + amountMatch[0].length)}`;
  }

  return {
    intent: 'cobro',
    clienteQuery: clienteQuery.trim(),
    monto,
    formaPago,
    notas: notes
  };
}

export function parseAmount(value) {
  const raw = normalizeText(value).replace(/\s+/g, '');
  const multiplier = raw.endsWith('k') ? 1000 : 1;
  let numeric = raw.replace(/[$k]/g, '');

  if (numeric.includes(',') && numeric.includes('.')) {
    numeric = numeric.replace(/\./g, '').replace(',', '.');
  } else if ((numeric.match(/\./g) || []).length > 1) {
    numeric = numeric.replace(/\./g, '');
  } else if (/^\d+\.\d{3}$/.test(numeric)) {
    numeric = numeric.replace('.', '');
  } else {
    numeric = numeric.replace(',', '.');
  }

  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed * multiplier : null;
}

function parsePedidoItem(line) {
  const match = line.match(/^\s*(\d+(?:[.,]\d+)?)(?:\s*x)?\s+(.+)$/i);
  if (!match) return { cantidad: null, productoQuery: line.trim(), descuento: 0 };

  const cantidad = Number(match[1].replace(',', '.'));
  let productoQuery = match[2].trim();
  let descuento = 0;
  const discountMatch = productoQuery.match(/\b(?:desc|descuento|bonif|bonificacion)\s*(\d+(?:[.,]\d+)?)\s*%?\b/i);
  if (discountMatch) {
    descuento = Number(discountMatch[1].replace(',', '.'));
    productoQuery = productoQuery.replace(discountMatch[0], '').trim();
  }

  return { cantidad, productoQuery, descuento };
}

function findFirstQuantityIndex(text) {
  const match = text.match(/(^|\s)\d+(?:[.,]\d+)?(?:\s*x)?\s+\S/i);
  if (!match) return -1;
  return match.index + match[0].search(/\d/);
}

function splitInlineItems(text) {
  const matches = [...text.matchAll(/(^|\s)(\d+(?:[.,]\d+)?)(?:\s*x)?\s+/gi)];
  if (matches.length === 0) return text ? [text] : [];

  return matches.map((match, index) => {
    const start = match.index + match[1].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
    return text.slice(start, end).trim();
  });
}

function extractCondition(text) {
  return extractAlias(text, CONDICION_ALIASES, 'condicionPago');
}

function extractFormaPago(text) {
  const result = extractAlias(text, FORMA_PAGO_ALIASES, 'formaPago');
  return { cleanedText: result.cleanedText, formaPago: result.formaPago };
}

function extractAlias(text, aliases, key) {
  let cleanedText = text;
  let value = null;
  const normalized = normalizeText(text);

  for (const [alias, mapped] of aliases.entries()) {
    const pattern = new RegExp(`(^|\\s)${escapeRegExp(alias)}($|\\s)`, 'i');
    const normalizedMatch = normalized.match(pattern);
    if (normalizedMatch) {
      value = mapped;
      cleanedText = removeAliasFromOriginal(cleanedText, alias);
      break;
    }
  }

  return { cleanedText: cleanedText.trim(), [key]: value };
}

function extractNotes(text) {
  const normalized = normalizeText(text);
  for (const marker of OBS_MARKERS) {
    const pattern = new RegExp(`(^|\\s)${marker}\\s+`);
    const match = normalized.match(pattern);
    if (!match) continue;

    const markerStart = match.index + match[1].length;
    const originalPrefix = text.slice(0, markerStart).trim();
    const originalNote = text.slice(markerStart + marker.length).trim();
    return { textWithoutNotes: originalPrefix, notes: originalNote };
  }

  return { textWithoutNotes: text, notes: '' };
}

function removeAliasFromOriginal(text, alias) {
  const tokens = text.split(/\s+/);
  const aliasTokens = alias.split(/\s+/);

  for (let i = 0; i <= tokens.length - aliasTokens.length; i++) {
    const slice = tokens.slice(i, i + aliasTokens.length).join(' ');
    if (normalizeText(slice) === alias) {
      tokens.splice(i, aliasTokens.length);
      return tokens.join(' ');
    }
  }

  return text;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
