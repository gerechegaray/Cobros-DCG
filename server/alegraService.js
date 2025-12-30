// Servicio para obtener facturas de venta desde Alegra

import fetch from 'node-fetch';

export async function getAlegraInvoices(dias = 5, limit = 30, maxInvoices = 30) {
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
  
  // 🆕 Validar límite de facturas (Alegra solo permite máximo 30)
  const limitInt = parseInt(limit);
  if (isNaN(limitInt) || limitInt < 1 || limitInt > 30) {
    throw new Error('El límite debe ser un número entre 1 y 30 (Alegra solo permite máximo 30 facturas por consulta)');
  }

  const maxInvoicesInt = parseInt(maxInvoices);
  if (isNaN(maxInvoicesInt) || maxInvoicesInt < 1) {
    throw new Error('El máximo total de facturas debe ser un número mayor a 0');
  }

  // 🆕 Calcular fecha límite usando filtro nativo de Alegra
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);
  fechaLimite.setHours(0, 0, 0, 0);
  const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
  
  console.log(`🆕 OPTIMIZADO: Filtrando facturas desde ${fechaLimiteStr} (últimos ${dias} días)`);
  console.log(`🆕 OPTIMIZADO: Solo facturas abiertas (status=open)`);
  console.log(`🆕 PAGINACIÓN: Objetivo ${maxInvoicesInt} facturas (${limitInt} por petición)`);

  // Si queremos más facturas de las que permite Alegra por petición, hacemos múltiples llamadas
  if (maxInvoicesInt > limitInt) {
    console.log(`📄 Implementando paginación múltiple para obtener ${maxInvoicesInt} facturas`);
    
    const allFacturas = [];
    let offset = 0;
    let hasMore = true;
    
    while (allFacturas.length < maxInvoicesInt && hasMore) {
      const currentLimit = Math.min(limitInt, maxInvoicesInt - allFacturas.length);
      
      console.log(`📄 Petición ${Math.floor(offset / limitInt) + 1}: offset=${offset}, limit=${currentLimit}`);
      
      // 🆕 Usar filtros nativos de Alegra para optimizar rendimiento
      const params = new URLSearchParams({
        date_afterOrNow: fechaLimiteStr,
        status: 'open', // 🆕 Solo facturas abiertas
        order_direction: 'DESC',
        order_field: 'date',
        limit: currentLimit.toString(), // 🆕 Límite configurable
        start: offset.toString() // 🆕 Offset para paginación
      });
      
      const url = `https://api.alegra.com/api/v1/invoices?${params.toString()}`;
      const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
      
      console.log(`📄 URL con paginación: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          accept: 'application/json',
          authorization
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Alegra API error:', response.status, errorText);
        throw new Error(`Error en petición a Alegra: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data || !Array.isArray(data)) {
        console.log('⚠️ Respuesta inesperada de Alegra, deteniendo paginación');
        hasMore = false;
        break;
      }

      // Si no hay más facturas, detenemos la paginación
      if (data.length === 0) {
        console.log('✅ No hay más facturas disponibles, deteniendo paginación');
        hasMore = false;
        break;
      }

      allFacturas.push(...data);
      offset += data.length;
      
      // Si recibimos menos facturas de las solicitadas, no hay más páginas
      if (data.length < currentLimit) {
        console.log('✅ Última página alcanzada, deteniendo paginación');
        hasMore = false;
      }
      
      // Pequeña pausa entre peticiones para ser respetuosos con la API
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Total de facturas obtenidas: ${allFacturas.length} (objetivo: ${maxInvoicesInt})`);
    console.log(`🆕 OPTIMIZADO: Solo facturas abiertas de los últimos ${dias} días`);
    
    // 🆕 Debug: mostrar las primeras 5 facturas obtenidas
    if (allFacturas.length > 0) {
      console.log('🆕 OPTIMIZADO: Primeras 5 facturas obtenidas:');
      allFacturas.slice(0, 5).forEach((factura, index) => {
        console.log(`  ${index + 1}. ID: ${factura.id}, Fecha: ${factura.date}, Cliente: ${factura.client?.name || 'N/A'}, Status: ${factura.status}`);
      });
    } else {
      console.log('🆕 OPTIMIZADO: No hay facturas abiertas en el rango especificado');
    }
    
    return allFacturas;
  } else {
    // Llamada simple si no necesitamos paginación múltiple
    console.log(`📄 Llamada simple a Alegra: limit=${limitInt}`);
    
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
    
    console.log(`✅ Facturas obtenidas: ${facturas.length}`);
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

// 🆕 Obtener payments de Alegra (últimos N días)
export async function getAlegraPayments(dias = 30) {
  const email = process.env.ALEGRA_EMAIL?.trim();
  const apiKey = process.env.ALEGRA_API_KEY?.trim();
  
  if (!email || !apiKey) {
    throw new Error('Credenciales de Alegra no configuradas. Verifica ALEGRA_EMAIL y ALEGRA_API_KEY en las variables de entorno.');
  }
  
  // Calcular fecha límite
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);
  fechaLimite.setHours(0, 0, 0, 0);
  const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
  
  const params = new URLSearchParams({
    date_afterOrNow: fechaLimiteStr,
    order_direction: 'DESC',
    order_field: 'date',
    limit: '30' // Máximo permitido por Alegra
  });
  
  const url = `https://api.alegra.com/api/v1/payments?${params.toString()}`;
  const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
  
  console.log(`[COMISIONES] Obteniendo payments desde ${fechaLimiteStr} (últimos ${dias} días)`);
  
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      authorization
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[COMISIONES] Error obteniendo payments:', response.status, errorText);
    throw new Error(`Error al obtener payments de Alegra: ${response.status} ${response.statusText}`);
  }
  
  const payments = await response.json();
  console.log(`[COMISIONES] Payments obtenidos: ${payments.length || 0}`);
  
  return Array.isArray(payments) ? payments : [];
}

// 🆕 Obtener invoice individual por ID
export async function getAlegraInvoiceById(invoiceId) {
  const email = process.env.ALEGRA_EMAIL?.trim();
  const apiKey = process.env.ALEGRA_API_KEY?.trim();
  
  if (!email || !apiKey) {
    throw new Error('Credenciales de Alegra no configuradas. Verifica ALEGRA_EMAIL y ALEGRA_API_KEY en las variables de entorno.');
  }
  
  const url = `https://api.alegra.com/api/v1/invoices/${invoiceId}`;
  const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
  
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      authorization
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 404) {
      console.warn(`[COMISIONES] Invoice ${invoiceId} no encontrada en Alegra`);
      return null;
    }
    console.error(`[COMISIONES] Error obteniendo invoice ${invoiceId}:`, response.status, errorText);
    throw new Error(`Error al obtener invoice de Alegra: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}