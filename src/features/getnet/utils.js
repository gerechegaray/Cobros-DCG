import { ESTABLECIMIENTOS, ESTADOS_RECHAZADOS } from './constants';

export function limpiarTexto(valor) {
  return String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function esVacio(valor) {
  if (valor == null) return true;
  const texto = String(valor).trim().toLowerCase();
  return texto === '' || texto === 'nan' || texto === 'undefined' || texto === 'null' || texto === '-';
}

export function parseNumero(valor) {
  if (valor == null || valor === '') return 0;
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;

  let texto = String(valor).trim();
  if (!texto || texto === '—' || texto === '-') return 0;

  const negativoParentesis = /^\(.*\)$/.test(texto);
  const negativoFinal = /-$/.test(texto);
  texto = texto.replace(/[()\s$]/g, '').replace(/-$/, '');

  if (texto.includes(',') && texto.includes('.')) {
    if (texto.lastIndexOf(',') > texto.lastIndexOf('.')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    } else {
      texto = texto.replace(/,/g, '');
    }
  } else if (texto.includes(',')) {
    const partes = texto.split(',');
    texto = partes.length === 2 && partes[1].length <= 2
      ? `${partes[0].replace(/\./g, '')}.${partes[1]}`
      : texto.replace(',', '.');
  }

  const numero = Number(texto);
  if (!Number.isFinite(numero)) return 0;
  const signo = negativoParentesis || negativoFinal ? -1 : 1;
  return signo * numero;
}

export function parseFecha(valor) {
  if (valor == null || valor === '') return null;
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor;

  if (typeof valor === 'number' && Number.isFinite(valor)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const ms = excelEpoch + valor * 86400000;
    const fecha = new Date(ms);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  const texto = String(valor).trim();
  const conHora = texto.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (conHora) {
    let anio = Number(conHora[3]);
    if (anio < 100) anio += 2000;
    const fecha = new Date(
      anio,
      Number(conHora[2]) - 1,
      Number(conHora[1]),
      Number(conHora[4] || 0),
      Number(conHora[5] || 0),
      Number(conHora[6] || 0)
    );
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (iso) {
    const fecha = new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
      Number(iso[4] || 0),
      Number(iso[5] || 0),
      Number(iso[6] || 0)
    );
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  const fallback = new Date(texto);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function formatearMontoArs(valor) {
  const n = Number.isFinite(valor) ? valor : 0;
  const entero = Math.round(n);
  const conMiles = Math.abs(entero).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${entero < 0 ? '- ' : ''}$ ${conMiles}`;
}

export function formatearFechaCorta(fecha) {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return '';
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${fecha.getFullYear()}`;
}

export function formatearFechaHora(fecha) {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return '';
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const hh = String(fecha.getHours()).padStart(2, '0');
  const min = String(fecha.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${fecha.getFullYear()} ${hh}:${min}`;
}

export function formatearFechaArchivo(fecha) {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return '';
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${fecha.getFullYear()}`;
}

export function claveFecha(fecha) {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return '';
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${fecha.getFullYear()}-${mm}-${dd}`;
}

export function normalizarDcg(texto) {
  const clave = String(texto || '').replace(/\s+/g, '').toUpperCase();
  const match = clave.match(/DCG(\d+)/);
  return match ? `DCG${Number(match[1])}` : clave;
}

export function resolverDcg(texto) {
  const dcg = normalizarDcg(texto);
  if (ESTABLECIMIENTOS[dcg]) return dcg;

  const busqueda = String(texto || '').trim().toLowerCase();
  if (!busqueda) return '';

  const exacto = Object.entries(ESTABLECIMIENTOS).find(
    ([, propietario]) => propietario.toLowerCase() === busqueda
  );
  if (exacto) return exacto[0];

  const parcial = Object.entries(ESTABLECIMIENTOS).find(
    ([, propietario]) => propietario.toLowerCase().includes(busqueda)
  );
  return parcial ? parcial[0] : '';
}

export function resolverPropietario(texto) {
  const dcg = resolverDcg(texto);
  if (dcg) return ESTABLECIMIENTOS[dcg];
  return String(texto || '').trim();
}

export function detectarDcgEnNombreArchivo(nombreArchivo) {
  const match = String(nombreArchivo || '').match(/DCG\s*(\d+)/i);
  return match ? `DCG${Number(match[1])}` : '';
}

export function nombreArchivoInforme(propietario, fechaDesde, fechaHasta) {
  const desde = formatearFechaArchivo(fechaDesde);
  const hasta = formatearFechaArchivo(fechaHasta);
  const rango = !desde || !hasta || desde === hasta ? desde || hasta : `${desde}_${hasta}`;
  const slug = String(propietario || 'Cliente').replace(/ /g, '_');
  return `Informe_${slug}_${rango}.pdf`;
}

export function esEstadoRechazado(estado) {
  return ESTADOS_RECHAZADOS.includes(limpiarTexto(estado));
}

export function textoCelda(valor, fallback = '—') {
  if (esVacio(valor)) return fallback;
  return String(valor).trim();
}
