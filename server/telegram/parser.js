import { CONDICION_ALIASES, extractKnownAlias, FORMA_PAGO_ALIASES, OBS_MARKERS } from './aliases.js';
import { normalizeText } from './normalization.js';

export function parseTelegramMessage(text) {
  const raw = String(text || '').trim();
  const normalized = normalizeText(raw);

  if (!raw) return { intent: null, error: 'Mensaje vacio' };
  if (raw.startsWith('/')) return { intent: 'command', command: raw.split(/\s+/)[0].toLowerCase() };
  if (['confirmar', 'confirma', 'confirmo', 'confirmado', 'guardar', 'ok', 'si', 'dale'].includes(normalized)) return { intent: 'confirmar' };
  if (['cancelar', 'cancela', 'descartar', 'anular', 'no', '/cancelar'].includes(normalized)) return { intent: 'cancelar' };
  if (['resumen', 'ver resumen'].includes(normalized)) return { intent: 'resumen' };

  if (normalized.startsWith('pedido')) return parsePedido(raw);
  if (normalized.startsWith('cobro')) return parseCobro(raw);

  return { intent: null, error: 'No pude detectar si es pedido o cobro' };
}

export function parsePedidoNatural(text) {
  const blocks = splitPedidoBlocks(text);
  const pedidos = blocks.map(parsePedidoBlock).filter(Boolean);

  if (pedidos.length === 1) return pedidos[0];
  return {
    intent: 'pedido_batch',
    pedidos
  };
}

export function parsePedido(text) {
  const body = text.replace(/^\s*pedido\b/i, '').trim();
  const naturalBlocks = splitPedidoBlocks(body);
  if (naturalBlocks.length > 0) {
    const pedidos = naturalBlocks.map(parsePedidoBlock).filter(Boolean);
    if (pedidos.length === 1) return pedidos[0];
    return { intent: 'pedido_batch', pedidos };
  }

  const { textWithoutNotes, notes } = extractNotes(body);
  const { cleanedText, condicionPago } = extractCondition(textWithoutNotes);
  const inlineByComma = parseInlinePedidoByComma(cleanedText);
  if (inlineByComma) {
    return {
      intent: 'pedido',
      clienteQuery: inlineByComma.clienteQuery,
      condicionPago: condicionPago || 'contado',
      observaciones: notes,
      items: inlineByComma.itemLines.map(parsePedidoItem).filter((item) => item.productoQuery)
    };
  }

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
  const amountMatch = textWithoutNotes.match(/\$?\s*\d+(?:[.,]\d{3})*(?:[.,]\d+)?\s*k?\b/i);
  const monto = amountMatch ? parseAmount(amountMatch[0]) : null;

  let clienteQuery = textWithoutNotes;
  let formaPago = null;
  let inferredNotes = '';

  if (amountMatch) {
    const beforeAmount = textWithoutNotes.slice(0, amountMatch.index).trim();
    const afterAmount = textWithoutNotes.slice(amountMatch.index + amountMatch[0].length).trim();
    const afterPayment = extractFormaPagoWithRemainder(afterAmount);
    formaPago = afterPayment.formaPago;
    inferredNotes = afterPayment.remainder;

    if (!formaPago) {
      const beforePayment = extractFormaPagoWithRemainder(beforeAmount);
      formaPago = beforePayment.formaPago;
      clienteQuery = beforePayment.remainder;
    } else {
      clienteQuery = beforeAmount;
    }
  } else {
    const { cleanedText, formaPago: extractedFormaPago } = extractFormaPago(textWithoutNotes);
    clienteQuery = cleanedText;
    formaPago = extractedFormaPago;
  }

  return {
    intent: 'cobro',
    clienteQuery: clienteQuery.trim(),
    monto,
    formaPago,
    notas: notes || inferredNotes
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
  const match = line.match(new RegExp(`^\\s*(${QUANTITY_EXPRESSION_SOURCE})\\s*x?\\s*(.+)$`, 'i'));
  if (!match) return { cantidad: null, productoQuery: line.trim(), descuento: 0 };

  const cantidad = parseQuantityExpression(match[1]);
  let productoQuery = cleanProductQuery(match[2]);
  let descuento = 0;
  const discountMatch = productoQuery.match(/\b(?:desc|descuento|bonif|bonificacion)\s*(\d+(?:[.,]\d+)?)\s*%?\b/i);
  if (discountMatch) {
    descuento = Number(discountMatch[1].replace(',', '.'));
    productoQuery = productoQuery.replace(discountMatch[0], '').trim();
  }

  return { cantidad, productoQuery, descuento };
}

function findFirstQuantityIndex(text) {
  const match = text.match(new RegExp(`(^|\\s)${NUMERIC_QUANTITY_EXPRESSION_SOURCE}(?:\\s*x)?\\s*\\S`, 'i'));
  if (!match) return -1;
  const quantityMatch = match[0].match(new RegExp(NUMERIC_QUANTITY_EXPRESSION_SOURCE, 'i'));
  return match.index + (quantityMatch?.index || 0);
}

function splitInlineItems(text) {
  const matches = [...text.matchAll(new RegExp(`(^|\\s)(${NUMERIC_QUANTITY_EXPRESSION_SOURCE})\\s*x?\\s*`, 'gi'))];
  if (matches.length === 0) return text ? [text] : [];

  return matches.map((match, index) => {
    const start = match.index + match[1].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
    return text.slice(start, end).trim();
  });
}

const NUMBER_WORDS = new Map([
  ['un', 1],
  ['uno', 1],
  ['una', 1],
  ['dos', 2],
  ['tres', 3],
  ['cuatro', 4],
  ['cinco', 5],
  ['seis', 6],
  ['siete', 7],
  ['ocho', 8],
  ['nueve', 9],
  ['diez', 10],
  ['once', 11],
  ['doce', 12]
]);

const NUMBER_WORD_SOURCE = [...NUMBER_WORDS.keys()].join('|');
const NUMBER_TOKEN_SOURCE = `(?:\\d+(?:[.,]\\d+)?|${NUMBER_WORD_SOURCE})`;
const NUMERIC_QUANTITY_EXPRESSION_SOURCE = `(?:\\d+(?:[.,]\\d+)?)(?:\\s*\\+\\s*(?:\\d+(?:[.,]\\d+)?))*`;
const QUANTITY_EXPRESSION_SOURCE = `(?:${NUMBER_TOKEN_SOURCE})(?:\\s*\\+\\s*(?:${NUMBER_TOKEN_SOURCE}))*`;

function extractCondition(text) {
  return extractAlias(text, CONDICION_ALIASES, 'condicionPago');
}

function extractFormaPago(text) {
  const result = extractAlias(text, FORMA_PAGO_ALIASES, 'formaPago');
  return { cleanedText: result.cleanedText, formaPago: result.formaPago };
}

function extractFormaPagoWithRemainder(text) {
  const known = extractKnownAlias(text, FORMA_PAGO_ALIASES);
  if (!known) return { formaPago: null, remainder: cleanRemainder(text) };
  return {
    formaPago: known.value,
    remainder: cleanRemainder(removeAliasFromOriginal(text, known.alias))
  };
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
    if (normalizeText(slice).replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim() === alias) {
      tokens.splice(i, aliasTokens.length);
      return tokens.join(' ');
    }
  }

  return text;
}

