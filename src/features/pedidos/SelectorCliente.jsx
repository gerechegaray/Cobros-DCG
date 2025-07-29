import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { ProgressSpinner } from "primereact/progressspinner";

export default function SelectorCliente({ user }) {
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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
        console.log('[SelectorCliente] Iniciando fetch de clientes...');
        const res = await fetch("/api/clientes-firebase");
        console.log('[SelectorCliente] Response status:', res.status);
        
        if (!res.ok) {
          throw new Error(`Error al obtener clientes: ${res.status} ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log('[SelectorCliente] Clientes obtenidos:', data.length);
        console.log('[SelectorCliente] Primer cliente:', data[0]);
        console.log('[SelectorCliente] Rol del usuario:', user?.role);
        
        // Filtrar clientes según el rol del usuario
        const sellerId = getSellerId();
        console.log('[SelectorCliente] SellerId obtenido:', sellerId);
        let clientesFiltrados = data;
        
        if (sellerId !== null) {
          // Filtrar por sellerId específico - el seller es un objeto con id
          clientesFiltrados = data.filter(cliente => {
            if (cliente.seller && cliente.seller.id) {
              return cliente.seller.id === sellerId.toString();
            }
            return false;
          });
          console.log(`[SelectorCliente] Filtrando por sellerId ${sellerId}: ${clientesFiltrados.length} clientes`);
        } else if (user?.role === 'admin') {
          // Admin ve todos los clientes
          clientesFiltrados = data;
          console.log(`[SelectorCliente] Admin ve todos los clientes: ${clientesFiltrados.length}`);
        } else {
          // Usuario sin rol válido - no mostrar clientes
          clientesFiltrados = [];
          console.log('[SelectorCliente] Usuario sin rol válido - no se muestran clientes');
        }
        
        setClientes(clientesFiltrados);
      } catch (e) {
        console.error('[SelectorCliente] Error al obtener clientes:', e);
        setError(e.message);
        setClientes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchClientes();
  }, [user]);

  const handleCrearPedido = () => {
    if (cliente) {
      setLoading(true);
      navigate("/presupuestos/new", { state: { cliente: cliente.id } });
    }
  };

  const handleCargarCobro = () => {
    if (cliente) {
      setLoading(true);
      navigate("/list/new", { state: { cliente: cliente.id } });
    }
  };

  const handleEstadoCuenta = () => {
    if (cliente) {
      setLoading(true);
      navigate("/estado-cuenta", { state: { cliente: cliente } });
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "50vh",
        gap: "1rem"
      }}>
        <ProgressSpinner />
        <p>Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: 'red', padding: '1rem', textAlign: 'center' }}>
        Error al cargar clientes: {error}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: 32 }}>
      <h2 style={{ textAlign: "center" }}>Selecciona un cliente</h2>
      
      {/* Dropdown simplificado */}
      <select 
        value={cliente ? cliente.id : ''} 
        onChange={(e) => {
          const selectedCliente = clientes.find(c => c.id === parseInt(e.target.value));
          setCliente(selectedCliente);
        }}
        style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
      >
        <option value="">Selecciona un cliente</option>
        {clientes.map(cliente => (
          <option key={cliente.id} value={cliente.id}>
            {cliente.name}
          </option>
        ))}
      </select>

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