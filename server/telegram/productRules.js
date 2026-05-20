import { normalizeText } from './normalization.js';

const EXACT_PRODUCT_ALIASES = new Map([
  ['op premium gato ad x7kg', 'old prince premium gato adulto x 7.5 kg'],
  ['op premium gato ad x7', 'old prince premium gato adulto x 7.5 kg'],
  ['op premium gato ad x3kg', 'old prince premium gato adulto x 3 kg'],
  ['op premium cachorro 15 kg', 'old prince premium perros cachorro x 15 kg'],
  ['op premium cachorro x3kg', 'old prince premium perros cachorro x 3 kg'],
  ['op premium perro ad x20kg', 'old prince premium perros adultos x 20 kg'],
  ['op premium perro ad x20', 'old prince premium perros adultos x 20 kg'],
  ['op premium perro ad x3kg', 'old prince premium perros adultos x 3 kg'],
  ['old prince premium ad x20kg', 'old prince premium perros adultos x 20 kg'],
  ['old prince premium ad x20', 'old prince premium perros adultos x 20 kg'],
  ['op premium cordero x3kg', 'old prince premium perros cordero x 3 kg'],
  ['op premium cordero x15kg', 'old prince premium perros cordero x 15 kg'],
  ['premium perro ad cordero x3kg', 'old prince premium perros cordero x 3 kg'],
  ['premium perro cach x3kg', 'old prince premium perros cachorro x 3 kg'],
  ['op premium gatito x3 kg', 'old prince premium gatito x 3 kg'],
  ['op premium gatito x3kg', 'old prince premium gatito x 3 kg'],
  ['op premium gato cordero x3kg', 'old prince premium gato cordero adulto x 3 kg'],
  ['op premium urinario x7kg', 'old prince premium gato urinario x 7.5 kg'],
  ['op premium urinario x7', 'old prince premium gato urinario x 7.5 kg'],
  ['op urinario x7kg', 'old prince premium gato urinario x 7.5 kg'],
  ['op urinario x7', 'old prince premium gato urinario x 7.5 kg'],
  ['op premium urinario x3kg', 'old prince premium gato urinario x 3 kg'],
  ['op c a cachorro 3 kg', 'old prince novel cordero y arroz perro cachorro x 3 kg'],
  ['op c a ad rp x15kg', 'old prince novel cordero y arroz perro adulto raza pequena x 15 kg'],
  ['op c a rpx3kg', 'old prince novel cordero y arroz perro adulto raza pequena x 3 kg'],
  ['op c a rp x3kg', 'old prince novel cordero y arroz perro adulto raza pequena x 3 kg'],
  ['c a rp x3kg', 'old prince novel cordero y arroz perro adulto raza pequena x 3 kg'],
  ['op eq cachorro rp x7kg', 'old prince equilibrium cachorro raza pequena x 7.5 kg'],
  ['op eq cachorro rp x3kg', 'old prince equilibrium cachorro raza pequena x 3 kg'],
  ['op eq rp ad x15kg', 'old prince equilibrium adultos raza pequena x 15 kg'],
  ['op eq rp ad x3kg', 'old prince equilibrium adultos raza pequena x 3 kg'],
  ['op eq perro ad x20kg', 'old prince equilibrium adultos medianos y grandes x 20 kg'],
  ['op eq perro ad x20', 'old prince equilibrium adultos medianos y grandes x 20 kg'],
  ['op eq rg x3kg', 'old prince equilibrium adultos medianos y grandes x 3 kg'],
  ['op eq rg x20kg', 'old prince equilibrium adultos medianos y grandes x 20 kg'],
  ['op eq rg x20', 'old prince equilibrium adultos medianos y grandes x 20 kg'],
  ['op equi rg x20kg', 'old prince equilibrium adultos medianos y grandes x 20 kg'],
  ['op equi rg x20', 'old prince equilibrium adultos medianos y grandes x 20 kg'],
  ['op equil raza gde x20kg', 'old prince equilibrium adultos medianos y grandes x 20 kg'],
  ['op equil raza gde x20', 'old prince equilibrium adultos medianos y grandes x 20 kg'],
  ['equilibrium gato x3kg', 'old prince equilibrium complete care adulto gato x 3 kg'],
  ['equilibrium gato x3', 'old prince equilibrium complete care adulto gato x 3 kg'],
  ['company gatito x3kg', 'company gato cachorro x 3 kg'],
  ['company gatito x3', 'company gato cachorro x 3 kg'],
  ['company kiten 3 kg', 'company gato cachorro x 3 kg'],
  ['company kitten 3 kg', 'company gato cachorro x 3 kg'],
  ['op cya ad rg x15kg', 'old prince novel cordero y arroz perro adulto x 15 kg'],
  ['op cya ad rg x15', 'old prince novel cordero y arroz perro adulto x 15 kg'],
  ['seguidor ad rp x15kg', 'seguidor adulto mordida pequena x 15 kg'],
  ['seguidor ad x15kg', 'seguidor adulto carne y cereales x 15 kg'],
  ['seguidor ad x20kg', 'seguidor adulto carne y cereales x 20 kg'],
  ['seguidor ad x20', 'seguidor adulto carne y cereales x 20 kg'],
  ['def 2 5', 'defender top 90 2 a 4.4 kg'],
  ['def 2-5', 'defender top 90 2 a 4.4 kg'],
  ['sim 2 5', 'simparica 10mg 2.5 5 kg'],
  ['sim 2-5', 'simparica 10mg 2.5 5 kg'],
  ['curabigen', 'curabigen plata'],
  ['aca no', 'aca no']
]);

