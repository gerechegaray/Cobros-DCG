import { getAlegraPayments, getAlegraInvoiceById, getAlegraInvoicesRango, getAlegraPaymentsRango } from './alegraService.js';
import { Timestamp } from 'firebase-admin/firestore';
import {
  CLIENTES_AJUSTE_VICTOR,
  CLIENTES_EXCLUIR_COBROS,
  REGLAS_FAMILIA,
  VENDEDORES_VALIDOS,
  basicoMensual,
  classifyBucketCobros,
  classifyVictor,
  clientIdOf,
  periodoARango,
  totalFinalMensual,
  vendedorEfectivo
} from './comisionesPolitica.js';

export { VENDEDORES_VALIDOS };

export async function getReglasComisiones(adminDb) {
  if (!adminDb) {
    throw new Error('Firebase no inicializado');
  }

  const snapshot = await adminDb.collection('comisiones_reglas')
    .where('activa', '==', true)
    .get();

  if (snapshot.empty) {
    return Object.fromEntries(REGLAS_FAMILIA.map((r) => [r.categoria, r.porcentaje]));
  }

  const reglas = {};
  snapshot.forEach((doc) => {
    const data = doc.data();
    reglas[data.categoria] = data.porcentaje;
  });
  return reglas;
}

/**
 * Calcular comisiones mensuales para un período
 */
