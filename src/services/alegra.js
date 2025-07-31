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
  
  // 🆕 Probar con URL directa al servidor de producción
  const url = `https://cobros-dcg.onrender.com/api/alegra/estado-cuenta/${clienteId}`;
  console.log('[ALEGRA SERVICE] URL directa:', url);
  
  try {
    const response = await fetch(url);
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
    console.log('[ALEGRA SERVICE] Primeras 3 facturas:', data.slice(0, 3).map(f => ({
      numero: f.numero,
      clienteNombre: f.clienteNombre,
      montoTotal: f.montoTotal
    })));
    return data;
  } catch (error) {
    console.error('[ALEGRA SERVICE] Error completo:', error);
    throw error;
  }
} 