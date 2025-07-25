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
  const response = await fetch(`/api/alegra/estado-cuenta/${clienteId}`);
  if (!response.ok) {
    throw new Error('Error al obtener el estado de cuenta de Alegra');
  }
  const data = await response.json();
  console.log('[ALEGRA SERVICE] Datos recibidos:', data.length, 'facturas');
  console.log('[ALEGRA SERVICE] Primeras 3 facturas:', data.slice(0, 3).map(f => ({
    numero: f.numero,
    clienteNombre: f.clienteNombre,
    montoTotal: f.montoTotal
  })));
  return data;
} 