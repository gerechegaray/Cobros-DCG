// Servicio para comisiones de vendedores
import { apiRequest } from '../../services/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:3001' : 'https://sist-gestion-dcg.onrender.com');

// Obtener comisiones de un vendedor y período
export const getComisiones = async (vendedor, periodo) => {
  try {
    const url = `${API_BASE_URL}/api/comisiones/${vendedor}/${periodo}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error obteniendo comisiones:', error);
    throw error;
  }
};

// Obtener todas las comisiones de un vendedor
export const getComisionesVendedor = async (vendedor) => {
  try {
    const url = `${API_BASE_URL}/api/comisiones/${vendedor}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error obteniendo comisiones del vendedor:', error);
    throw error;
  }
};

// Calcular comisiones de un período
export const calcularComisiones = async (periodo) => {
  try {
    const url = `${API_BASE_URL}/api/comisiones/calcular/${periodo}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error calculando comisiones:', error);
    throw error;
  }
};

// Obtener reglas de comisión
export const getReglasComisiones = async () => {
  try {
    const url = `${API_BASE_URL}/api/comisiones/reglas`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error obteniendo reglas:', error);
    throw error;
  }
};

// Sincronizar facturas desde payments (incremental)
export const syncFacturas = async () => {
  try {
    const url = `${API_BASE_URL}/api/comisiones/sync-facturas`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sincronizando facturas:', error);
    throw error;
  }
};

// Sincronizar facturas completa (todos los payments históricos)
export const syncFacturasCompleta = async () => {
  try {
    const url = `${API_BASE_URL}/api/comisiones/sync-facturas?completa=true`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sincronizando facturas completa:', error);
    throw error;
  }
};

// Seed de reglas (solo admin)
export const seedReglas = async () => {
  try {
    const url = `${API_BASE_URL}/api/comisiones/reglas/seed`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error en seed de reglas:', error);
    throw error;
  }
};

