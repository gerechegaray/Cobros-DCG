// Servicio para cálculo de comisiones de vendedores
// FASE 1: Cálculo simple basado en reglas de categoría

import { getAlegraPayments, getAlegraInvoiceById } from './alegraService.js';
import { Timestamp } from 'firebase-admin/firestore';

// Vendedores válidos
const VENDEDORES_VALIDOS = ['Guille', 'Santi'];

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
  
  // Obtener facturas del período desde facturas_comisiones
  // IMPORTANTE: Filtramos por fecha de PAYMENT (cobro), no por fecha de invoice
  const [anio, mes] = periodo.split('-');
  const fechaInicio = new Date(parseInt(anio), parseInt(mes) - 1, 1);
  const fechaFin = new Date(parseInt(anio), parseInt(mes), 0, 23, 59, 59);
  
  const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
  const fechaFinStr = fechaFin.toISOString().split('T')[0];
  
  console.log(`[COMISIONES] Buscando MOVIMIENTOS de cobro entre ${fechaInicioStr} y ${fechaFinStr}`);
  
  const snapshot = await adminDb.collection('movimientos_comisiones')
    .where('fecha', '>=', fechaInicioStr)
    .where('fecha', '<=', fechaFinStr)
    .get();
  
  console.log(`[COMISIONES] Movimientos encontrados en período: ${snapshot.size}`);
  
  // Agrupar por vendedor
  const comisionesPorVendedor = {};
  
  snapshot.forEach(doc => {
    const factura = doc.data();
    
    // Validar vendedor
    const vendedorNombre = factura.seller?.name;
    if (!vendedorNombre || !VENDEDORES_VALIDOS.includes(vendedorNombre)) {
      console.log(`[COMISIONES] Factura ${factura.invoiceId} ignorada - vendedor inválido: ${vendedorNombre}`);
      return;
    }
    
    // Inicializar acumulador del vendedor
    if (!comisionesPorVendedor[vendedorNombre]) {
      comisionesPorVendedor[vendedorNombre] = {
        vendedor: vendedorNombre,
        periodo: periodo,
        totalCobrado: 0,
        totalComision: 0,
        detalle: []
      };
    }
    
    // Procesar items de la factura
    const items = factura.items || [];
    const amountPaid = parseFloat(factura.amountPaid) || 0;
    const totalInvoice = parseFloat(factura.totalInvoice) || 0;
    
    // Calcular proporción del cobro (si totalInvoice es 0, asumimos 1 para evitar error)
    const proporcionCobro = totalInvoice > 0 ? (amountPaid / totalInvoice) : 1;
    
    items.forEach(item => {
      const description = item.description || '';
      const subtotalOriginal = parseFloat(item.subtotal) || 0;
      
      if (subtotalOriginal <= 0) {
        return; // Ignorar items sin subtotal
      }
      
      // Calcular subtotal proporcional al cobro recibido
      const subtotalProporcional = subtotalOriginal * proporcionCobro;
      
      // Detectar categoría
      const categoria = detectarCategoria(description, reglas);
      
      if (!categoria) {
        console.log(`[COMISIONES] Item sin categoría: "${description}" - comisión = 0`);
        return; // Sin categoría = comisión 0
      }
      
      // Obtener porcentaje de la regla
      const porcentaje = reglas[categoria];
      
      // Calcular comisión sobre el subtotal proporcional
      const comision = subtotalProporcional * (porcentaje / 100);
      
      // Acumular
      comisionesPorVendedor[vendedorNombre].totalCobrado += subtotalProporcional;
      comisionesPorVendedor[vendedorNombre].totalComision += comision;
      
      // Agregar al detalle (incluir cliente para reportes de top clientes)
      const clientId = factura.client?.id || null;
      const clientName = factura.client?.name || null;
      comisionesPorVendedor[vendedorNombre].detalle.push({
        facturaId: factura.invoiceId,
        paymentId: factura.paymentId,
        producto: description,
        categoria: categoria,
        subtotal: subtotalProporcional,
        subtotalOriginal: subtotalOriginal, // Para referencia
        porcentaje: porcentaje,
        comision: comision,
        clientId,
        clientName
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
 * @param {boolean} forzarCompleta - Si es true, sincroniza todos los payments históricos. Si es false, solo los nuevos desde la última sync
 */
export async function sincronizarFacturasDesdePayments(adminDb, forzarCompleta = false) {
  if (!adminDb) {
    throw new Error('Firebase no inicializado');
  }
  
  console.log(`[COMISIONES SYNC] Iniciando sincronización de facturas desde payments... (${forzarCompleta ? 'COMPLETA' : 'INCREMENTAL'})`);
  
  try {
    let payments;
    let dias = null; // Por defecto, todos los payments
    
    if (!forzarCompleta) {
      // Sincronización incremental: obtener fecha de última sincronización
      const syncDocRef = adminDb.collection('comisiones_sync_metadata').doc('last_sync');
      const syncDoc = await syncDocRef.get();
      
      if (syncDoc.exists) {
        const lastSyncDate = syncDoc.data().fechaSync?.toDate?.() || 
                            (syncDoc.data().fechaSync ? new Date(syncDoc.data().fechaSync) : null);
        
        if (lastSyncDate) {
          // Calcular días desde última sincronización (mínimo 1 día, máximo 30 para seguridad)
          const ahora = new Date();
          const diffMs = ahora - lastSyncDate;
          const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          dias = Math.max(1, Math.min(diffDias, 30)); // Entre 1 y 30 días
          
          console.log(`[COMISIONES SYNC] Última sincronización: ${lastSyncDate.toISOString()}`);
          console.log(`[COMISIONES SYNC] Sincronizando payments de los últimos ${dias} días (incremental)`);
        } else {
          console.log('[COMISIONES SYNC] No hay fecha de última sincronización, sincronizando últimos 30 días');
          dias = 30;
        }
      } else {
        // Primera vez: sincronizar últimos 30 días
        console.log('[COMISIONES SYNC] Primera sincronización, obteniendo últimos 30 días');
        dias = 30;
      }
    } else {
      console.log('[COMISIONES SYNC] Sincronización completa forzada, obteniendo todos los payments históricos');
    }
    
    // Obtener payments (todos si forzarCompleta, o solo los últimos N días si incremental)
    payments = await getAlegraPayments(dias);
    
    if (!payments || payments.length === 0) {
      console.log('[COMISIONES SYNC] No hay payments para procesar');
      return { success: true, total: 0, nuevas: 0, actualizadas: 0 };
    }
    
    console.log(`[COMISIONES SYNC] Payments encontrados: ${payments.length}`);
    
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;
    let sinSeller = 0;
    let vendedorInvalido = 0;
    let totalMovimientos = 0;
    
    // Caché de facturas para evitar múltiples llamadas a la misma factura en el mismo proceso
    const invoiceCache = new Map();
    
    console.log(`[COMISIONES SYNC] Procesando payments para extraer movimientos...`);
    
    // Procesar cada payment
    for (const payment of payments) {
      const paymentDate = payment.date;
      const paymentId = payment.id.toString();
      
      // Los payments tienen "invoices" como array
      if (!payment.invoices || !Array.isArray(payment.invoices) || payment.invoices.length === 0) {
        continue;
      }
      
      for (const invBasic of payment.invoices) {
        if (!invBasic || !invBasic.id) continue;
        
        const invoiceId = invBasic.id.toString();
        const amountPaidToInvoice = parseFloat(invBasic.amount) || 0;
        
        if (amountPaidToInvoice === 0) continue;
        
        totalMovimientos++;
        
        try {
          // Identificador único para el movimiento: pago_factura
          const docId = `pay_${paymentId}_inv_${invoiceId}`;
          const docRef = adminDb.collection('movimientos_comisiones').doc(docId);
          const docSnapshot = await docRef.get();
          
          // Obtener invoice desde caché o Alegra
          let invoice = invoiceCache.get(invoiceId);
          if (!invoice) {
            invoice = await getAlegraInvoiceById(invoiceId);
            if (invoice) {
              invoiceCache.set(invoiceId, invoice);
              // Pequeña pausa para no saturar Alegra
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
          
          if (!invoice) {
            console.warn(`[COMISIONES SYNC] Invoice ${invoiceId} no encontrada en Alegra`);
            errores++;
            continue;
          }
          
          // Validar que tenga seller
          if (!invoice.seller || !invoice.seller.name) {
            sinSeller++;
            continue;
          }
          
          // Validar vendedor
          if (!VENDEDORES_VALIDOS.includes(invoice.seller.name)) {
            vendedorInvalido++;
            continue;
          }
          
          // Construir datos del movimiento
          const clientInfo = invoice.client || invoice.clientUser;
          const movimientoData = {
            paymentId: paymentId,
            invoiceId: invoiceId,
            amountPaid: amountPaidToInvoice,
            totalInvoice: parseFloat(invoice.total) || 0,
            seller: {
              name: invoice.seller.name
            },
            client: clientInfo ? {
              id: (clientInfo.id ?? clientInfo.identifier)?.toString?.() || String(clientInfo.id || ''),
              name: clientInfo.name || clientInfo.organization || 'Sin nombre'
            } : null,
            items: (invoice.items || []).map(item => {
              let itemSubtotal = 0;
              if (item.total !== undefined && item.total !== null) {
                itemSubtotal = parseFloat(item.total);
              } else if (item.subtotal !== undefined && item.subtotal !== null) {
                itemSubtotal = parseFloat(item.subtotal);
              } else if (item.price !== undefined && item.quantity !== undefined) {
                itemSubtotal = (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 0);
              }
              
              return {
                description: item.description || '',
                subtotal: itemSubtotal
              };
            }),
            fecha: paymentDate, // FECHA DEL PAYMENT (el cobro parcial)
            fechaInvoice: invoice.date,
            fechaSync: new Date()
          };
          
          // Guardar en Firestore
          await docRef.set(movimientoData, { merge: true });
          
          if (docSnapshot.exists) {
            actualizadas++;
          } else {
            nuevas++;
          }
          
        } catch (error) {
          console.error(`[COMISIONES SYNC] Error procesando movimiento ${paymentId}_${invoiceId}:`, error.message);
          errores++;
        }
      }
    }
    
    console.log(`[COMISIONES SYNC] Completado: ${nuevas} nuevos movimientos, ${actualizadas} actualizados, ${errores} errores`);
    console.log(`[COMISIONES SYNC] Estadísticas: ${sinSeller} sin seller, ${vendedorInvalido} vendedor no comisionable`);
    
    // Actualizar fecha de última sincronización
    await adminDb.collection('comisiones_sync_metadata').doc('last_sync').set({
      fechaSync: Timestamp.now()
    });
    
    return {
      success: true,
      total: totalMovimientos,
      nuevas,
      actualizadas,
      errores,
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

