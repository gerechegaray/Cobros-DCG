import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { ProgressSpinner } from "primereact/progressspinner";
import { Dropdown } from "primereact/dropdown";
import { api } from "../../services/api";

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
        const data = await api.getClientesFirebase();
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
        
        // 🆕 Ordenar clientes alfabéticamente y convertir a formato para dropdown
        const clientesOrdenados = clientesFiltrados
          .sort((a, b) => {
            const nombreA = a.name || a.nombre || a['Razón Social'] || '';
            const nombreB = b.name || b.nombre || b['Razón Social'] || '';
            return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
          })
          .map(cliente => ({
            label: cliente.name || cliente.nombre || cliente['Razón Social'] || cliente.id || '(Sin nombre)',
            value: cliente
          }));
        
        setClientes(clientesOrdenados);
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
    if (cliente && cliente.value && cliente.value.id) {
      setLoading(true);
      // 🆕 Pasar el ID del cliente para que aparezca pre-seleccionado
      navigate("/presupuestos/new", { state: { cliente: cliente.value.id } });
    } else {
      console.error('[SelectorCliente] Cliente no válido:', cliente);
    }
  };

  const handleCargarCobro = () => {
    if (cliente && cliente.label) {
      setLoading(true);
      // 🆕 Pasar el nombre del cliente para que aparezca pre-seleccionado
      navigate("/list/new", { state: { cliente: cliente.label } });
    } else {
      console.error('[SelectorCliente] Cliente no válido para cobro:', cliente);
    }
  };

  const handleEstadoCuenta = () => {
    if (cliente && cliente.value) {
      setLoading(true);
      // 🆕 Pasar el cliente completo para el estado de cuenta
      navigate("/estado-cuenta", { state: { cliente: cliente.value } });
    } else {
      console.error('[SelectorCliente] Cliente no válido para estado de cuenta:', cliente);
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
      
      {/* 🆕 Dropdown mejorado con búsqueda */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ 
          display: "block", 
          marginBottom: "0.5rem", 
          fontWeight: "500", 
          color: "#374151" 
        }}>
          Cliente
        </label>
        <Dropdown
          value={cliente}
          options={clientes}
          onChange={(e) => {
            console.log('[SelectorCliente] Cliente seleccionado:', e.value);
            setCliente(e.value);
          }}
          optionLabel="label"
          placeholder="Selecciona un cliente"
          filter
          filterPlaceholder="Buscar cliente..."
          showClear
          className="w-full"
          style={{ width: "100%" }}
        />
      </div>

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