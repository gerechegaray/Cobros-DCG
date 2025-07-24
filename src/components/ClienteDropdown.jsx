import React, { useEffect, useState } from "react";
import { Dropdown } from "primereact/dropdown";

export default function ClienteDropdown({ value, onChange }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchClientes = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/clientes-firebase");
        if (!res.ok) throw new Error("Error al obtener clientes");
        const data = await res.json();
        setClientes(data);
      } catch (e) {
        setClientes([]);
      }
      setLoading(false);
    };
    fetchClientes();
  }, []);

  const clientesOrdenados = [...clientes].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

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