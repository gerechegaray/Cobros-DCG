// Servicio para obtener facturas de venta desde Alegra

import fetch from 'node-fetch';

export async function getAlegraInvoices() {
  const email = process.env.ALEGRA_EMAIL?.trim();
  const apiKey = process.env.ALEGRA_API_KEY?.trim();
  
  // Verificar que las credenciales estén configuradas
  if (!email || !apiKey) {
    throw new Error('Credenciales de Alegra no configuradas. Verifica ALEGRA_EMAIL y ALEGRA_API_KEY en las variables de entorno.');
  }
  
  // 🆕 Calcular fecha límite (7 días atrás para incluir los últimos 7 días)
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - 7); // Cambiado de -6 a -7
  fechaLimite.setHours(0, 0, 0, 0); // Establecer a inicio del día
  const fechaLimiteStr = fechaLimite.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  
  // 🆕 Ajustar fecha límite para ser más tolerante con zona horaria (1 día menos)
  const fechaLimiteAjustada = new Date(fechaLimite);
  fechaLimiteAjustada.setDate(fechaLimiteAjustada.getDate() - 1);
  const fechaLimiteAjustadaStr = fechaLimiteAjustada.toISOString().split('T')[0];
  
  console.log(`🆕 Filtro de facturas: solo desde ${fechaLimiteStr} (últimos 7 días incluyendo hoy)`);
  console.log(`🆕 Filtro ajustado para zona horaria: desde ${fechaLimiteAjustadaStr} (más tolerante)`);
  console.log(`🆕 Fecha actual: ${new Date().toISOString().split('T')[0]}`);
  console.log(`🆕 Fecha límite (objeto Date): ${fechaLimite.toISOString()}`);
  
  // 🆕 Función para obtener facturas con paginación
  const obtenerFacturasConPaginacion = async (start = 0, limit = 30) => {
    // 🆕 Probar con diferentes parámetros para obtener más facturas
    const url = `https://api.alegra.com/api/v1/invoices?start=${start}&limit=${limit}&order_direction=DESC&order_field=date`;
    const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
    
    console.log(`🆕 Llamando a: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        authorization
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Alegra API error:', response.status, errorText);
      throw new Error('Error al obtener las facturas de Alegra');
    }
    
    return await response.json();
  };
  
  // 🆕 Obtener todas las facturas con paginación
  console.log('🆕 Obteniendo todas las facturas de Alegra con paginación...');
  
  let todasLasFacturas = [];
  let start = 0;
  const limit = 30;
  let hayMasFacturas = true;
  
  // 🆕 Primero intentar obtener todas las facturas sin paginación
  try {
    console.log('🆕 Intentando obtener todas las facturas sin paginación...');
    const urlSimple = `https://api.alegra.com/api/v1/invoices?limit=30`;
    const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
    
    const responseSimple = await fetch(urlSimple, {
      headers: {
        accept: 'application/json',
        authorization
      }
    });
    
    if (responseSimple.ok) {
      const facturasSimples = await responseSimple.json();
      console.log(`🆕 Facturas obtenidas sin paginación: ${facturasSimples.length}`);
      if (facturasSimples.length > 1) {
        todasLasFacturas = facturasSimples;
        hayMasFacturas = false;
      }
    }
  } catch (error) {
    console.log('🆕 Error obteniendo facturas sin paginación, continuando con paginación...');
  }
  
  // 🆕 Si no se obtuvieron suficientes facturas, usar paginación
  if (todasLasFacturas.length <= 1) {
    console.log('🆕 Usando paginación para obtener más facturas...');
    start = 0;
    hayMasFacturas = true;
    
    while (hayMasFacturas) {
      console.log(`🆕 Obteniendo facturas desde ${start} con límite ${limit}...`);
      const facturas = await obtenerFacturasConPaginacion(start, limit);
      
      if (facturas.length === 0) {
        hayMasFacturas = false;
      } else {
        todasLasFacturas = todasLasFacturas.concat(facturas);
        start += limit;
        
        // Si obtenemos menos facturas que el límite, significa que no hay más
        if (facturas.length < limit) {
          hayMasFacturas = false;
        }
      }
    }
  }
  
  console.log(`🆕 Total de facturas obtenidas de Alegra: ${todasLasFacturas.length}`);
  console.log(`🆕 Status de respuesta: 200`);
  
  // 🆕 Debug: mostrar TODAS las fechas de facturas antes del filtro
  if (todasLasFacturas.length > 0) {
    console.log('🆕 TODAS las facturas obtenidas de Alegra (antes del filtro):');
    todasLasFacturas.forEach((factura, index) => {
      const fechaFactura = new Date(factura.date);
      const fechaFacturaStr = fechaFactura.toISOString().split('T')[0];
      const fechaLimiteAjustadaStr = fechaLimiteAjustada.toISOString().split('T')[0];
      const esReciente = fechaFacturaStr >= fechaLimiteAjustadaStr;
      console.log(`  ${index + 1}. ID: ${factura.id}, Fecha: ${factura.date}, Fecha (Date): ${fechaFactura.toISOString()}, Fecha (solo fecha): ${fechaFacturaStr}, Es reciente: ${esReciente}, Cliente: ${factura.client?.name || 'N/A'}`);
    });
  } else {
    console.log('🆕 No se obtuvieron facturas de Alegra');
  }
  
  // 🆕 Filtrar facturas de los últimos 7 días
  const facturasFiltradas = todasLasFacturas.filter(factura => {
    if (!factura.date) {
      console.log(`🆕 Factura ${factura.id} sin fecha, excluida del filtro`);
      return false;
    }
    
    // Convertir la fecha de la factura a objeto Date
    const fechaFactura = new Date(factura.date);
    
    // 🆕 Comparar solo las fechas (sin tiempo) para evitar problemas de zona horaria
    const fechaFacturaStr = fechaFactura.toISOString().split('T')[0];
    const fechaLimiteAjustadaStr = fechaLimiteAjustada.toISOString().split('T')[0];
    const esReciente = fechaFacturaStr >= fechaLimiteAjustadaStr;
    
    if (!esReciente) {
      console.log(`🆕 Factura ${factura.id} del ${factura.date} (${fechaFacturaStr}) excluida (más de 7 días)`);
    } else {
      console.log(`🆕 Factura ${factura.id} del ${factura.date} (${fechaFacturaStr}) INCLUIDA (dentro de 7 días)`);
    }
    
    return esReciente;
  });
  
  console.log(`🆕 Facturas después del filtro de 7 días: ${facturasFiltradas.length} de ${todasLasFacturas.length}`);
  
  // 🆕 Filtrar facturas anuladas, cerradas y pagadas (status: "void", "closed", "paid")
  const facturasSinAnuladas = facturasFiltradas.filter(factura => {
    const estadosExcluidos = ["void", "closed", "paid"];
    const esValida = !estadosExcluidos.includes(factura.status);
    if (!esValida) {
      console.log(`🆕 Excluyendo factura: ID ${factura.id}, Número ${factura.number}, Status: ${factura.status}`);
    }
    return esValida;
  });
  
  console.log(`🆕 Facturas válidas (sin anuladas/cerradas/pagadas): ${facturasSinAnuladas.length} de ${facturasFiltradas.length}`);
  
  // 🆕 Debug: mostrar las fechas de las primeras 5 facturas después del filtro
  if (facturasSinAnuladas.length > 0) {
    console.log('🆕 Fechas de las primeras 5 facturas (después de todos los filtros):');
    facturasSinAnuladas.slice(0, 5).forEach((factura, index) => {
      console.log(`  ${index + 1}. ID: ${factura.id}, Fecha: ${factura.date}, Cliente: ${factura.client?.name || 'N/A'}, Status: ${factura.status}`);
    });
  } else {
    console.log('🆕 No hay facturas que cumplan los criterios (7 días + no anuladas/cerradas/pagadas)');
  }
  
  return facturasSinAnuladas;
}

export async function getAlegraContacts() {
  const email = process.env.ALEGRA_EMAIL?.trim();
  const apiKey = process.env.ALEGRA_API_KEY?.trim();
  
  // Verificar que las credenciales estén configuradas
  if (!email || !apiKey) {
    throw new Error('Credenciales de Alegra no configuradas. Verifica ALEGRA_EMAIL y ALEGRA_API_KEY en las variables de entorno.');
  }
  
  const url = 'https://api.alegra.com/api/v1/contacts';
  const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      authorization
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error('Error al obtener los clientes de Alegra: ' + errorText);
  }
  return await response.json();
}

export async function getAlegraItems() {
  const email = process.env.ALEGRA_EMAIL?.trim();
  const apiKey = process.env.ALEGRA_API_KEY?.trim();
  const url = 'https://api.alegra.com/api/v1/items';
  const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      authorization
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error('Error al obtener los productos de Alegra: ' + errorText);
  }
  return await response.json();
}
