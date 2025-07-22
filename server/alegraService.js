// Servicio para obtener facturas de venta desde Alegra

import fetch from 'node-fetch';

export async function getAlegraInvoices() {
  const apiKey = process.env.ALEGRA_API_KEY?.trim();
  const url = 'https://api.alegra.com/api/v1/invoices';
  const authorization = 'Basic ' + Buffer.from(apiKey + ':').toString('base64');

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
} 