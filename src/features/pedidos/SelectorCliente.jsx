import React, { useEffect, useState } from "react";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { ProgressSpinner } from "primereact/progressspinner";
import { getClientesCatalogo } from '../../services/firebase';
import { useNavigate } from "react-router-dom";

export default function SelectorCliente() {
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchClientes() {
      try {
        const data = await getClientesCatalogo();
        const options = data
          .slice()
          .sort((a, b) => (a['Razón Social'] || '').localeCompare(b['Razón Social'] || ''))
          .map((c) => ({ label: c['Razón Social'] || '(Sin nombre)', value: c }));
        setClientes(options);
      } catch (error) {
        console.error('Error al obtener clientes de Firestore:', error);
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

  const handleCargarCobro = () => {
    if (clienteSeleccionado) {
      navigate('/cargar-cobro', { state: { cliente: clienteSeleccionado } });
    }
  };

  const handleEstadoCuenta = () => {
    if (clienteSeleccionado) {
      navigate('/estado-cuenta', { state: { cliente: clienteSeleccionado } });
    }
  };

  const handleRegistroPedidos = () => {
    if (clienteSeleccionado) {
      navigate('/lista-pedidos', { state: { cliente: clienteSeleccionado } });
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
        <Button label="Cargar cobro" icon="pi pi-dollar" disabled={!clienteSeleccionado} severity="success" outlined onClick={handleCargarCobro} />
        <Button label="Estado de cuenta" icon="pi pi-file" disabled={!clienteSeleccionado} severity="info" outlined onClick={handleEstadoCuenta} />
        <Button label="Registro de pedidos" icon="pi pi-book" disabled={!clienteSeleccionado} severity="help" outlined onClick={handleRegistroPedidos} />
      </div>
    </div>
  );
} 