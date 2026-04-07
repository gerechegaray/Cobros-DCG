// Servicio para cálculo de comisiones de vendedores
// FASE 1: Cálculo simple basado en reglas de categoría

import { getAlegraPayments, getAlegraInvoiceById } from './alegraService.js';
import { Timestamp } from 'firebase-admin/firestore';

// Vendedores válidos
const VENDEDORES_VALIDOS = ['Guille', 'Santi', 'Victor'];

/**
 * Obtener reglas de comisión desde Firestore
 */
export async function getReglasComisiones(adminDb) {
  if (!adminDb) {
    throw new Error('Firebase no inicializado');
  }
  
  const snapshot = await adminDb.collection('comisiones_reglas')
    .where('activa', '==', true)
    .get();
  
  const reglas = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    reglas[data.categoria] = data.porcentaje;
  });
  
  console.log(`[COMISIONES] Reglas cargadas: ${Object.keys(reglas).length}`);
  return reglas;
}

/**
 * Detectar categoría de un producto desde su description
 * FASE 1: Matching simple (case insensitive, contains)
 */
function detectarCategoria(description, reglas) {
  if (!description || typeof description !== 'string') {
    return null;
  }
  
  const descLower = description.toLowerCase().trim();
  
  // Buscar regla que coincida (contains, case insensitive)
  for (const categoria in reglas) {
    if (descLower.includes(categoria.toLowerCase())) {
      return categoria;
    }
  }
  
  return null;
}

/**
 * Calcular comisiones mensuales para un período
 */
