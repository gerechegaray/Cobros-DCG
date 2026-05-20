import { normalizeText } from './normalization.js';

export const CONDICION_ALIASES = new Map([
  ['cc', 'cuenta_corriente'],
  ['cta cte', 'cuenta_corriente'],
  ['ctacte', 'cuenta_corriente'],
  ['cuenta corriente', 'cuenta_corriente'],
  ['cont', 'contado'],
  ['contado', 'contado']
]);

export const FORMA_PAGO_ALIASES = new Map([
  ['ef', 'efectivo'],
  ['efe', 'efectivo'],
  ['efectivo', 'efectivo'],
  ['tr', 'transferencia'],
  ['trans', 'transferencia'],
  ['transf', 'transferencia'],
  ['transferencia', 'transferencia'],
  ['ch', 'cheque'],
  ['cheq', 'cheque'],
  ['cheque', 'cheque'],
  ['otro', 'otro']
]);

export const OBS_MARKERS = ['obs', 'nota', 'notas', 'observacion', 'observaciones'];

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
  const normalized = normalizeText(text);
  for (const [alias, value] of aliases.entries()) {
    if (normalized === alias) return value;
  }
  return null;
}

export function extractKnownAlias(text, aliases) {
  const normalized = normalizeText(text);
  for (const [alias, value] of aliases.entries()) {
    const pattern = new RegExp(`(^|\\s)${escapeRegExp(alias)}($|\\s)`);
    if (pattern.test(normalized)) {
      return { value, alias };
    }
  }
  return null;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
