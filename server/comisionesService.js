// Servicio para cálculo de comisiones de vendedores
// FASE 1: Cálculo simple basado en reglas de categoría

import { getAlegraPayments, getAlegraInvoiceById } from './alegraService.js';

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
  const [anio, mes] = periodo.split('-');
  const fechaInicio = new Date(parseInt(anio), parseInt(mes) - 1, 1);
  const fechaFin = new Date(parseInt(anio), parseInt(mes), 0, 23, 59, 59);
  
  console.log(`[COMISIONES] Buscando facturas entre ${fechaInicio.toISOString()} y ${fechaFin.toISOString()}`);
  
  const snapshot = await adminDb.collection('facturas_comisiones')
    .where('fecha', '>=', fechaInicio.toISOString().split('T')[0])
    .where('fecha', '<=', fechaFin.toISOString().split('T')[0])
    .get();
  
  console.log(`[COMISIONES] Facturas encontradas en período: ${snapshot.size}`);
  
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
    
    items.forEach(item => {
      const description = item.description || '';
      const subtotal = parseFloat(item.subtotal) || 0;
      
      if (subtotal <= 0) {
        return; // Ignorar items sin subtotal
      }
      
      // Detectar categoría
      const categoria = detectarCategoria(description, reglas);
      
      if (!categoria) {
        console.log(`[COMISIONES] Item sin categoría: "${description}" - comisión = 0`);
        return; // Sin categoría = comisión 0
      }
      
      // Obtener porcentaje de la regla
      const porcentaje = reglas[categoria];
      
      // Calcular comisión
      const comision = subtotal * (porcentaje / 100);
      
      // Acumular
      comisionesPorVendedor[vendedorNombre].totalCobrado += subtotal;
      comisionesPorVendedor[vendedorNombre].totalComision += comision;
      
      // Agregar al detalle
      comisionesPorVendedor[vendedorNombre].detalle.push({
        facturaId: factura.invoiceId,
        producto: description,
        categoria: categoria,
        subtotal: subtotal,
        porcentaje: porcentaje,
        comision: comision
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
    
    await docRef.set({
      ...resultado,
      updatedAt: new Date()
    }, { merge: true });
    
    resultados.push(resultado);
    
    console.log(`[COMISIONES] ${vendedorNombre} - Total cobrado: ${resultado.totalCobrado}, Comisión: ${resultado.totalComision}`);
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
    
    // Debug: mostrar estructura del primer payment
    if (payments.length > 0) {
      console.log('[COMISIONES SYNC] Estructura del primer payment:', JSON.stringify(payments[0], null, 2));
    }
    
    // Extraer invoice IDs únicos
    // NOTA: Los payments de Alegra tienen "invoices" (array), no "invoice" (objeto)
    const invoiceIds = new Set();
    let paymentsConInvoice = 0;
    let paymentsSinInvoice = 0;
    let totalInvoicesEncontradas = 0;
    
    payments.forEach(payment => {
      // Los payments tienen "invoices" como array
      if (payment.invoices && Array.isArray(payment.invoices) && payment.invoices.length > 0) {
        paymentsConInvoice++;
        totalInvoicesEncontradas += payment.invoices.length;
        
        // Extraer IDs de todas las invoices del array
        payment.invoices.forEach(invoice => {
          if (invoice && invoice.id) {
            invoiceIds.add(invoice.id.toString());
          }
        });
      } else {
        paymentsSinInvoice++;
        console.log('[COMISIONES SYNC] Payment sin invoices válidas:', {
          paymentId: payment.id,
          paymentDate: payment.date,
          tieneInvoices: !!payment.invoices,
          esArray: Array.isArray(payment.invoices),
          cantidad: payment.invoices?.length || 0
        });
      }
    });
    
    console.log(`[COMISIONES SYNC] Payments con invoices: ${paymentsConInvoice}`);
    console.log(`[COMISIONES SYNC] Payments sin invoices: ${paymentsSinInvoice}`);
    console.log(`[COMISIONES SYNC] Total invoices encontradas en payments: ${totalInvoicesEncontradas}`);
    console.log(`[COMISIONES SYNC] Invoice IDs únicos: ${invoiceIds.size}`);
    
    let nuevas = 0;
    let actualizadas = 0;
    let errores = 0;
    let sinSeller = 0;
    let vendedorInvalido = 0;
    
    console.log(`[COMISIONES SYNC] Procesando ${invoiceIds.size} invoices...`);
    
    // Procesar cada invoice
    for (const invoiceId of invoiceIds) {
      try {
        // Verificar si ya existe en Firestore
        const docRef = adminDb.collection('facturas_comisiones').doc(invoiceId);
        const docSnapshot = await docRef.get();
        
        // Obtener invoice desde Alegra
        const invoice = await getAlegraInvoiceById(invoiceId);
        
        if (!invoice) {
          console.warn(`[COMISIONES SYNC] Invoice ${invoiceId} no encontrada en Alegra`);
          errores++;
          continue;
        }
        
        // Validar que tenga seller
        if (!invoice.seller || !invoice.seller.name) {
          console.log(`[COMISIONES SYNC] Invoice ${invoiceId} sin seller, ignorada`);
          sinSeller++;
          continue;
        }
        
        // Validar vendedor
        if (!VENDEDORES_VALIDOS.includes(invoice.seller.name)) {
          console.log(`[COMISIONES SYNC] Invoice ${invoiceId} con vendedor inválido: ${invoice.seller.name}`);
          vendedorInvalido++;
          continue;
        }
        
        console.log(`[COMISIONES SYNC] Procesando invoice ${invoiceId} - Vendedor: ${invoice.seller.name}`);
        
        // Debug: mostrar estructura del primer item si existe
        if (invoice.items && invoice.items.length > 0) {
          console.log(`[COMISIONES SYNC] Estructura del primer item de invoice ${invoiceId}:`, JSON.stringify(invoice.items[0], null, 2));
        }
        
        // Extraer solo lo necesario
        const facturaData = {
          invoiceId: invoice.id.toString(),
          seller: {
            name: invoice.seller.name
          },
          items: (invoice.items || []).map(item => {
            // El campo correcto es "total" según la estructura de Alegra
            // total = price * quantity (ya calculado por Alegra)
            let subtotal = 0;
            
            if (item.total !== undefined && item.total !== null) {
              subtotal = parseFloat(item.total);
              if (isNaN(subtotal)) subtotal = 0;
            } else if (item.subtotal !== undefined && item.subtotal !== null) {
              subtotal = parseFloat(item.subtotal);
              if (isNaN(subtotal)) subtotal = 0;
            } else if (item.price !== undefined && item.quantity !== undefined) {
              // Calcular: price * quantity como fallback
              const price = parseFloat(item.price) || 0;
              const quantity = parseFloat(item.quantity) || 0;
              subtotal = price * quantity;
            } else if (item.amount !== undefined && item.amount !== null) {
              subtotal = parseFloat(item.amount);
              if (isNaN(subtotal)) subtotal = 0;
            }
            
            return {
              description: item.description || '',
              subtotal: subtotal
            };
          }),
          fecha: invoice.date || new Date().toISOString().split('T')[0],
          fechaSync: new Date()
        };
        
        // Guardar en Firestore
        await docRef.set(facturaData, { merge: true });
        
        if (docSnapshot.exists) {
          actualizadas++;
        } else {
          nuevas++;
        }
        
        // Pequeña pausa para no saturar Alegra
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`[COMISIONES SYNC] Error procesando invoice ${invoiceId}:`, error.message);
        errores++;
      }
    }
    
    console.log(`[COMISIONES SYNC] Completado: ${nuevas} nuevas, ${actualizadas} actualizadas, ${errores} errores`);
    console.log(`[COMISIONES SYNC] Estadísticas: ${sinSeller} sin seller, ${vendedorInvalido} con vendedor inválido`);
    
    return {
      success: true,
      total: invoiceIds.size,
      nuevas,
      actualizadas,
      errores,
      sinSeller,
      vendedorInvalido,
      paymentsProcesados: payments.length,
      paymentsConInvoice: paymentsConInvoice,
      paymentsSinInvoice: paymentsSinInvoice,
      totalInvoicesEncontradas: totalInvoicesEncontradas
    };
    
  } catch (error) {
    console.error('[COMISIONES SYNC] Error en sincronización:', error);
    throw error;
  }
}

