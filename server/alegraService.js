// Servicio para obtener facturas de venta desde Alegra

import fetch from 'node-fetch';

export async function getAlegraInvoices() {
  const email = process.env.ALEGRA_EMAIL?.trim();
  const apiKey = process.env.ALEGRA_API_KEY?.trim();
  
  // 🆕 Calcular fecha límite (7 días atrás para incluir los últimos 7 días)
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - 7); // Cambiado de -6 a -7
  fechaLimite.setHours(0, 0, 0, 0); // Establecer a inicio del día
  const fechaLimiteStr = fechaLimite.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  
  console.log(`🆕 Filtro de facturas: solo desde ${fechaLimiteStr} (últimos 7 días incluyendo hoy)`);
  console.log(`🆕 Fecha actual: ${new Date().toISOString().split('T')[0]}`);
  console.log(`🆕 Fecha límite (objeto Date): ${fechaLimite.toISOString()}`);
  
  // 🆕 Obtener todas las facturas sin filtro de fecha
  const url = `https://api.alegra.com/api/v1/invoices`;
  console.log('🆕 Obteniendo todas las facturas de Alegra...');
  const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');

  // Logs de depuración
  console.log('EMAIL:', JSON.stringify(email));
  console.log('API KEY:', JSON.stringify(apiKey));
  console.log('Authorization header:', authorization);
  console.log('URL:', url);

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

  const data = await response.json();
  console.log(`🆕 Total de facturas obtenidas de Alegra: ${data.length}`);
  
  // 🆕 Debug: mostrar TODAS las fechas de facturas antes del filtro
  if (data.length > 0) {
    console.log('🆕 TODAS las facturas obtenidas de Alegra (antes del filtro):');
    data.forEach((factura, index) => {
      const fechaFactura = new Date(factura.date);
      const fechaFacturaStr = fechaFactura.toISOString().split('T')[0];
      const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
      const esReciente = fechaFacturaStr >= fechaLimiteStr;
      console.log(`  ${index + 1}. ID: ${factura.id}, Fecha: ${factura.date}, Fecha (Date): ${fechaFactura.toISOString()}, Fecha (solo fecha): ${fechaFacturaStr}, Es reciente: ${esReciente}, Cliente: ${factura.client?.name || 'N/A'}`);
    });
  } else {
    console.log('🆕 No se obtuvieron facturas de Alegra');
  }
  
  // 🆕 Filtrar facturas de los últimos 7 días
  const facturasFiltradas = data.filter(factura => {
    if (!factura.date) {
      console.log(`🆕 Factura ${factura.id} sin fecha, excluida del filtro`);
      return false;
    }
    
    // Convertir la fecha de la factura a objeto Date
    const fechaFactura = new Date(factura.date);
    
    // 🆕 Comparar solo las fechas (sin tiempo) para evitar problemas de zona horaria
    const fechaFacturaStr = fechaFactura.toISOString().split('T')[0];
    const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
    const esReciente = fechaFacturaStr >= fechaLimiteStr;
    
    if (!esReciente) {
      console.log(`🆕 Factura ${factura.id} del ${factura.date} (${fechaFacturaStr}) excluida (más de 7 días)`);
    } else {
      console.log(`🆕 Factura ${factura.id} del ${factura.date} (${fechaFacturaStr}) INCLUIDA (dentro de 7 días)`);
    }
    
    return esReciente;
  });
  
  console.log(`🆕 Facturas después del filtro de 7 días: ${facturasFiltradas.length} de ${data.length}`);
  
  // 🆕 Debug: mostrar las fechas de las primeras 5 facturas después del filtro
  if (facturasFiltradas.length > 0) {
    console.log('🆕 Fechas de las primeras 5 facturas (después del filtro):');
    facturasFiltradas.slice(0, 5).forEach((factura, index) => {
      console.log(`  ${index + 1}. ID: ${factura.id}, Fecha: ${factura.date}, Cliente: ${factura.client?.name || 'N/A'}`);
    });
  } else {
    console.log('🆕 No hay facturas que cumplan el criterio de 7 días');
  }
  
  return facturasFiltradas;
}

export async function getAlegraContacts() {
  const email = process.env.ALEGRA_EMAIL?.trim();
  const apiKey = process.env.ALEGRA_API_KEY?.trim();
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