export async function calcularComisionesMensuales(adminDb, periodo) {
  if (!adminDb) {
    throw new Error('Firebase no inicializado');
  }
  
  console.log(`[COMISIONES] Iniciando cálculo para período: ${periodo}`);
  
  // Validar formato de período (YYYY-MM)
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    throw new Error('Formato de período inválido. Debe ser YYYY-MM');
  }
  
  // Obtener reglas de comisión
  const reglas = await getReglasComisiones(adminDb);
  
  if (Object.keys(reglas).length === 0) {
    throw new Error('No hay reglas de comisión activas. Ejecuta el seed de reglas primero.');
  }
  
  const [anio, mes] = periodo.split('-');
  const fechaInicio = new Date(parseInt(anio), parseInt(mes) - 1, 1);
  const fechaFin = new Date(parseInt(anio), parseInt(mes), 0, 23, 59, 59);
  
  const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
  const fechaFinStr = fechaFin.toISOString().split('T')[0];
  
  // 1. Obtener Cobros (para Guille y Santi)
  console.log(`[COMISIONES] Buscando COBROS entre ${fechaInicioStr} y ${fechaFinStr}`);
  const snapshotCobros = await adminDb.collection('movimientos_comisiones')
    .where('fecha', '>=', fechaInicioStr)
    .where('fecha', '<=', fechaFinStr)
    .get();

  // 2. Obtener Ventas (para Victor)
  console.log(`[COMISIONES] Buscando VENTAS (Victor) entre ${fechaInicioStr} y ${fechaFinStr}`);
  const snapshotVentas = await adminDb.collection('movimientos_ventas')
    .where('fecha', '>=', fechaInicioStr)
    .where('fecha', '<=', fechaFinStr)
    .get();
  
  console.log(`[COMISIONES] Encontrados: ${snapshotCobros.size} cobros, ${snapshotVentas.size} ventas`);
  
  const comisionesPorVendedor = {};

  // PROCESAR COBROS (Guille, Santi)
  snapshotCobros.forEach(doc => {
    const factura = doc.data();
    const vendedorNombre = factura.seller?.name;
    
    if (!vendedorNombre || (vendedorNombre !== 'Guille' && vendedorNombre !== 'Santi')) {
      return;
    }
    
    if (!comisionesPorVendedor[vendedorNombre]) {
      comisionesPorVendedor[vendedorNombre] = {
        vendedor: vendedorNombre,
        periodo: periodo,
        totalCobrado: 0,
        totalComision: 0,
        detalle: []
      };
    }
    
    const items = factura.items || [];
    const amountPaid = parseFloat(factura.amountPaid) || 0;
    const totalInvoice = parseFloat(factura.totalInvoice) || 0;
    const proporcionCobro = totalInvoice > 0 ? (amountPaid / totalInvoice) : 1;
    
    items.forEach(item => {
      const description = item.description || '';
      const subtotalOriginal = parseFloat(item.subtotal) || 0;
      if (subtotalOriginal <= 0) return;
      
      const subtotalProporcional = subtotalOriginal * proporcionCobro;
      const categoria = detectarCategoria(description, reglas);
      if (!categoria) return;
      
      const porcentaje = reglas[categoria];
      const comision = subtotalProporcional * (porcentaje / 100);
      
      comisionesPorVendedor[vendedorNombre].totalCobrado += subtotalProporcional;
      comisionesPorVendedor[vendedorNombre].totalComision += comision;
      
      comisionesPorVendedor[vendedorNombre].detalle.push({
        facturaId: factura.invoiceId,
        paymentId: factura.paymentId,
        producto: description,
        categoria: categoria,
        subtotal: subtotalProporcional,
        porcentaje: porcentaje,
        comision: comision,
        clientName: factura.client?.name || 'S/D'
      });
    });
  });

  // PROCESAR VENTAS (Victor)
  snapshotVentas.forEach(doc => {
    const factura = doc.data();
    const vendedorNombre = factura.seller?.name;
    
    if (vendedorNombre !== 'Victor') return;

    if (!comisionesPorVendedor[vendedorNombre]) {
      comisionesPorVendedor[vendedorNombre] = {
        vendedor: vendedorNombre,
        periodo: periodo,
        totalCobrado: 0, // En Victor es Total Vendido
        totalComision: 0,
        detalle: []
      };
    }

    const items = factura.items || [];
    items.forEach(item => {
      const description = item.description || '';
      const lowerDesc = description.toLowerCase();
      const subtotal = parseFloat(item.subtotal) || 0;
      if (subtotal <= 0) return;

      // Lógica específica para Victor: 6% para Baires, 8% para el resto
      const categorias6 = [
        'fawna', 'equilibrium', 'noveles', 'premium', 
        'company', 'origen perro', 'origen gato', 'manada', 'seguidor'
      ];
      
      let porcentaje = 8; // Por defecto 8%
      let categoria = 'RESTO (8%)';

      if (categorias6.some(c => lowerDesc.includes(c))) {
        porcentaje = 6;
        categoria = 'BAIRES (6%)';
      }

      const comision = subtotal * (porcentaje / 100);

      comisionesPorVendedor[vendedorNombre].totalCobrado += subtotal;
      comisionesPorVendedor[vendedorNombre].totalComision += comision;
      comisionesPorVendedor[vendedorNombre].detalle.push({
        facturaId: factura.invoiceId,
        producto: description,
        categoria: categoria,
        subtotal: subtotal,
        porcentaje: porcentaje,
        comision: comision,
        clientName: factura.client?.name || 'S/D'
      });
    });
  });
  
  // Guardar resultados en Firestore
  const resultados = [];
  
  for (const vendedorNombre in comisionesPorVendedor) {
    const resultado = comisionesPorVendedor[vendedorNombre];
    
    // Guardar en comisiones_mensuales/{vendedor}/{periodo}
    const docRef = adminDb.collection('comisiones_mensuales')
      .doc(vendedorNombre)
      .collection(periodo)
      .doc(periodo);
    
    // Verificar si el período ya está cerrado
    const docSnapshot = await docRef.get();
    const datosExistentes = docSnapshot.exists ? docSnapshot.data() : {};
    
    // Si está cerrado o pagado, no recalcular
    if (datosExistentes.estado === 'cerrado' || datosExistentes.estado === 'pagado') {
      console.log(`[COMISIONES] ${vendedorNombre} - Período ${periodo} está ${datosExistentes.estado}, no se recalcula`);
      resultados.push(datosExistentes);
      continue;
    }
    
    // Preservar ajustes y estado existentes
    const ajustes = datosExistentes.ajustes || [];
    const estado = datosExistentes.estado || 'calculado';
    
    // Calcular total final (comisión + ajustes)
    const totalAjustes = ajustes.reduce((sum, ajuste) => {
      return sum + (ajuste.tipo === 'positivo' ? ajuste.monto : -ajuste.monto);
    }, 0);
    const totalFinal = resultado.totalComision + totalAjustes;
    
    await docRef.set({
      ...resultado,
      estado: estado,
      ajustes: ajustes,
      totalFinal: totalFinal,
      updatedAt: Timestamp.now()
    }, { merge: true });
    
    resultados.push({
      ...resultado,
      estado: estado,
      ajustes: ajustes,
      totalFinal: totalFinal
    });
    
    console.log(`[COMISIONES] ${vendedorNombre} - Total cobrado: ${resultado.totalCobrado}, Comisión: ${resultado.totalComision}, Total final: ${totalFinal}`);
  }
  
  console.log(`[COMISIONES] Cálculo completado para ${resultados.length} vendedores`);
  
  return resultados;
}

