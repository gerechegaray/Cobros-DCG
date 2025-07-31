import React, { useEffect, useState } from "react";
import { Dropdown } from "primereact/dropdown";
import { api } from "../services/api";

export default function ClienteDropdown({ value, onChange, user }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Obtener el sellerId según el rol del usuario
  const getSellerId = () => {
    if (user?.role === 'Guille') return 1;
    if (user?.role === 'Santi') return 2;
    if (user?.role === 'admin') return null; // Admin ve todos
    return null;
  };

  useEffect(() => {
    const fetchClientes = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('[ClienteDropdown] Iniciando fetch de clientes...');
        const data = await api.getClientesFirebase();
        console.log('[ClienteDropdown] Clientes obtenidos:', data.length);
        console.log('[ClienteDropdown] Clientes obtenidos:', data.length);
        console.log('[ClienteDropdown] Primer cliente:', data[0]);
        
        // Filtrar clientes según el rol del usuario
        const sellerId = getSellerId();
        let clientesFiltrados = data;
        
        if (sellerId !== null) {
          // Filtrar por sellerId específico - el seller es un objeto con id
          clientesFiltrados = data.filter(cliente => {
            if (cliente.seller && cliente.seller.id) {
              return cliente.seller.id === sellerId.toString();
            }
            return false;
          });
          console.log(`[ClienteDropdown] Filtrando por sellerId ${sellerId}: ${clientesFiltrados.length} clientes`);
        } else if (user?.role === 'admin') {
          // Admin ve todos los clientes
          clientesFiltrados = data;
          console.log(`[ClienteDropdown] Admin ve todos los clientes: ${clientesFiltrados.length}`);
        } else {
          // Usuario sin rol válido - no mostrar clientes
          clientesFiltrados = [];
          console.log('[ClienteDropdown] Usuario sin rol válido - no se muestran clientes');
        }
        
        setClientes(clientesFiltrados);
      } catch (e) {
        console.error('[ClienteDropdown] Error al obtener clientes:', e);
        setError(e.message);
        setClientes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchClientes();
  }, [user]);

  // 🆕 Ordenar clientes alfabéticamente y convertir a formato para dropdown
  const clientesOrdenados = clientes
    .sort((a, b) => {
      const nombreA = a.name || a.nombre || a['Razón Social'] || '';
      const nombreB = b.name || b.nombre || b['Razón Social'] || '';
      return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
    })
    .map(cliente => ({
      label: cliente.name || cliente.nombre || cliente['Razón Social'] || cliente.id || '(Sin nombre)',
      value: cliente.name || cliente.nombre || cliente['Razón Social'] || cliente.id
    }));

  if (error) {
    return (
      <div style={{ color: 'red', padding: '1rem', textAlign: 'center' }}>
        Error al cargar clientes: {error}
      </div>
    );
  }

  return (
    <Dropdown
      value={value}
      options={clientesOrdenados}
      onChange={onChange}
      optionLabel="label"
      placeholder="Selecciona un cliente"
      loading={loading}
      filter
      filterPlaceholder="Buscar cliente..."
      showClear
      style={{ minWidth: 250 }}
    />
  );
} 