const TOKEN_REPLACEMENTS = [
  [/\bseguidor ad rp\b/g, 'seguidor adulto mordida pequena'],
  [/\bseguidor ad\b/g, 'seguidor adulto carne cereales'],
  [/\bop\b/g, 'old prince'],
  [/\beq\b/g, 'equilibrium'],
  [/\bequi\b/g, 'equilibrium'],
  [/\bequil\b/g, 'equilibrium'],
  [/\brp\b/g, 'raza pequena'],
  [/\brg\b/g, 'medianos grandes'],
  [/\braza gde\b/g, 'medianos grandes'],
  [/\bad\b/g, 'adulto'],
  [/\badulto\b/g, 'adulto'],
  [/\bcach\b/g, 'cachorro'],
  [/\bkiten\b/g, 'kitten'],
  [/\bgatito\b/g, 'gatito'],
  [/\bperro cach\b/g, 'perro cachorro'],
  [/\bc a\b/g, 'novel cordero arroz'],
  [/\bcya\b/g, 'novel cordero arroz'],
  [/\bc\.a\./g, 'novel cordero arroz'],
  [/\bcaja\b/g, ''],
  [/\bcajas\b/g, ''],
  [/\bcon acondicionador\b/g, 'acondicionador']
];

export function getProductQueryVariants(query) {
  const original = normalizeProductQuery(query);
  const exact = getExactProductAlias(query);
  const normalizedExact = exact ? normalizeProductQuery(exact) : '';
  const expanded = expandProductQuery(original);
  const normalizedExpanded = expanded ? normalizeProductQuery(expanded) : '';
  return [...new Set([exact, normalizedExact, expanded, normalizedExpanded, original].filter(Boolean))];
}

export function getExactProductAlias(query) {
  return EXACT_PRODUCT_ALIASES.get(normalizeProductQuery(query));
}

export function normalizeProductQuery(query) {
  return normalizeText(query)
    .replace(/(\d)[,.](\d)/g, '$1dec$2')
    .replace(/\./g, ' ')
    .replace(/(\d)dec(\d)/g, '$1.$2')
    .replace(/\bc\.?\s*a\.?\b/g, 'c a')
    .replace(/\brp\s*x\s*(\d)/g, 'rp x$1')
    .replace(/\brpx\s*(\d)/g, 'rp x$1')
    .replace(/(\d)(kg|k)\b/g, '$1 kg')
    .replace(/\bx\s*(\d+(?:[.,]\d+)?)\s*(kg|k)?\b/g, 'x$1kg')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandProductQuery(query) {
  let expanded = query;

  for (const [pattern, replacement] of TOKEN_REPLACEMENTS) {
    expanded = expanded.replace(pattern, replacement);
  }

  expanded = expanded
    .replace(/\bx3kg\b/g, 'x 3 kg')
    .replace(/\bx7kg\b/g, 'x 7.5 kg')
    .replace(/\bx7\b/g, 'x 7.5 kg')
    .replace(/\bx15kg\b/g, 'x 15 kg')
    .replace(/\bx20kg\b/g, 'x 20 kg')
    .replace(/\bx8kg\b/g, 'x 8 kg')
    .replace(/\b2\s*5\b/g, '2.5 5')
    .replace(/\bpremium perro adulto\b/g, 'premium perros adultos')
    .replace(/\bpremium cachorro\b/g, 'premium perros cachorro')
    .replace(/\bpremium cordero\b/g, 'premium perros cordero')
    .replace(/\bgato adulto\b/g, 'gato adulto')
    .replace(/\bgato ad\b/g, 'gato adulto')
    .replace(/\bgato urinario\b/g, 'gato urinario')
    .replace(/\burinario\b/g, 'gato urinario')
    .replace(/\s+/g, ' ')
    .trim();

  return expanded;
}