export async function calcularComisionesMensuales(adminDb, periodo) {
  if (!adminDb) {
    throw new Error('Firebase no inicializado');
  }

  console.log(`[COMISIONES] Iniciando cálculo para período: ${periodo}`);

  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    throw new Error('Formato de período inválido. Debe ser YYYY-MM');
  }

  const [anio, mes] = periodo.split('-');
  const fechaInicio = new Date(parseInt(anio), parseInt(mes) - 1, 1);
  const fechaFin = new Date(parseInt(anio), parseInt(mes), 0, 23, 59, 59);

  const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
  const fechaFinStr = fechaFin.toISOString().split('T')[0];

  console.log(`[COMISIONES] Buscando COBROS entre ${fechaInicioStr} y ${fechaFinStr}`);
  const snapshotCobros = await adminDb.collection('movimientos_comisiones')
    .where('fecha', '>=', fechaInicioStr)
    .where('fecha', '<=', fechaFinStr)
    .get();

  console.log(`[COMISIONES] Buscando VENTAS (Victor) entre ${fechaInicioStr} y ${fechaFinStr}`);
  const snapshotVentas = await adminDb.collection('movimientos_ventas')
    .where('fecha', '>=', fechaInicioStr)
    .where('fecha', '<=', fechaFinStr)
    .get();

  console.log(`[COMISIONES] Encontrados: ${snapshotCobros.size} cobros, ${snapshotVentas.size} ventas`);

  const comisionesPorVendedor = {};
  for (const vendedorNombre of VENDEDORES_VALIDOS) {
    comisionesPorVendedor[vendedorNombre] = {
      vendedor: vendedorNombre,
      periodo,
      totalCobrado: 0,
      totalComision: 0,
      detalle: []
    };
  }

  snapshotCobros.forEach((doc) => {
    const factura = doc.data();
    const vendedorNombre = vendedorEfectivo(factura);

    if (vendedorNombre !== 'Guille' && vendedorNombre !== 'Santi') {
      return;
    }
    if (CLIENTES_EXCLUIR_COBROS.has(clientIdOf(factura))) {
      return;
    }

    const items = factura.items || [];
    const amountPaid = parseFloat(factura.amountPaid) || 0;
    const totalInvoice = parseFloat(factura.totalInvoice) || 0;
    const proporcionCobro = totalInvoice > 0 ? (amountPaid / totalInvoice) : 1;

    items.forEach((item) => {
      const description = item.description || item.name || '';
      const subtotalOriginal = parseFloat(item.subtotal) || 0;
      if (subtotalOriginal <= 0) return;

      const subtotalProporcional = subtotalOriginal * proporcionCobro;
      const { categoria, porcentaje } = classifyBucketCobros(`${item.category || ''} ${description}`);
      const comision = subtotalProporcional * (porcentaje / 100);

      comisionesPorVendedor[vendedorNombre].totalCobrado += subtotalProporcional;
      comisionesPorVendedor[vendedorNombre].totalComision += comision;
      comisionesPorVendedor[vendedorNombre].detalle.push({
        facturaId: factura.invoiceId,
        paymentId: factura.paymentId,
        producto: description,
        categoria,
        subtotal: subtotalProporcional,
        porcentaje,
        comision,
        clientName: factura.client?.name || 'S/D'
      });
    });
  });

  snapshotVentas.forEach((doc) => {
    const factura = doc.data();
    const esVictor =
      vendedorEfectivo(factura) === 'Victor' ||
      CLIENTES_AJUSTE_VICTOR.has(clientIdOf(factura));
    if (!esVictor) return;

    const items = factura.items || [];
    items.forEach((item) => {
      const description = item.description || item.name || '';
      const subtotal = parseFloat(item.subtotal) || 0;
      if (subtotal <= 0) return;

      const { categoria, porcentaje } = classifyVictor(`${item.category || ''} ${description}`);
      const comision = subtotal * (porcentaje / 100);

      comisionesPorVendedor.Victor.totalCobrado += subtotal;
      comisionesPorVendedor.Victor.totalComision += comision;
      comisionesPorVendedor.Victor.detalle.push({
        facturaId: factura.invoiceId,
        producto: description,
        categoria,
        subtotal,
        porcentaje,
        comision,
        clientName: factura.client?.name || 'S/D'
      });
    });
  });

  const resultados = [];

  for (const vendedorNombre of VENDEDORES_VALIDOS) {
    const resultado = comisionesPorVendedor[vendedorNombre];
    const docRef = adminDb.collection('comisiones_mensuales')
      .doc(vendedorNombre)
      .collection(periodo)
      .doc(periodo);

    const docSnapshot = await docRef.get();
    const datosExistentes = docSnapshot.exists ? docSnapshot.data() : {};

    if (datosExistentes.estado === 'cerrado' || datosExistentes.estado === 'pagado') {
      console.log(`[COMISIONES] ${vendedorNombre} - Período ${periodo} está ${datosExistentes.estado}, no se recalcula`);
      resultados.push(datosExistentes);
      continue;
    }

    const ajustes = datosExistentes.ajustes || [];
    const estado = datosExistentes.estado || 'calculado';
    const basico = basicoMensual(vendedorNombre);
    const totalFinal = totalFinalMensual(vendedorNombre, resultado.totalComision, ajustes);

    await docRef.set({
      ...resultado,
      estado,
      ajustes,
      basicoMensual: basico,
      totalFinal,
      updatedAt: Timestamp.now()
    }, { merge: true });

    resultados.push({
      ...resultado,
      estado,
      ajustes,
      basicoMensual: basico,
      totalFinal
    });

    console.log(`[COMISIONES] ${vendedorNombre} - Base: ${resultado.totalCobrado}, Comisión: ${resultado.totalComision}, Básico: ${basico}, Total final: ${totalFinal}`);
  }

  console.log(`[COMISIONES] Cálculo completado para ${resultados.length} vendedores`);
  return resultados;
}

function mapItemsComision(items) {
  return (items || []).map((item) => ({
    description: item.description || item.name || '',
    category: item.category?.name || item.category || '',
    subtotal: parseFloat(item.subtotal || item.total || (parseFloat(item.price || 0) * parseFloat(item.quantity || 0))) || 0
  }));
}

