import React, { useEffect, useState } from "react";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { ProgressSpinner } from "primereact/progressspinner";
import { getAlegraContacts } from "../../services/alegra";
import { useNavigate } from "react-router-dom";

export default function SelectorCliente() {
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchClientes() {
      try {
        const data = await getAlegraContacts();
        const options = data.map((c) => ({ label: c.name || '(Sin nombre)', value: c })); // value es el objeto completo
        setClientes(options);
      } catch (error) {
        console.error('Error al obtener clientes de Alegra:', error);
      } finally {
        setLoadingClientes(false);
      }
    }
    fetchClientes();
  }, []);

  const handleCargarPedido = () => {
    if (clienteSeleccionado) {
      navigate('/cargar-pedido', { state: { cliente: clienteSeleccionado } });
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 24 }}>
      <h2>Selecciona un cliente</h2>
      {loadingClientes ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ProgressSpinner style={{ width: '1.5rem', height: '1.5rem' }} strokeWidth="4" />
          <span>Cargando clientes...</span>
        </div>
      ) : (
        <Dropdown
          value={clienteSeleccionado}
          options={clientes}
          onChange={(e) => setClienteSeleccionado(e.value)}
          placeholder="Selecciona un cliente"
          className="p-fluid"
          filter
        />
      )}
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Button label="Cargar pedido" icon="pi pi-shopping-cart" disabled={!clienteSeleccionado} onClick={handleCargarPedido} />
        <Button label="Cargar cobro" icon="pi pi-dollar" disabled={!clienteSeleccionado} severity="success" outlined />
        <Button label="Ver estado de cuenta" icon="pi pi-list" disabled={!clienteSeleccionado} severity="info" outlined />
        <Button label="Registro de pedidos" icon="pi pi-book" disabled={!clienteSeleccionado} severity="help" outlined />
      </div>
    </div>
  );
} 