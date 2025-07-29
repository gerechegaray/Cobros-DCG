import React, { useEffect, useState } from "react";
import { Dropdown } from "primereact/dropdown";

export default function ClienteDropdown({ value, onChange }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClientes = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('[ClienteDropdown] Iniciando fetch de clientes...');
        const res = await fetch("/api/clientes-firebase");
        console.log('[ClienteDropdown] Response status:', res.status);
        
        if (!res.ok) {
          throw new Error(`Error al obtener clientes: ${res.status} ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log('[ClienteDropdown] Clientes obtenidos:', data.length);
        console.log('[ClienteDropdown] Primer cliente:', data[0]);
        
        setClientes(data);
      } catch (e) {
        console.error('[ClienteDropdown] Error al obtener clientes:', e);
        setError(e.message);
        setClientes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchClientes();
  }, []);

  const clientesOrdenados = [...clientes].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

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
      optionLabel="name"
      placeholder="Selecciona un cliente"
      loading={loading}
      style={{ minWidth: 250 }}
      filter
    />
  );
} 