function payloadCliente(invoice) {
  const clientInfo = invoice.client || invoice.clientUser;
  if (!clientInfo) return null;
  return {
    id: (clientInfo.id ?? clientInfo.identifier)?.toString() || String(clientInfo.id || ''),
    name: clientInfo.name || clientInfo.organization || 'Sin nombre',
    sellerName: String(clientInfo.seller?.name || clientInfo.sellerName || '').trim()
  };
}

async function procesarPaginaCobros(adminDb, paymentsPage, invoiceCache, stats) {
  const movimientosDeLaPagina = [];
  const invoiceIdsDeLaPagina = new Set();

  for (const payment of paymentsPage) {
    const paymentId = payment.id.toString();
    if (!payment.invoices || !Array.isArray(payment.invoices)) continue;
    for (const invBasic of payment.invoices) {
      if (!invBasic || !invBasic.id) continue;
      const invoiceId = invBasic.id.toString();
      const amountPaid = parseFloat(invBasic.amount) || 0;
      const totalInvoice = parseFloat(invBasic.total) || 0;
      if (amountPaid === 0) continue;
      movimientosDeLaPagina.push({
        paymentId, invoiceId, amountPaid, totalInvoice, fecha: payment.date
      });
      if (!invoiceCache.has(invoiceId)) {
        invoiceIdsDeLaPagina.add(invoiceId);
      }
    }
  }

  const missingIds = Array.from(invoiceIdsDeLaPagina);
  if (missingIds.length > 0) {
    const CONCURRENCY = 3;
    for (let i = 0; i < missingIds.length; i += CONCURRENCY) {
      const batchIds = missingIds.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batchIds.map(async (id) => {
        try {
          const oldDoc = await adminDb.collection('facturas_comisiones').doc(id).get();
          if (oldDoc.exists) return { ...oldDoc.data(), _fromCache: true };
          const inv = await getAlegraInvoiceById(id);
          return inv ? { ...inv, _fromCache: false } : null;
        } catch (e) {
          console.error(`[COMISIONES SYNC] Error recuperando factura ${id}:`, e.message);
          return null;
        }
      }));

      results.forEach((inv, idx) => {
        if (inv) invoiceCache.set(batchIds[idx], inv);
      });

      if (results.some((r) => r && !r._fromCache)) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }

  if (movimientosDeLaPagina.length === 0) return;

  const dbBatch = adminDb.batch();
  let opsInBatch = 0;

  for (const mov of movimientosDeLaPagina) {
    const invoice = invoiceCache.get(mov.invoiceId);
    if (!invoice) { stats.errores++; continue; }

    const sellerName = vendedorEfectivo(invoice);
    if (!sellerName) { stats.sinSeller++; continue; }
    if (sellerName === 'Victor') continue;
    if (!VENDEDORES_VALIDOS.includes(sellerName)) { stats.vendedorInvalido++; continue; }

    const docId = `pay_${mov.paymentId}_inv_${mov.invoiceId}`;
    const docRef = adminDb.collection('movimientos_comisiones').doc(docId);
    dbBatch.set(docRef, {
      paymentId: mov.paymentId,
      invoiceId: mov.invoiceId,
      amountPaid: mov.amountPaid,
      totalInvoice: mov.totalInvoice || parseFloat(invoice.total) || 0,
      seller: { name: sellerName },
      client: payloadCliente(invoice),
      items: mapItemsComision(invoice.items),
      fecha: mov.fecha,
      fechaInvoice: invoice.date || invoice.fechaInvoice,
      fechaSync: new Date()
    }, { merge: true });

    opsInBatch++;
    stats.nuevas++;
    stats.totalMovimientosProcesados++;
  }

  if (opsInBatch > 0) {
    await dbBatch.commit();
  }

  if (invoiceCache.size > 1000) {
    invoiceCache.clear();
  }
}

