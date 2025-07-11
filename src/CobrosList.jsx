import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Card } from "primereact/card";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import { Toast } from "primereact/toast";
import { useRef } from "react";

function CobrosList({ user, showOnlyMyCobros = false, onNavigateToDashboard }) {
  const [cobros, setCobros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const toast = useRef(null);
  const [filters, setFilters] = useState({
    fecha: { value: null, matchMode: FilterMatchMode.DATE_IS },
    cobrador: { value: null, matchMode: FilterMatchMode.EQUALS },
    forma: { value: null, matchMode: FilterMatchMode.EQUALS },
    cliente: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  // Opciones para los filtros
  const cobradores = [
    { label: "Todos", value: null },
    { label: "Mariano", value: "Mariano" },
    { label: "Ruben", value: "Ruben" },
    { label: "Diego", value: "Diego" },
    { label: "Guille", value: "Guille" },
    { label: "Santi", value: "Santi" },
    { label: "German", value: "German" },
  ];

  const formasDeCobro = [
    { label: "Todos", value: null },
    // Nuevas formas de pago
    { label: "Efectivo", value: "Efectivo" },
    { label: "Mercado Pago", value: "Mercado Pago" },
    { label: "Transferencia DCG", value: "Transferencia DCG" },
    { label: "Transferencia Santander", value: "Transferencia Santander" },
    { label: "Transferencia Galicia DCG", value: "Transferencia Galicia DCG" },
    { label: "Alleata", value: "Alleata" },
    // Formas de pago antiguas para compatibilidad
    { label: "Transferencia", value: "Transferencia" },
    { label: "Cheque", value: "Cheque" },
    { label: "Otro", value: "Otro" },
  ];

  const meses = [
    { label: "Todos los meses", value: null },
    { label: "Enero", value: 0 },
    { label: "Febrero", value: 1 },
    { label: "Marzo", value: 2 },
    { label: "Abril", value: 3 },
    { label: "Mayo", value: 4 },
    { label: "Junio", value: 5 },
    { label: "Julio", value: 6 },
    { label: "Agosto", value: 7 },
    { label: "Septiembre", value: 8 },
    { label: "Octubre", value: 9 },
    { label: "Noviembre", value: 10 },
    { label: "Diciembre", value: 11 },
  ];

  useEffect(() => {
    const q = query(collection(db, "cobranzas"), orderBy("fecha", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      // Filtrar solo los cobros del usuario si showOnlyMyCobros es true
      let filteredData = data;
      if (showOnlyMyCobros && user) {
        filteredData = data.filter(cobro => cobro.cobrador === user.name);
      }
      
      setCobros(filteredData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [showOnlyMyCobros, user]);

  // Formatear fecha
  const formatFecha = (rowData) => {
    if (!rowData.fecha) return "";
    const date = rowData.fecha.toDate ? rowData.fecha.toDate() : new Date(rowData.fecha.seconds * 1000);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Formatear moneda
  const formatMonto = (rowData) => {
    if (!rowData.monto) return "";
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(rowData.monto);
  };

  // Actualizar estado de cargado en sistema
  const updateCargadoStatus = async (cobroId, newStatus) => {
    setUpdatingId(cobroId);
    try {
      const cobroRef = doc(db, "cobranzas", cobroId);
      await updateDoc(cobroRef, {
        cargado: newStatus
      });
      toast.current.show({ 
        severity: 'success', 
        summary: 'Actualizado', 
        detail: `Estado actualizado a: ${newStatus ? 'Cargado' : 'No cargado'}` 
      });
    } catch (error) {
      toast.current.show({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'Error al actualizar el estado' 
      });
    } finally {
      setUpdatingId(null);
    }
  };

  console.log(user);
  
  // Template para el estado cargado con botones de edición
  const cargadoTemplate = (rowData) => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <Tag 
        value={rowData.cargado ? "Sí" : "No"} 
        severity={rowData.cargado ? "success" : "danger"} 
      />
      {user?.role === "admin" && (
        <Button
          icon={rowData.cargado ? "pi pi-times" : "pi pi-check"}
          className={rowData.cargado ? "p-button-danger p-button-sm" : "p-button-success p-button-sm"}
          size="small"
          loading={updatingId === rowData.id}
          onClick={() => updateCargadoStatus(rowData.id, !rowData.cargado)}
          tooltip={rowData.cargado ? "Marcar como no cargado" : "Marcar como cargado"}
          tooltipOptions={{ position: "top" }}
        />
      )}
    </div>
  );

  // Limpiar todos los filtros
  const clearFilters = () => {
    setFilters({
      fecha: { value: null, matchMode: FilterMatchMode.DATE_IS },
      cobrador: { value: null, matchMode: FilterMatchMode.EQUALS },
      forma: { value: null, matchMode: FilterMatchMode.EQUALS },
      cliente: { value: null, matchMode: FilterMatchMode.CONTAINS },
    });
  };

  // Template para el header con filtros
  const headerTemplate = () => (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ margin: 0, color: "#1f2937" }}>
            {showOnlyMyCobros ? "Mis Cobranzas" : "Lista de Cobranzas"}
          </h2>
          <p style={{ margin: "0.5rem 0 0 0", color: "#6b7280" }}>
            {showOnlyMyCobros 
              ? `Total: ${cobros.length} cobranzas realizadas por ${user?.name}` 
              : `Total: ${cobros.length} cobranzas registradas`
            }
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {showOnlyMyCobros && (
            <Button 
              label="Volver al Dashboard" 
              icon="pi pi-arrow-left" 
              className="p-button-secondary"
              onClick={() => onNavigateToDashboard && onNavigateToDashboard()}
            />
          )}
          <Button 
            label="Limpiar Filtros" 
            icon="pi pi-times" 
            className="p-button-outlined"
            onClick={clearFilters}
          />
        </div>
      </div>

      {/* Filtros */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: "1rem",
        padding: "1rem",
        backgroundColor: "#f9fafb",
        borderRadius: "8px",
        border: "1px solid #e5e7eb"
      }}>
        {/* Filtro por fecha específica */}
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
            Fecha específica
          </label>
          <Calendar 
            value={filters.fecha.value} 
            onChange={(e) => setFilters({...filters, fecha: {...filters.fecha, value: e.value}})}
            dateFormat="dd/mm/yy" 
            showIcon 
            placeholder="Selecciona fecha"
            style={{ width: "100%" }}
          />
        </div>

        {/* Filtro por cobrador */}
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
            Cobrador
          </label>
          <Dropdown 
            value={filters.cobrador.value} 
            options={cobradores} 
            onChange={(e) => setFilters({...filters, cobrador: {...filters.cobrador, value: e.value}})}
            placeholder="Selecciona cobrador"
            style={{ width: "100%" }}
          />
        </div>

        {/* Filtro por forma de pago */}
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
            Método de pago
          </label>
          <Dropdown 
            value={filters.forma.value} 
            options={formasDeCobro} 
            onChange={(e) => setFilters({...filters, forma: {...filters.forma, value: e.value}})}
            placeholder="Selecciona método"
            style={{ width: "100%" }}
          />
        </div>

        {/* Filtro por cliente */}
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
            Cliente
          </label>
          <InputText 
            value={filters.cliente.value || ""} 
            onChange={(e) => setFilters({...filters, cliente: {...filters.cliente, value: e.target.value}})}
            placeholder="Buscar por cliente"
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
      <Toast ref={toast} />
      
      <Card>
        <DataTable 
          value={cobros} 
          paginator 
          rows={10} 
          responsiveLayout="scroll" 
          emptyMessage="No hay cobranzas cargadas."
          loading={loading}
          header={headerTemplate()}
          style={{ minHeight: "400px" }}
          stripedRows
          showGridlines
          filters={filters}
          filterDisplay="menu"
          globalFilterFields={['cliente', 'cobrador', 'forma']}
        >
          <Column 
            field="fecha" 
            header="Fecha" 
            body={formatFecha}
            style={{ minWidth: "100px" }}
            filter
            filterElement={
              <Calendar 
                value={filters.fecha.value} 
                onChange={(e) => setFilters({...filters, fecha: {...filters.fecha, value: e.value}})}
                dateFormat="dd/mm/yy" 
                showIcon 
              />
            }
          />
          <Column 
            field="cliente" 
            header="Cliente"
            style={{ minWidth: "150px" }}
            filter
            filterElement={
              <InputText 
                value={filters.cliente.value || ""} 
                onChange={(e) => setFilters({...filters, cliente: {...filters.cliente, value: e.target.value}})}
                placeholder="Buscar cliente"
              />
            }
          />
          <Column 
            field="monto" 
            header="Monto" 
            body={formatMonto}
            style={{ minWidth: "120px" }}
          />
          <Column 
            field="cobrador" 
            header="Quién cobró"
            style={{ minWidth: "120px" }}
            filter
            filterElement={
              <Dropdown 
                value={filters.cobrador.value} 
                options={cobradores} 
                onChange={(e) => setFilters({...filters, cobrador: {...filters.cobrador, value: e.value}})}
                placeholder="Selecciona cobrador"
              />
            }
          />
          <Column 
            field="forma" 
            header="Forma de cobro"
            style={{ minWidth: "150px" }}
            filter
            filterElement={
              <Dropdown 
                value={filters.forma.value} 
                options={formasDeCobro} 
                onChange={(e) => setFilters({...filters, forma: {...filters.forma, value: e.value}})}
                placeholder="Selecciona método"
              />
            }
          />
          <Column 
            field="cargado" 
            header="¿Cargado en el sistema?" 
            body={cargadoTemplate}
            style={{ minWidth: "180px" }}
          />
        </DataTable>
      </Card>
    </div>
  );
}

export default CobrosList;