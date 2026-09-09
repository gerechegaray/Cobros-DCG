// Criterio alineado a db-alegra-notion (classify_bucket + liquidaciones PDF).

export const VENDEDORES_VALIDOS = ['Guille', 'Santi', 'Victor'];

export const BASICO_GUILLE = 1_400_000;
export const BASICO_FLETE_SANTI = 400_000;
export const PCT_FLETE_SANTI = 0.012;

export const CLIENTES_EXCLUIR_COBROS = new Set(['213']);
export const CLIENTES_AJUSTE_VICTOR = new Set(['231', '145', '228']);

const EXCL_KG = [
  'simparica', 'defender', 'ectogen', 'fiprogen', 'shampoo', 'jeringas',
  'agujas', 'comprimidos', 'dosis', 'gotero', 'ml', ' cc ', 'iny',
  'sitogen', 'hectopar', 'curabigen', 'acá no', 'puaj', 'vermican', 'supresor'
];

export const REGLAS_FAMILIA = [
  { categoria: 'Seguidor', porcentaje: 3 },
  { categoria: 'Manada', porcentaje: 3 },
  { categoria: 'Origen', porcentaje: 3.5 },
  { categoria: 'Company', porcentaje: 3.5 },
  { categoria: 'Old Prince Premium', porcentaje: 4 },
  { categoria: 'Old Prince Equilibrium', porcentaje: 4.5 },
  { categoria: 'Old Prince Noveles', porcentaje: 5.5 },
  { categoria: 'Old Prince (otros)', porcentaje: 5 },
  { categoria: 'Fawna', porcentaje: 6.5 },
  { categoria: 'Resto', porcentaje: 5 }
];

export function clientIdOf(doc) {
  const id = doc?.client?.id ?? doc?.clientId;
  return id == null ? '' : String(id);
}

export function vendedorEfectivo(doc) {
  const deFactura = String(doc?.seller?.name || '').trim();
  if (deFactura) return deFactura;
  return String(
    doc?.client?.sellerName ||
    doc?.client?.seller?.name ||
    doc?.clientSeller ||
    ''
  ).trim();
}

export function classifyBucketCobros(description) {
  const s = String(description || '').toLowerCase();

  if (s.includes('old prince')) {
    if (s.includes('noveles')) {
      return { categoria: 'Old Prince Noveles', porcentaje: 5.5 };
    }
    if (s.includes('equilibrium')) {
      return { categoria: 'Old Prince Equilibrium', porcentaje: 4.5 };
    }
    if (s.includes('premium')) {
      return { categoria: 'Old Prince Premium', porcentaje: 4 };
    }
    return { categoria: 'Old Prince (otros)', porcentaje: 5 };
  }

  if (s.includes('fawna')) return { categoria: 'Fawna', porcentaje: 6.5 };
  if (s.includes('seguidor')) return { categoria: 'Seguidor', porcentaje: 3 };
  if (s.includes('manada')) return { categoria: 'Manada', porcentaje: 3 };
  if (s.includes('origen')) return { categoria: 'Origen', porcentaje: 3.5 };
  if (s.includes('company')) return { categoria: 'Company', porcentaje: 3.5 };
  return { categoria: 'Resto', porcentaje: 5 };
}

export function classifyVictor(description) {
  const s = String(description || '').toLowerCase();
  const alimentos = ['old prince', 'fawna', 'company', 'origen', 'seguidor', 'manada'];
  if (alimentos.some((m) => s.includes(m))) {
    return { categoria: 'Alimentos (6%)', porcentaje: 6 };
  }
  return { categoria: 'Resto (8%)', porcentaje: 8 };
}

export function basicoMensual(vendedor) {
  return vendedor === 'Guille' ? BASICO_GUILLE : 0;
}

export function totalAjustesDe(ajustes) {
  return (ajustes || []).reduce((sum, ajuste) => {
    return sum + (ajuste.tipo === 'positivo' ? ajuste.monto : -ajuste.monto);
  }, 0);
}

export function totalFinalMensual(vendedor, totalComision, ajustes) {
  return (Number(totalComision) || 0) + totalAjustesDe(ajustes) + basicoMensual(vendedor);
}

export function usaFlete(vendedor) {
  return vendedor === 'Santi';
}

function norm(name) {
  return String(name || '').trim().toLowerCase();
}

export function detectKg(name) {
  const s = norm(name).replace(/,/g, '.');
  if (EXCL_KG.some((t) => s.includes(t))) {
    return { kg: 0, excluded: true };
  }
  if (s.includes('seguidor') || s.includes('manada')) {
    return { kg: 0, excluded: true };
  }
  let m = s.match(/x\s*(\d+(?:\.\d+)?)\s*kg\b/);
  if (!m) m = s.match(/(\d+(?:\.\d+)?)\s*kg\b/);
  if (!m) return { kg: 0, excluded: false };
  return { kg: Number(m[1]), excluded: false };
}

export function bonoKgSanti(kg) {
  if (kg < 50) return 0;
  if (kg < 75) return 2500;
  if (kg < 100) return 4000;
  if (kg < 125) return 6000;
  if (kg < 150) return 8500;
  if (kg < 175) return 11000;
  if (kg < 200) return 13500;
  if (kg < 225) return 16000;
  if (kg < 250) return 18500;
  if (kg < 275) return 21000;
  if (kg < 300) return 23500;
  return 25000;
}

function lineasDePedido(pedido) {
  return pedido.detalle || pedido.items || pedido.productos || [];
}

function nombreItem(item) {
  return item.name || item.description || item.nombre || item.producto || '';
}

export function kgDeHoja(hoja) {
  let kg = 0;
  for (const pedido of hoja.pedidos || []) {
    for (const item of lineasDePedido(pedido)) {
      const qty = Number(item.quantity ?? item.cantidad ?? 0) || 0;
      const { kg: kgItem, excluded } = detectKg(nombreItem(item));
      if (excluded || kgItem <= 0 || qty <= 0) continue;
      kg += qty * kgItem;
    }
  }
  return kg;
}

export function fleteHojaSanti(montoHoja, kg) {
  return Number(montoHoja || 0) * PCT_FLETE_SANTI + bonoKgSanti(kg);
}
