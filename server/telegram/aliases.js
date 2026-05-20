import { normalizeText } from './normalization.js';

export const CONDICION_ALIASES = new Map([
  ['cc', 'cuenta_corriente'],
  ['c/c', 'cuenta_corriente'],
  ['cta cte', 'cuenta_corriente'],
  ['cta corriente', 'cuenta_corriente'],
  ['ctacte', 'cuenta_corriente'],
  ['ctacta', 'cuenta_corriente'],
  ['cuenta corriente', 'cuenta_corriente'],
  ['c corriente', 'cuenta_corriente'],
  ['cont', 'contado'],
  ['contado', 'contado'],
  ['de contado', 'contado']
]);

export const FORMA_PAGO_ALIASES = new Map([
  ['e', 'efectivo'],
  ['ef', 'efectivo'],
  ['efe', 'efectivo'],
  ['efec', 'efectivo'],
  ['efectivo', 'efectivo'],
  ['cash', 'efectivo'],
  ['tr', 'transferencia'],
  ['trans', 'transferencia'],
  ['transf', 'transferencia'],
  ['transfe', 'transferencia'],
  ['transfer', 'transferencia'],
  ['tranferencia', 'transferencia'],
  ['transferencia', 'transferencia'],
  ['transferencia bancaria', 'transferencia'],
  ['banco', 'transferencia'],
  ['bco', 'transferencia'],
  ['mp', 'transferencia'],
  ['mercado pago', 'transferencia'],
  ['mercadopago', 'transferencia'],
  ['ch', 'cheque'],
  ['cheq', 'cheque'],
  ['che', 'cheque'],
  ['cheque', 'cheque'],
  ['otros', 'otro'],
  ['otro', 'otro']
]);

export const OBS_MARKERS = ['obs', 'nota', 'notas', 'observacion', 'observaciones', 'detalle', 'detalles'];

export function parseEnvAliases(raw) {
  if (!raw) return new Map();

  try {
    const parsed = JSON.parse(raw);
    return new Map(
      Object.entries(parsed).map(([alias, value]) => [normalizeText(alias), String(value)])
    );
  } catch {
    return new Map(
      String(raw)
        .split(';')
        .map((pair) => pair.split('='))
        .filter(([alias, value]) => alias && value)
        .map(([alias, value]) => [normalizeText(alias), value.trim()])
    );
  }
}

export function findAliasValue(text, aliases) {
  const normalized = normalizeAliasText(text);
  for (const [alias, value] of aliases.entries()) {
    if (normalized === alias) return value;
  }
  return null;
}

export function extractKnownAlias(text, aliases) {
  const normalized = normalizeAliasText(text);
  for (const [alias, value] of aliases.entries()) {
    const pattern = new RegExp(`(^|\\s)${escapeRegExp(alias)}($|\\s)`);
    if (pattern.test(normalized)) {
      return { value, alias };
    }
  }
  return null;
}

function normalizeAliasText(value) {
  return normalizeText(value).replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