async function guardarVentasVictor(adminDb, facturas) {
  const seleccionadas = [];
  for (const f of facturas) {
    const sellerName = vendedorEfectivo(f);
    const clientId = String(f.client?.id || f.client?.identifier || '');
    if (sellerName === 'Victor' || CLIENTES_AJUSTE_VICTOR.has(clientId)) {
      seleccionadas.push(f);
    }
  }

  const detalladas = [];
  for (const f of seleccionadas) {
    if (Array.isArray(f.items) && f.items.length > 0) {
      detalladas.push(f);
      continue;
    }
    const full = await getAlegraInvoiceById(f.id);
    detalladas.push(full || f);
    await new Promise((r) => setTimeout(r, 200));
  }

  for (let i = 0; i < detalladas.length; i += 400) {
    const chunk = detalladas.slice(i, i + 400);
    const batch = adminDb.batch();
    for (const f of chunk) {
      const client = payloadCliente(f) || { id: 'S/D', name: 'S/D' };
      const esAjuste = CLIENTES_AJUSTE_VICTOR.has(String(client.id));
      const docRef = adminDb.collection('movimientos_ventas').doc(f.id.toString());
      batch.set(docRef, {
        invoiceId: f.id.toString(),
        fecha: f.date,
        seller: { name: esAjuste ? 'Victor' : (vendedorEfectivo(f) || 'Victor') },
        client,
        items: mapItemsComision(f.items),
        totalInvoice: parseFloat(f.total) || 0,
        fechaSync: new Date()
      }, { merge: true });
    }
    await batch.commit();
  }

  return seleccionadas.length;
}

const TTL_SYNC_MES_ACTUAL_MS = 6 * 60 * 60 * 1000;

function periodoEsActual(periodo) {
  const now = new Date();
  const actual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return periodo === actual;
}

