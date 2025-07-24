// Servicio para obtener facturas de venta desde Alegra

import fetch from 'node-fetch';

export async function getAlegraInvoices() {
  const email = process.env.ALEGRA_EMAIL?.trim();
  const apiKey = process.env.ALEGRA_API_KEY?.trim();
  const url = 'https://api.alegra.com/api/v1/invoices';
  const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');

  // Logs de depuración
  console.log('EMAIL:', JSON.stringify(email));
  console.log('API KEY:', JSON.stringify(apiKey));
  console.log('Authorization header:', authorization);

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
  return data;
<<<<<<< HEAD
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
=======
>>>>>>> cad67d197e0b79ecbb82f65ef0bcadfc46b5e93b
} 