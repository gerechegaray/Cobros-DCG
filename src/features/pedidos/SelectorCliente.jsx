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

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: 32 }}>
      <h2 style={{ textAlign: "center" }}>Selecciona un cliente</h2>
      <ClienteDropdown value={cliente} onChange={e => setCliente(e.value)} />
      <Button
        label="Crear pedido"
        icon="pi pi-plus"
        style={{ marginTop: 24, width: "100%" }}
        disabled={!cliente}
        onClick={handleCrearPedido}
      />
    </div>
  );
} 