function fechaDeSync(data) {
  if (!data) return null;
  if (data.fechaSync?.toDate) return data.fechaSync.toDate();
  if (data.fechaSync) {
    const parsed = new Date(data.fechaSync);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

async function periodoRecienSincronizado(adminDb, periodo) {
  const snap = await adminDb.collection('comisiones_sync_metadata').doc(periodo).get();
  if (!snap.exists) {
    return false;
  }
  const data = snap.data() || {};
  if (!data.completa) {
    return false;
  }
  if (!periodoEsActual(periodo)) {
    return true;
  }
  const fecha = fechaDeSync(data);
  if (!fecha) {
    return false;
  }
  return (Date.now() - fecha.getTime()) < TTL_SYNC_MES_ACTUAL_MS;
}

async function marcarPeriodoSincronizado(adminDb, periodo) {
  await adminDb.collection('comisiones_sync_metadata').doc(periodo).set({
    completa: true,
    fechaSync: Timestamp.now()
  }, { merge: true });
}

/**
 * Trae cobros y ventas de un mes desde Alegra en tandas.
 */
export async function sincronizarPeriodoComisiones(adminDb, periodo, opciones = {}) {
  const forzar = Boolean(opciones.forzar);
  const fase = opciones.fase === 'ventas' ? 'ventas' : 'cobros';
  const start = Math.max(0, parseInt(opciones.offset, 10) || 0);
  const maxPages = Math.min(10, Math.max(1, parseInt(opciones.maxPages, 10) || 6));

  if (!forzar && fase === 'cobros' && start === 0 && await periodoRecienSincronizado(adminDb, periodo)) {
    console.log(`[COMISIONES SYNC] ${periodo} omitido: sync reciente`);
    return {
      periodo,
      fase: 'cobros',
      skipped: true,
      cobros: 0,
      errores: 0,
      hasMore: false,
      nextOffset: 0,
      nextFase: 'done'
    };
  }

  const { desde, hasta } = periodoARango(periodo);
  console.log(`[COMISIONES SYNC] ${periodo} fase=${fase} offset=${start} maxPages=${maxPages}`);

  if (fase === 'cobros') {
    const invoiceCache = new Map();
    const stats = { nuevas: 0, errores: 0, sinSeller: 0, vendedorInvalido: 0, totalMovimientosProcesados: 0 };
    const paymentsResult = await getAlegraPaymentsRango(
      desde,
      hasta,
      async (page) => {
        await procesarPaginaCobros(adminDb, page, invoiceCache, stats);
      },
      { start, maxPages }
    );

    return {
      periodo,
      fase: 'cobros',
      cobros: stats.totalMovimientosProcesados,
      errores: stats.errores,
      hasMore: Boolean(paymentsResult.hasMore),
      nextOffset: paymentsResult.nextOffset || 0,
      nextFase: paymentsResult.hasMore ? 'cobros' : 'ventas'
    };
  }

  const invoicesResult = await getAlegraInvoicesRango(desde, hasta, { start, maxPages });
  const ventas = await guardarVentasVictor(adminDb, invoicesResult.items || []);
  const hasMore = Boolean(invoicesResult.hasMore);
  if (!hasMore) {
    await marcarPeriodoSincronizado(adminDb, periodo);
  }

  return {
    periodo,
    fase: 'ventas',
    ventasVictor: ventas,
    errores: 0,
    hasMore,
    nextOffset: invoicesResult.nextOffset || 0,
    nextFase: hasMore ? 'ventas' : 'done'
  };
}

/**
 * Sincronizar facturas de Victor (basado en venta/emisión).
 * Incluye clientes de ajuste (Videla, Monllor, Vet365) aunque la FC tenga otro vendedor.
 */
export async function sincronizarFacturasVictor(adminDb, dias = 30) {
  const hasta = new Date();
  const desdeDate = new Date();
  desdeDate.setDate(desdeDate.getDate() - Math.max(Number(dias) || 30, 1));
  const desde = desdeDate.toISOString().split('T')[0];
  const hastaStr = hasta.toISOString().split('T')[0];
  console.log(`[VICTOR SYNC] Rango ${desde} a ${hastaStr}`);
  try {
    const { items: facturas } = await getAlegraInvoicesRango(desde, hastaStr);
    return await guardarVentasVictor(adminDb, facturas);
  } catch (error) {
    console.error('[VICTOR SYNC] Error:', error);
    return 0;
  }
}

/**
 * Sincronizar facturas desde payments de Alegra
 * Obtiene payments, extrae invoice.id, obtiene invoices y guarda en Firestore
 * @param {Object} adminDb - Instancia de Firestore Admin
 * @param {boolean} forzarCompleta - Si es true, sincroniza todos los payments históricos. Si es false, solo los nuevos desde la última sync
 */
export async function sincronizarFacturasDesdePayments(adminDb, forzarCompleta = false, startOffset = 0, maxPages = 20) {
  if (!adminDb) {
    throw new Error('Firebase no inicializado');
  }
  
  console.log(`[COMISIONES SYNC] Iniciando sincronización de facturas desde ${startOffset} (máximo ${maxPages} páginas)... (${forzarCompleta ? 'COMPLETA' : 'INCREMENTAL'})`);
  
  try {
    // 🆕 Sincronizar también facturas de Victor (por venta)
    // Solo lo hacemos en la primera página para no repetir N veces en procesos chunked
    if (startOffset === 0) {
      await sincronizarFacturasVictor(adminDb, forzarCompleta ? 90 : 30);
    }

    let dias = 30; // Por defecto últimos 30 días
    
    if (!forzarCompleta) {
      const syncDocRef = adminDb.collection('comisiones_sync_metadata').doc('last_sync');
      const syncDoc = await syncDocRef.get();
      if (syncDoc.exists) {
        const lastSyncDate = syncDoc.data().fechaSync?.toDate?.() || (syncDoc.data().fechaSync ? new Date(syncDoc.data().fechaSync) : null);
        if (lastSyncDate) {
          const diffMs = Date.now() - lastSyncDate;
          const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          dias = Math.max(1, Math.min(diffDias, 30));
          console.log(`[COMISIONES SYNC] Sincronización incremental: últimos ${dias} días`);
        }
      }
    } else {
      dias = null; // Todos los pagos
      console.log(`[COMISIONES SYNC] Sincronización histórica Completa: offset ${startOffset}, max ${maxPages} páginas`);
    }
    
    const stats = {
      nuevas: 0,
      errores: 0,
      sinSeller: 0,
      vendedorInvalido: 0,
      totalMovimientosProcesados: 0
    };
    const invoiceCache = new Map();
    const procesarPaginaDePayments = async (paymentsPage) => {
      console.log(`[COMISIONES SYNC] Procesando página de ${paymentsPage.length} payments...`);
      await procesarPaginaCobros(adminDb, paymentsPage, invoiceCache, stats);
    };
    
    // EJECUTAR SINCRONIZACIÓN POR PÁGINAS (llamada chunked)
    const syncResult = await getAlegraPayments(dias, procesarPaginaDePayments, startOffset, maxPages);
    
    console.log(`[COMISIONES SYNC] Completado: ${stats.totalMovimientosProcesados} movimientos procesados`);
    console.log(`[COMISIONES SYNC] Estadísticas: ${stats.nuevas} guardados, ${stats.errores} errores, ${stats.sinSeller} sin seller`);
    
    // Solo actualizar fecha de última sincronización si fue incremental o terminó la completa
    if (!forzarCompleta || (syncResult && !syncResult.hasMore)) {
      await adminDb.collection('comisiones_sync_metadata').doc('last_sync').set({
        fechaSync: Timestamp.now()
      });
    }
    
    return {
      success: true,
      total: stats.totalMovimientosProcesados,
      nuevas: stats.nuevas,
      errores: stats.errores,
      hasMore: syncResult?.hasMore || false,
      nextOffset: syncResult?.nextOffset || 0,
      vendedoresProcesados: VENDEDORES_VALIDOS.length
    };
  } catch (error) {
    console.error('[COMISIONES SYNC] Error en sincronización:', error);
    throw error;
  }
}

/**
 * Cerrar período de comisiones (bloquear recálculo)
 */
export async function cerrarPeriodoComisiones(adminDb, periodo) {
  if (!adminDb) {
    throw new Error('Firebase no inicializado');
  }
  
  console.log(`[COMISIONES CIERRE] Cerrando período: ${periodo}`);
  
  // Validar formato de período
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    throw new Error('Formato de período inválido. Debe ser YYYY-MM');
  }
  
  const resultados = [];
  
  // Cerrar comisiones de todos los vendedores válidos
  for (const vendedor of VENDEDORES_VALIDOS) {
    const docRef = adminDb.collection('comisiones_mensuales')
      .doc(vendedor)
      .collection(periodo)
      .doc(periodo);
    
    const docSnapshot = await docRef.get();
    
    if (docSnapshot.exists) {
      const datos = docSnapshot.data();
      
      // Solo cerrar si está en estado "calculado"
      if (datos.estado === 'calculado') {
        await docRef.update({
          estado: 'cerrado',
          cerradoAt: Timestamp.now()
        });
        
        console.log(`[COMISIONES CIERRE] ${vendedor} - Período ${periodo} cerrado`);
        resultados.push({ vendedor, periodo, estado: 'cerrado' });
      } else {
        console.log(`[COMISIONES CIERRE] ${vendedor} - Período ${periodo} ya está ${datos.estado}, no se puede cerrar`);
        resultados.push({ vendedor, periodo, estado: datos.estado, mensaje: 'Ya estaba cerrado o pagado' });
      }
    } else {
      console.log(`[COMISIONES CIERRE] ${vendedor} - No hay comisiones calculadas para ${periodo}`);
      resultados.push({ vendedor, periodo, estado: 'no_existe', mensaje: 'No hay comisiones calculadas' });
    }
  }
  
  return resultados;
}

/**
 * Agregar ajuste manual a comisión
 */
export async function agregarAjusteComision(adminDb, vendedor, periodo, ajuste) {
  if (!adminDb) {
    throw new Error('Firebase no inicializado');
  }
  
  if (!VENDEDORES_VALIDOS.includes(vendedor)) {
    throw new Error(`Vendedor inválido: ${vendedor}`);
  }
  
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    throw new Error('Formato de período inválido. Debe ser YYYY-MM');
  }
  
  if (!ajuste.tipo || !['positivo', 'negativo'].includes(ajuste.tipo)) {
    throw new Error('Tipo de ajuste inválido. Debe ser "positivo" o "negativo"');
  }
  
  if (!ajuste.monto || ajuste.monto <= 0) {
    throw new Error('Monto de ajuste inválido. Debe ser mayor a 0');
  }
  
  if (!ajuste.motivo || ajuste.motivo.trim() === '') {
    throw new Error('Motivo del ajuste es obligatorio');
  }
  
  const docRef = adminDb.collection('comisiones_mensuales')
    .doc(vendedor)
    .collection(periodo)
    .doc(periodo);
  
  const docSnapshot = await docRef.get();
  
  if (!docSnapshot.exists) {
    throw new Error(`No hay comisiones calculadas para ${vendedor} en ${periodo}`);
  }
  
  const datos = docSnapshot.data();
  
  // No permitir ajustes si está pagado
  if (datos.estado === 'pagado') {
    throw new Error('No se pueden agregar ajustes a comisiones ya pagadas');
  }
  
  // Agregar ajuste
  const ajustes = datos.ajustes || [];
  const nuevoAjuste = {
    tipo: ajuste.tipo,
    monto: parseFloat(ajuste.monto),
    motivo: ajuste.motivo.trim(),
    createdAt: Timestamp.now()
  };
  
  ajustes.push(nuevoAjuste);

  const totalFinal = totalFinalMensual(vendedor, datos.totalComision, ajustes);

  await docRef.update({
    ajustes: ajustes,
    totalFinal: totalFinal,
    basicoMensual: basicoMensual(vendedor),
    updatedAt: Timestamp.now()
  });
  
  console.log(`[COMISIONES AJUSTE] ${vendedor} - Ajuste agregado: ${ajuste.tipo} $${ajuste.monto}, Total final: $${totalFinal}`);
  
  return {
    vendedor,
    periodo,
    ajuste: nuevoAjuste,
    totalFinal
  };
}