/**
 * Sincronizar facturas desde payments de Alegra
 * Obtiene payments, extrae invoice.id, obtiene invoices y guarda en Firestore
 * @param {Object} adminDb - Instancia de Firestore Admin
 * @param {boolean} forzarCompleta - Si es true, sincroniza todos los payments históricos. Si es false, solo los nuevos desd/**
 * Sincronizar facturas de Victor (basado en venta/emisión)
 * @param {Object} adminDb 
 * @param {number} dias 
 */
export async function sincronizarFacturasVictor(adminDb, dias = 30) {
  console.log(`[VICTOR SYNC] Iniciando sincronización por venta (últimos ${dias} días)...`);
  
  try {
    const { getAlegraInvoices } = await import('./alegraService.js');
    
    // Traer facturas de los últimos días (usamos 5 como bloque, o adaptamos según necesitemos)
    // Para Victor, pediremos un rango mayor si es forzada, pero por defecto los últimos N días
    const facturas = await getAlegraInvoices(5, 30, 30); // Usamos el helper existente
    
    const facturasVictor = facturas.filter(f => f.seller?.name === 'Victor');
    console.log(`[VICTOR SYNC] Encontradas ${facturasVictor.length} facturas emitidas por Victor`);
    
    if (facturasVictor.length === 0) return 0;

    const batch = adminDb.batch();
    for (const f of facturasVictor) {
      const docRef = adminDb.collection('movimientos_ventas').doc(f.id.toString());
      batch.set(docRef, {
        invoiceId: f.id.toString(),
        fecha: f.date, // Fecha de emisión
        seller: { name: 'Victor' },
        client: { 
          id: (f.client?.id || f.client?.identifier)?.toString() || 'S/D',
          name: f.client?.name || 'S/D' 
        },
        items: (f.items || []).map(item => ({
          description: item.description || '',
          subtotal: parseFloat(item.subtotal || item.total) || 0
        })),
        totalInvoice: parseFloat(f.total) || 0,
        fechaSync: new Date()
      }, { merge: true });
    }
    
    await batch.commit();
    return facturasVictor.length;
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
    
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;
    let sinSeller = 0;
    let vendedorInvalido = 0;
    let totalMovimientosProcesados = 0;
    
    // Caché de facturas para REUTILIZAR entre páginas (Map es eficiente en memoria)
    const invoiceCache = new Map();
    
    // Función para procesar una página de payments
    const procesarPaginaDePayments = async (paymentsPage) => {
      console.log(`[COMISIONES SYNC] Procesando página de ${paymentsPage.length} payments...`);
      
      const movimientosDeLaPagina = [];
      const invoiceIdsDeLaPagina = new Set();
      
      // 1. Extraer movimientos y IDs de factura de ESTA PÁGINA
      for (const payment of paymentsPage) {
        const paymentId = payment.id.toString();
        if (payment.invoices && Array.isArray(payment.invoices)) {
          for (const invBasic of payment.invoices) {
            if (!invBasic || !invBasic.id) continue;
            const invoiceId = invBasic.id.toString();
            const amountPaid = parseFloat(invBasic.amount) || 0;
            const totalInvoice = parseFloat(invBasic.total) || 0;
            
            if (amountPaid !== 0) {
              movimientosDeLaPagina.push({
                paymentId, invoiceId, amountPaid, totalInvoice, fecha: payment.date
              });
              if (!invoiceCache.has(invoiceId)) {
                invoiceIdsDeLaPagina.add(invoiceId);
              }
            }
          }
        }
      }
      
      // 2. Recuperar detalles de facturas FALTANTES para esta página
      const missingIds = Array.from(invoiceIdsDeLaPagina);
      if (missingIds.length > 0) {
        const CONCURRENCY = 3;
        for (let i = 0; i < missingIds.length; i += CONCURRENCY) {
          const batchIds = missingIds.slice(i, i + CONCURRENCY);
          const results = await Promise.all(batchIds.map(async (id) => {
            try {
              // Buscar en vieja
              const oldDoc = await adminDb.collection('facturas_comisiones').doc(id).get();
              if (oldDoc.exists) return { ...oldDoc.data(), _fromCache: true };
              // Pedir a Alegra
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
          
          // Espera si hubo pedidos a Alegra
          if (results.some(r => r && !r._fromCache)) {
            await new Promise(r => setTimeout(r, 400));
          }
        }
      }
      
      // 3. Guardar movimientos de esta página en Firestore
      if (movimientosDeLaPagina.length > 0) {
        const dbBatch = adminDb.batch();
        let opsInBatch = 0;
        
        for (const mov of movimientosDeLaPagina) {
          const invoice = invoiceCache.get(mov.invoiceId);
          if (!invoice) { errores++; continue; }
          
          if (!invoice.seller || !invoice.seller.name) { sinSeller++; continue; }
          // Omitir Victor aquí, ya que se procesa arriba por venta
          if (invoice.seller.name === 'Victor') continue;
          if (!VENDEDORES_VALIDOS.includes(invoice.seller.name)) { vendedorInvalido++; continue; }
          
          const docId = `pay_${mov.paymentId}_inv_${mov.invoiceId}`;
          const docRef = adminDb.collection('movimientos_comisiones').doc(docId);
          
          const clientInfo = invoice.client || invoice.clientUser;
          dbBatch.set(docRef, {
            paymentId: mov.paymentId,
            invoiceId: mov.invoiceId,
            amountPaid: mov.amountPaid,
            totalInvoice: mov.totalInvoice || parseFloat(invoice.total) || 0,
            seller: { name: invoice.seller.name },
            client: clientInfo ? {
              id: (clientInfo.id ?? clientInfo.identifier)?.toString() || String(clientInfo.id || ''),
              name: clientInfo.name || clientInfo.organization || 'Sin nombre'
            } : null,
            items: (invoice.items || []).map(item => ({
              description: item.description || '',
              subtotal: parseFloat(item.subtotal || item.total || (parseFloat(item.price || 0) * parseFloat(item.quantity || 0))) || 0
            })),
            fecha: mov.fecha,
            fechaInvoice: invoice.date || invoice.fechaInvoice,
            fechaSync: new Date()
          }, { merge: true });
          
          opsInBatch++;
          nuevas++;
          totalMovimientosProcesados++;
        }
        
        if (opsInBatch > 0) {
          await dbBatch.commit();
        }
      }
      
      // Limpiar caché de memoria periódicamente si crece demasiado (ej. > 1000 items)
      // para evitar OOM, pero mantener una buena tasa de aciertos
      if (invoiceCache.size > 1000) {
        console.log(`[COMISIONES SYNC] Limpiando caché de facturas para liberar memoria...`);
        invoiceCache.clear();
      }
    };
    
    // EJECUTAR SINCRONIZACIÓN POR PÁGINAS (llamada chunked)
    const syncResult = await getAlegraPayments(dias, procesarPaginaDePayments, startOffset, maxPages);
    
    console.log(`[COMISIONES SYNC] Completado: ${totalMovimientosProcesados} movimientos procesados`);
    console.log(`[COMISIONES SYNC] Estadísticas: ${nuevas} guardados, ${errores} errores, ${sinSeller} sin seller`);
    
    // Solo actualizar fecha de última sincronización si fue incremental o terminó la completa
    if (!forzarCompleta || (syncResult && !syncResult.hasMore)) {
      await adminDb.collection('comisiones_sync_metadata').doc('last_sync').set({
        fechaSync: Timestamp.now()
      });
    }
    
    return {
      success: true,
      total: totalMovimientosProcesados,
      nuevas,
      errores,
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
  
  // Recalcular total final
  const totalAjustes = ajustes.reduce((sum, a) => {
    return sum + (a.tipo === 'positivo' ? a.monto : -a.monto);
  }, 0);
  const totalFinal = (datos.totalComision || 0) + totalAjustes;
  
  await docRef.update({
    ajustes: ajustes,
    totalFinal: totalFinal,
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

