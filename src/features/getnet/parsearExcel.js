import * as XLSX from 'xlsx';
import {
  claveFecha,
  detectarDcgEnNombreArchivo,
  esEstadoRechazado,
  esVacio,
  limpiarTexto,
  parseFecha,
  parseNumero,
  resolverDcg,
  textoCelda
} from './utils';

const CAMPOS = {
  fecha: 'fecha',
  bruto: 'bruto',
  neto: 'neto',
  costo: 'costo',
  ivaCft: 'ivaCft',
  cuotas: 'cuotas',
  billetera: 'billetera',
  marca: 'marca',
  tipo: 'tipo',
  cupon: 'cupon',
  estado: 'estado',
  establecimiento: 'establecimiento'
};

function mapearCampo(encabezado) {
  const clave = limpiarTexto(encabezado);
  if (!clave) return null;
  if (clave === 'nombre establecimiento' || (clave.includes('establecimiento') && clave.includes('nombre'))) {
    return CAMPOS.establecimiento;
  }
  if (clave === 'fecha de operacion' || clave === 'fecha') return CAMPOS.fecha;
  if (clave === 'monto bruto transaccion' || clave === 'monto bruto' || clave === 'total') return CAMPOS.bruto;
  if (clave === 'monto neto transaccion' || clave === 'monto neto' || clave === 'neto') return CAMPOS.neto;
  if (clave === 'costo financiero') return CAMPOS.costo;
  if (clave === 'iva cft') return CAMPOS.ivaCft;
  if (clave === 'plan cuotas') return CAMPOS.cuotas;
  if (clave === 'billetera' || clave === 'medio pago') return CAMPOS.billetera;
  if (clave === 'marca') return CAMPOS.marca;
  if (clave === 'tipo' || clave === 'tipo ticket') return CAMPOS.tipo;
  if (clave === 'nro de cupon' || clave === 'cupon') return CAMPOS.cupon;
  if (clave === 'estado' || clave.includes('estado')) return CAMPOS.estado;
  return null;
}

function encontrarFilaEncabezado(matriz) {
  const limite = Math.min(matriz.length, 25);
  for (let i = 0; i < limite; i += 1) {
    const campos = (matriz[i] || []).map((celda) => mapearCampo(celda)).filter(Boolean);
    if (campos.includes(CAMPOS.fecha) && (campos.includes(CAMPOS.bruto) || campos.includes(CAMPOS.neto))) {
      return i;
    }
  }
  return 0;
}

function leerWorkbook(file, buffer) {
  const nombre = String(file?.name || '').toLowerCase();
  if (nombre.endsWith('.csv')) {
    return XLSX.read(new TextDecoder('utf-8').decode(buffer), { type: 'string', raw: false });
  }
  return XLSX.read(buffer, { type: 'array', cellDates: true, raw: false });
}

function filasDesdeSheet(sheet) {
  const matriz = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: false });
  if (!matriz.length) return [];

  const headerIdx = encontrarFilaEncabezado(matriz);
  const encabezados = matriz[headerIdx] || [];
  const mapa = encabezados.map((titulo) => mapearCampo(titulo));

  return matriz.slice(headerIdx + 1).map((fila) => {
    const raw = {};
    mapa.forEach((campo, idx) => {
      if (!campo) return;
      if (raw[campo] == null || raw[campo] === '') raw[campo] = fila[idx];
    });
    return raw;
  });
}