/**
 * Marcar comisión como pagada
 */
export async function pagarComision(adminDb, vendedor, periodo, notaPago = '') {
  if (!adminDb) {
    throw new Error('Firebase no inicializado');
  }
  
  if (!VENDEDORES_VALIDOS.includes(vendedor)) {
    throw new Error(`Vendedor inválido: ${vendedor}`);
  }
  
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    throw new Error('Formato de período inválido. Debe ser YYYY-MM');
  }
  
  const docRef = adminDb.collection('comisiones_mensuales')
    .doc(vendedor)
    .collection(periodo)
    .doc(periodo);
  
  const docSnapshot = await docRef.get();
  
  if (!docSnapshot.exists) {
    throw new Error(`No hay comisiones calculadas para ${vendedor} en ${periodo}`);
  }
  
  const datos = docSnapshot.data();
  
  // Solo pagar si está cerrado
  if (datos.estado !== 'cerrado') {
    throw new Error(`No se puede pagar un período que no está cerrado. Estado actual: ${datos.estado}`);
  }
  
  await docRef.update({
    estado: 'pagado',
    pagadoAt: Timestamp.now(),
    notaPago: notaPago.trim() || '',
    updatedAt: Timestamp.now()
  });
  
  console.log(`[COMISIONES PAGO] ${vendedor} - Período ${periodo} marcado como pagado`);
  
  return {
    vendedor,
    periodo,
    estado: 'pagado',
    totalFinal: datos.totalFinal || datos.totalComision || 0
  };
}

