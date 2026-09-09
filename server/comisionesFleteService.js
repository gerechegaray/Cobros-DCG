import { Timestamp } from 'firebase-admin/firestore';
import {
  BASICO_FLETE_SANTI,
  PCT_FLETE_SANTI,
  VENDEDORES_VALIDOS,
  bonoKgSanti,
  fleteHojaSanti,
  kgDeHoja,
  usaFlete
} from './comisionesPolitica.js';

function calcularTotalHojaRuta(hoja) {
  if (!hoja.pedidos || !Array.isArray(hoja.pedidos)) {
    return 0;
  }

  return hoja.pedidos.reduce((total, pedido) => {
    const pedidoTotal = parseFloat(pedido.total) || 0;
    return total + pedidoTotal;
  }, 0);
}

function estructuraVacia(vendedor, periodo) {
  return {
    vendedor,
    periodo,
    totalFlete: 0,
    totalKg: 0,
    porcentaje: usaFlete(vendedor) ? PCT_FLETE_SANTI * 100 : 0,
    comisionVariable: 0,
    bonoKg: 0,
    basicoFlete: vendedor === 'Santi' ? BASICO_FLETE_SANTI : 0,
    comisionFlete: 0,
    cantidadHojas: 0,
    updatedAt: Timestamp.now()
  };
}

export async function calcularComisionFleteMensual(adminDb, periodo) {
  if (!adminDb) {
    throw new Error('Firebase no inicializado');
  }

  console.log(`[COMISIONES FLETE] Calculando comisión por flete para período: ${periodo}`);

  const periodoRegex = /^\d{4}-\d{2}$/;
  if (!periodoRegex.test(periodo)) {
    throw new Error('Formato de período inválido. Debe ser YYYY-MM');
  }

  const [anio, mes] = periodo.split('-').map(Number);
  const fechaInicio = new Date(anio, mes - 1, 1, 0, 0, 0, 0);
  const fechaFin = new Date(anio, mes, 0, 23, 59, 59, 999);

  console.log(`[COMISIONES FLETE] Rango de fechas: ${fechaInicio.toISOString()} a ${fechaFin.toISOString()}`);

  const snapshot = await adminDb.collection('hojasDeRuta')
    .where('fecha', '>=', Timestamp.fromDate(fechaInicio))
    .where('fecha', '<=', Timestamp.fromDate(fechaFin))
    .get();

  console.log(`[COMISIONES FLETE] Hojas de ruta encontradas: ${snapshot.size}`);

  const comisionesPorVendedor = {};
  for (const vendedor of VENDEDORES_VALIDOS) {
    comisionesPorVendedor[vendedor] = estructuraVacia(vendedor, periodo);
  }

  snapshot.forEach((doc) => {
    const hoja = doc.data();
    const responsable = hoja.responsable || hoja.cobrador || '';
    if (responsable !== 'Santi') return;

    const totalHoja = calcularTotalHojaRuta(hoja);
    const kg = kgDeHoja(hoja);
    const variable = fleteHojaSanti(totalHoja, kg);
    const bono = bonoKgSanti(kg);

    comisionesPorVendedor.Santi.totalFlete += totalHoja;
    comisionesPorVendedor.Santi.totalKg += kg;
    comisionesPorVendedor.Santi.comisionVariable += totalHoja * PCT_FLETE_SANTI;
    comisionesPorVendedor.Santi.bonoKg += bono;
    comisionesPorVendedor.Santi.comisionFlete += variable;
    comisionesPorVendedor.Santi.cantidadHojas += 1;
  });

  comisionesPorVendedor.Santi.comisionFlete += BASICO_FLETE_SANTI;
  comisionesPorVendedor.Santi.basicoFlete = BASICO_FLETE_SANTI;
  comisionesPorVendedor.Guille.comisionFlete = 0;
  comisionesPorVendedor.Guille.basicoFlete = 0;
  comisionesPorVendedor.Victor.comisionFlete = 0;
  comisionesPorVendedor.Victor.basicoFlete = 0;

  const resultados = [];

  for (const vendedor of VENDEDORES_VALIDOS) {
    const datos = comisionesPorVendedor[vendedor];
    datos.updatedAt = Timestamp.now();

    const docRef = adminDb.collection('comisiones_flete_mensuales')
      .doc(vendedor)
      .collection(periodo)
      .doc(periodo);

    await docRef.set(datos, { merge: true });

    console.log(`[COMISIONES FLETE] ${vendedor} - Transportado: ${datos.totalFlete}, Kg: ${datos.totalKg}, Comisión: ${datos.comisionFlete}, Hojas: ${datos.cantidadHojas}`);
    resultados.push(datos);
  }

  return resultados;
}

export async function getComisionFlete(adminDb, vendedor, periodo) {
  if (!adminDb) {
    throw new Error('Firebase no inicializado');
  }

  if (!VENDEDORES_VALIDOS.includes(vendedor)) {
    throw new Error(`Vendedor inválido: ${vendedor}`);
  }

  const periodoRegex = /^\d{4}-\d{2}$/;
  if (periodo && !periodoRegex.test(periodo)) {
    throw new Error('Formato de período inválido. Debe ser YYYY-MM');
  }

  if (periodo) {
    const docRef = adminDb.collection('comisiones_flete_mensuales')
      .doc(vendedor)
      .collection(periodo)
      .doc(periodo);

    const doc = await docRef.get();
    if (doc.exists) {
      return doc.data();
    }
    return estructuraVacia(vendedor, periodo);
  }

  const subcollections = await adminDb.collection('comisiones_flete_mensuales')
    .doc(vendedor)
    .listCollections();

  const comisiones = [];

  for (const subcollection of subcollections) {
    const periodoId = subcollection.id;
    const docRef = subcollection.doc(periodoId);
    const docSnapshot = await docRef.get();

    if (docSnapshot.exists) {
      comisiones.push(docSnapshot.data());
    }
  }

  comisiones.sort((a, b) => b.periodo.localeCompare(a.periodo));
  return comisiones;
}
