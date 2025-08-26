// Servicio para obtener facturas de venta desde Alegra

import fetch from 'node-fetch';

export async function getAlegraInvoices(dias = 5, limit = 30) {
  const email = process.env.ALEGRA_EMAIL?.trim();
  const apiKey = process.env.ALEGRA_API_KEY?.trim();
  
  // Verificar que las credenciales estén configuradas
  if (!email || !apiKey) {
    throw new Error('Credenciales de Alegra no configuradas. Verifica ALEGRA_EMAIL y ALEGRA_API_KEY en las variables de entorno.');
  }
  
  // 🆕 Validar rangos permitidos: hoy (1), 3 días, 5 días
  const rangosPermitidos = [1, 3, 5];
  if (!rangosPermitidos.includes(dias)) {
    throw new Error(`Rango de días no válido. Solo se permiten: ${rangosPermitidos.join(', ')} días`);
  }
  
  // 🆕 Validar límite de facturas
  const limitInt = parseInt(limit);
  if (isNaN(limitInt) || limitInt < 1 || limitInt > 100) {
    throw new Error('El límite debe ser un número entre 1 y 100');
  }
  
  // 🆕 Calcular fecha límite usando filtro nativo de Alegra
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);
  fechaLimite.setHours(0, 0, 0, 0);
  const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
  
  console.log(`🆕 OPTIMIZADO: Filtrando facturas desde ${fechaLimiteStr} (últimos ${dias} días)`);
  console.log(`🆕 OPTIMIZADO: Solo facturas abiertas (status=open)`);
  
  // 🆕 Usar filtros nativos de Alegra para optimizar rendimiento
  const params = new URLSearchParams({
    date_afterOrNow: fechaLimiteStr,
    status: 'open', // 🆕 Solo facturas abiertas
    order_direction: 'DESC',
    order_field: 'date',
    limit: limitInt.toString() // 🆕 Límite configurable
  });
  
  const url = `https://api.alegra.com/api/v1/invoices?${params.toString()}`;
  const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
  
  console.log(`🆕 OPTIMIZADO: URL con filtros nativos: ${url}`);
  
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
  
  const facturas = await response.json();
  
  console.log(`🆕 OPTIMIZADO: Facturas obtenidas directamente filtradas: ${facturas.length}`);
  console.log(`🆕 OPTIMIZADO: Solo facturas abiertas de los últimos ${dias} días`);
  
  // 🆕 Debug: mostrar las primeras 5 facturas obtenidas
  if (facturas.length > 0) {
    console.log('🆕 OPTIMIZADO: Primeras 5 facturas obtenidas:');
    facturas.slice(0, 5).forEach((factura, index) => {
      console.log(`  ${index + 1}. ID: ${factura.id}, Fecha: ${factura.date}, Cliente: ${factura.client?.name || 'N/A'}, Status: ${factura.status}`);
    });
  } else {
    console.log('🆕 OPTIMIZADO: No hay facturas abiertas en el rango especificado');
  }
  
  return facturas;
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
