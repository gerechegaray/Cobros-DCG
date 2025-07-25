import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ClienteDropdown from "../../components/ClienteDropdown";
import { Button } from "primereact/button";

export default function SelectorCliente() {
  const [cliente, setCliente] = useState(null);
  const navigate = useNavigate();

  const handleCrearPedido = () => {
    if (cliente) {
      navigate("/presupuestos/nuevo", { state: { cliente: cliente.id } });
    }
  };

  const handleCargarCobro = () => {
    if (cliente) {
      navigate("/cargar-cobro", { state: { cliente: cliente.id } });
    }
  };

  const handleEstadoCuenta = () => {
    if (cliente) {
      navigate("/estado-cuenta", { state: { cliente: cliente } });
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: 32 }}>
      <h2 style={{ textAlign: "center" }}>Selecciona un cliente</h2>
      <ClienteDropdown value={cliente} onChange={e => setCliente(e.value)} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
        <Button
          label="Crear pedido"
          icon="pi pi-plus"
          style={{ width: "100%" }}
          disabled={!cliente}
          onClick={handleCrearPedido}
        />
        <Button
          label="Cargar cobro"
          icon="pi pi-wallet"
          style={{ width: "100%" }}
          disabled={!cliente}
          onClick={handleCargarCobro}
          className="p-button-success"
        />
        <Button
          label="Estado de Cuenta"
          icon="pi pi-credit-card"
          style={{ width: "100%" }}
          disabled={!cliente}
          onClick={handleEstadoCuenta}
          className="p-button-info"
        />
      </div>
    </div>
  );
} 