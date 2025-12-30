// Servicio para cálculo de comisiones por flete
// FASE 2.3: Cálculo mensual basado en hojas de ruta

import { Timestamp } from 'firebase-admin/firestore';

// Vendedores válidos
const VENDEDORES_VALIDOS = ['Guille', 'Santi'];
const PORCENTAJE_FLETE = 4; // 4% fijo

/**
 * Calcular total de una hoja de ruta sumando los totales de los pedidos
 */
function calcularTotalHojaRuta(hoja) {
  if (!hoja.pedidos || !Array.isArray(hoja.pedidos)) {
    return 0;
  }
  
  return hoja.pedidos.reduce((total, pedido) => {
    const pedidoTotal = parseFloat(pedido.total) || 0;
    return total + pedidoTotal;
  }, 0);
}

/**
 * Calcular comisión por flete para un período y vendedor
 */
export async function calcularComisionFleteMensual(adminDb, periodo) {
  if (!adminDb) {
    throw new Error('Firebase no inicializado');
  }
  
  console.log(`[COMISIONES FLETE] Calculando comisión por flete para período: ${periodo}`);
  
  // Validar formato de período (YYYY-MM)
  const periodoRegex = /^\d{4}-\d{2}$/;
  if (!periodoRegex.test(periodo)) {
    throw new Error('Formato de período inválido. Debe ser YYYY-MM');
  }
  
  // Obtener año y mes del período
  const [anio, mes] = periodo.split('-').map(Number);
  
  // Fechas de inicio y fin del período
  const fechaInicio = new Date(anio, mes - 1, 1, 0, 0, 0, 0);
  const fechaFin = new Date(anio, mes, 0, 23, 59, 59, 999);
  
  console.log(`[COMISIONES FLETE] Rango de fechas: ${fechaInicio.toISOString()} a ${fechaFin.toISOString()}`);
  
  // Obtener todas las hojas de ruta del período
  const snapshot = await adminDb.collection('hojasDeRuta')
    .where('fecha', '>=', Timestamp.fromDate(fechaInicio))
    .where('fecha', '<=', Timestamp.fromDate(fechaFin))
    .get();
  
  console.log(`[COMISIONES FLETE] Hojas de ruta encontradas: ${snapshot.size}`);
  
  // Agrupar por vendedor
  const comisionesPorVendedor = {};
  
  VENDEDORES_VALIDOS.forEach(vendedor => {
    comisionesPorVendedor[vendedor] = {
      vendedor,
      periodo,
      totalFlete: 0,
      porcentaje: PORCENTAJE_FLETE,
      comisionFlete: 0,
      cantidadHojas: 0,
      updatedAt: Timestamp.now()
    };
  });
  
  snapshot.forEach(doc => {
    const hoja = doc.data();
    const responsable = hoja.responsable || hoja.cobrador || '';
    
    // Solo procesar si el responsable es un vendedor válido
    if (!VENDEDORES_VALIDOS.includes(responsable)) {
      return;
    }
    
    const totalHoja = calcularTotalHojaRuta(hoja);
    
    if (totalHoja > 0) {
      comisionesPorVendedor[responsable].totalFlete += totalHoja;
      comisionesPorVendedor[responsable].cantidadHojas += 1;
    }
  });
  
  // Calcular comisión para cada vendedor
  const resultados = [];
  
  for (const vendedor of VENDEDORES_VALIDOS) {
    const datos = comisionesPorVendedor[vendedor];
    datos.comisionFlete = datos.totalFlete * (PORCENTAJE_FLETE / 100);
    
    // Guardar en Firestore (siempre, incluso si es 0 para mantener consistencia)
    const docRef = adminDb.collection('comisiones_flete_mensuales')
      .doc(vendedor)
      .collection(periodo)
      .doc(periodo);
    
    await docRef.set(datos, { merge: true });
    
    console.log(`[COMISIONES FLETE] ${vendedor} - Total: ${datos.totalFlete}, Comisión: ${datos.comisionFlete}, Hojas: ${datos.cantidadHojas}`);
    
    resultados.push(datos);
  }
  
  return resultados;
}

/**
 * Obtener comisión por flete de un vendedor y período
 */
export async function getComisionFlete(adminDb, vendedor, periodo) {
  if (!adminDb) {
    throw new Error('Firebase no inicializado');
  }
  
  if (!VENDEDORES_VALIDOS.includes(vendedor)) {
    throw new Error(`Vendedor inválido: ${vendedor}`);
  }
  
  // Validar formato de período
  const periodoRegex = /^\d{4}-\d{2}$/;
  if (periodo && !periodoRegex.test(periodo)) {
    throw new Error('Formato de período inválido. Debe ser YYYY-MM');
  }
  
  if (periodo) {
    // Obtener comisión de un período específico
    const docRef = adminDb.collection('comisiones_flete_mensuales')
      .doc(vendedor)
      .collection(periodo)
      .doc(periodo);
    
    const doc = await docRef.get();
    
    if (doc.exists) {
      return doc.data();
    }
    
    // Si no existe, retornar estructura vacía
    return {
      vendedor,
      periodo,
      totalFlete: 0,
      porcentaje: PORCENTAJE_FLETE,
      comisionFlete: 0,
      cantidadHojas: 0
    };
  } else {
    // Obtener todas las comisiones del vendedor
    const subcollections = await adminDb.collection('comisiones_flete_mensuales')
      .doc(vendedor)
      .listCollections();
    
    const comisiones = [];
    
    for (const subcollection of subcollections) {
      const periodo = subcollection.id;
      const docRef = subcollection.doc(periodo);
      const docSnapshot = await docRef.get();
      
      if (docSnapshot.exists) {
        comisiones.push(docSnapshot.data());
      }
    }
    
    // Ordenar por período descendente
    comisiones.sort((a, b) => b.periodo.localeCompare(a.periodo));
    
    return comisiones;
  }
}