function normalizarFila(raw) {
  const fecha = parseFecha(raw.fecha);
  const bruto = parseNumero(raw.bruto);
  const costo = parseNumero(raw.costo);
  const ivaCft = parseNumero(raw.ivaCft);
  let neto = raw.neto == null || raw.neto === '' ? bruto - costo - ivaCft : parseNumero(raw.neto);
  if (neto === 0 && bruto > 0) {
    neto = bruto - costo - ivaCft;
  }

  const marcaRaw = textoCelda(raw.marca, '');
  const billetera = textoCelda(raw.billetera);
  let marcaDisplay = marcaRaw ? marcaRaw.toUpperCase() : billetera;
  if (!marcaRaw || limpiarTexto(marcaRaw) === 'nan') {
    marcaDisplay = limpiarTexto(billetera) === 'nan' || esVacio(raw.billetera) ? 'QR / Billetera' : billetera;
  }

  const cuotasNumero = parseNumero(raw.cuotas);
  const cuotasTexto = esVacio(raw.cuotas) ? '' : String(raw.cuotas).trim();
  const tieneCuota = Boolean(cuotasTexto) && cuotasTexto !== '0' && cuotasNumero !== 0;

  return {
    fecha,
    bruto,
    neto,
    costo,
    ivaCft,
    cuotas: tieneCuota ? cuotasTexto : '',
    billetera,
    marca: marcaDisplay,
    tipo: textoCelda(raw.tipo),
    cupon: textoCelda(raw.cupon),
    estado: textoCelda(raw.estado, ''),
    establecimiento: textoCelda(raw.establecimiento, '')
  };
}

function agrupar(filas, claveFn, etiquetaFn) {
  const mapa = new Map();
  filas.forEach((fila) => {
    const clave = claveFn(fila);
    const actual = mapa.get(clave) || { etiqueta: etiquetaFn(fila), tx: 0, bruto: 0, neto: 0 };
    actual.tx += 1;
    actual.bruto += fila.bruto;
    actual.neto += fila.neto;
    mapa.set(clave, actual);
  });
  return Array.from(mapa.values());
}

export async function leerFilasArchivo(file) {
  const buffer = await file.arrayBuffer();
  const workbook = leerWorkbook(file, buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    throw new Error('El archivo no tiene hojas para leer.');
  }

  const crudas = filasDesdeSheet(sheet);
  const filas = crudas
    .map(normalizarFila)
    .filter((fila) => fila.fecha)
    .filter((fila) => !esEstadoRechazado(fila.estado));

  if (!filas.length) {
    throw new Error('Sin transacciones válidas. Revisá que el Excel tenga fecha y que no estén todas rechazadas.');
  }

  const establecimientos = [...new Set(filas.map((fila) => fila.establecimiento).filter(Boolean))];
  let dcgDetectado = detectarDcgEnNombreArchivo(file.name);
  if (!dcgDetectado && establecimientos.length === 1) {
    dcgDetectado = resolverDcg(establecimientos[0]);
  }

  return {
    filas,
    dcgDetectado,
    establecimientos
  };
}

export function construirInforme(filas, propietario) {
  const fechas = filas.map((fila) => fila.fecha).sort((a, b) => a - b);
  const fechaDesde = fechas[0];
  const fechaHasta = fechas[fechas.length - 1];
  const bruto = filas.reduce((acc, fila) => acc + fila.bruto, 0);
  const neto = filas.reduce((acc, fila) => acc + fila.neto, 0);
  const costo = filas.reduce((acc, fila) => acc + fila.costo, 0);
  const ivaCft = filas.reduce((acc, fila) => acc + fila.ivaCft, 0);
  const mostrarNeto = costo > 0 || ivaCft > 0;
  const tieneCuotas = filas.some((fila) => fila.cuotas);
  const montos = filas.map((fila) => fila.bruto);

  const porDia = agrupar(filas, (fila) => claveFecha(fila.fecha), (fila) => fila.fecha)
    .sort((a, b) => a.etiqueta - b.etiqueta);
  const porMarca = agrupar(filas, (fila) => fila.marca, (fila) => fila.marca)
    .sort((a, b) => b.bruto - a.bruto);
  const porTipo = agrupar(filas, (fila) => fila.tipo, (fila) => fila.tipo)
    .sort((a, b) => b.bruto - a.bruto);

  return {
    propietario,
    fechaDesde,
    fechaHasta,
    transacciones: filas,
    mostrarNeto,
    tieneCuotas,
    kpis: {
      bruto,
      neto,
      transacciones: filas.length,
      ticketPromedio: filas.length ? bruto / filas.length : 0,
      ticketMax: montos.length ? Math.max(...montos) : 0,
      ticketMin: montos.length ? Math.min(...montos) : 0
    },
    porDia,
    porMarca,
    porTipo
  };
}
