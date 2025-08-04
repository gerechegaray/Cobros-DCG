// Servicio para consumir la API de Alegra desde el backend

export async function getAlegraContacts() {
  const response = await fetch('/api/alegra/contacts');
  if (!response.ok) {
    throw new Error('Error al obtener los contactos de Alegra');
  }
  const data = await response.json();
  console.log('Primeros 3 clientes de Alegra:', data.slice(0, 3));
  return data;
}

// Obtener facturas de venta desde el backend
export async function getAlegraInvoices() {
  const response = await fetch('/api/alegra/invoices');
  if (!response.ok) {
    throw new Error('Error al obtener las facturas de Alegra');
  }
  const data = await response.json();
  return data;
}

// Obtener estado de cuenta de un cliente específico
export async function getEstadoCuenta(clienteId) {
  console.log('[ALEGRA SERVICE] Consultando estado de cuenta para cliente:', clienteId);
  
  // 🆕 Usar proxy local en desarrollo, URL directa en producción
  const isDevelopment = import.meta.env.DEV;
  const baseUrl = isDevelopment ? '' : 'https://sist-gestion-dcg.onrender.com';
  const url = `${baseUrl}/api/alegra/estado-cuenta/${clienteId}`;
  console.log('[ALEGRA SERVICE] URL:', url);
  console.log('[ALEGRA SERVICE] Modo desarrollo:', isDevelopment);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log('[ALEGRA SERVICE] Response status:', response.status);
    console.log('[ALEGRA SERVICE] Response headers:', response.headers);
    console.log('[ALEGRA SERVICE] Response URL:', response.url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ALEGRA SERVICE] Error response:', errorText);
      throw new Error(`Error al obtener el estado de cuenta de Alegra: ${response.status} ${response.statusText}`);
    }
    
    // 🆕 Verificar el contenido antes de parsear
    const responseText = await response.text();
    console.log('[ALEGRA SERVICE] Response text (primeros 200 chars):', responseText.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[ALEGRA SERVICE] Error parseando JSON:', parseError);
      console.error('[ALEGRA SERVICE] Response text completo:', responseText);
      throw new Error('Respuesta no es JSON válido');
    }
    
    console.log('[ALEGRA SERVICE] Datos recibidos:', data.length, 'facturas');
    console.log('[ALEGRA SERVICE] Todas las facturas recibidas:', data.map(f => ({
      numero: f.numero,
      clienteNombre: f.clienteNombre,
      montoTotal: f.montoTotal,
      estado: f.estado
    })));
    
    // 🆕 Verificar si hay facturas con números específicos que mencionó el usuario
    const facturas1y6 = data.filter(f => f.numero === '1' || f.numero === '6');
    if (facturas1y6.length > 0) {
      console.warn('[ALEGRA SERVICE] ⚠️ ADVERTENCIA: Se encontraron facturas 1 y 6 que deberían estar filtradas:', facturas1y6);
    }
    
    return data;
  } catch (error) {
    console.error('[ALEGRA SERVICE] Error completo:', error);
    throw error;
  }
} 