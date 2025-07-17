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