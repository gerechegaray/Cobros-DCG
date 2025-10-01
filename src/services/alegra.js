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
  // Usar proxy local en desarrollo, URL directa en producción
  const isDevelopment = import.meta.env.DEV;
  const baseUrl = isDevelopment ? '' : 'https://sist-gestion-dcg.onrender.com';
  const timestamp = new Date().getTime(); // Timestamp para evitar caché
  const url = `${baseUrl}/api/alegra/estado-cuenta/${clienteId}?t=${timestamp}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate', // 🆕 Evitar caché
        'Pragma': 'no-cache', // 🆕 Evitar caché
        'Expires': '0' // 🆕 Evitar caché
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ALEGRA SERVICE] Error response:', errorText);
      throw new Error(`Error al obtener el estado de cuenta de Alegra: ${response.status} ${response.statusText}`);
    }
    
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[ALEGRA SERVICE] Error parseando JSON:', parseError);
      throw new Error('Respuesta no es JSON válido');
    }
    
    console.log('[ALEGRA SERVICE] Datos recibidos:', data.length, 'facturas');
    
    return data;
  } catch (error) {
    console.error('[ALEGRA SERVICE] Error completo:', error);
    throw error;
  }
} 