function cleanRemainder(text) {
  return String(text || '')
    .replace(/^[\s,.;:-]+/, '')
    .replace(/[\s,.;:-]+$/, '')
    .trim();
}

function parseInlinePedidoByComma(text) {
  if (!String(text || '').includes(',')) return null;
  const parts = String(text)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return null;
  const itemLines = parts.slice(1).filter(isPedidoItemLine);
  if (itemLines.length !== parts.length - 1) return null;

  return {
    clienteQuery: parts[0],
    itemLines
  };
}

function splitPedidoBlocks(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks = [];
  let current = null;

  for (const line of lines) {
    if (isPedidoHeaderLine(line)) {
      if (current) blocks.push(current);
      current = { header: line, itemLines: [] };
      continue;
    }

    if (current && isPedidoItemLine(line)) {
      current.itemLines.push(line);
    }
  }

  if (current) blocks.push(current);
  return blocks.filter((block) => block.header && block.itemLines.length > 0);
}

function parsePedidoBlock(block) {
  const { cleanedText, condicionPago } = extractCondition(block.header);
  if (!cleanedText || !condicionPago) return null;

  return {
    intent: 'pedido',
    clienteQuery: cleanedText.trim(),
    condicionPago,
    observaciones: '',
    items: block.itemLines.map(parsePedidoItem).filter((item) => item.productoQuery)
  };
}

function isPedidoHeaderLine(line) {
  if (isPedidoItemLine(line)) return false;
  const { cleanedText, condicionPago } = extractCondition(line);
  return Boolean(condicionPago && cleanedText && cleanedText.length >= 2);
}

function isPedidoItemLine(line) {
  return new RegExp(`^\\s*${QUANTITY_EXPRESSION_SOURCE}\\s*x?\\s*\\S`, 'i').test(line);
}

function parseQuantityExpression(value) {
  const parts = String(value || '')
    .split('+')
    .map((part) => parseQuantityToken(part.trim()))
    .filter((part) => Number.isFinite(part));
  if (parts.length === 0) return null;
  return parts.reduce((sum, part) => sum + part, 0);
}

function parseQuantityToken(value) {
  const normalized = normalizeText(value);
  if (NUMBER_WORDS.has(normalized)) return NUMBER_WORDS.get(normalized);
  return Number(String(value || '').replace(',', '.'));
}

function cleanProductQuery(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+y\s*$/i, '')
    .trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
