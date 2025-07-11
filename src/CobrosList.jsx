import React, { useEffect, useState, useRef } from "react";
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
    cargado: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

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
    { label: "Efectivo", value: "Efectivo" },
    { label: "Mercado Pago", value: "Mercado Pago" },
    { label: "Transferencia DCG", value: "Transferencia DCG" },
    { label: "Transferencia Santander", value: "Transferencia Santander" },
    { label: "Transferencia Galicia DCG", value: "Transferencia Galicia DCG" },
    { label: "Alleata", value: "Alleata" },
    { label: "Transferencia", value: "Transferencia" },
    { label: "Cheque", value: "Cheque" },
    { label: "Otro", value: "Otro" },
  ];

  const estadoCarga = [
    { label: "Todos", value: null },
    { label: "Cargados", value: true },
    { label: "No cargados", value: false },
  ];

  useEffect(() => {
    const q = query(collection(db, "cobranzas"), orderBy("fecha", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      console.log("Todos los cobros cargados:", data.length);
      console.log("Usuario actual:", user);
      console.log("Rol del usuario:", user?.role);
      console.log("Nombre del usuario:", user?.name);

      let filteredData = data;
      // Filtrar según el rol del usuario
      if (showOnlyMyCobros && user) {
        if (user.role === "Santi" || user.role === "Guille") {
          // Santi y Guille solo ven sus propios cobros
          filteredData = data.filter(cobro => cobro.cobrador === user.role);
          console.log("Filtrando por cobrador:", user.role);
          console.log("Cobros filtrados:", filteredData.length);
        } else if (user.role === "admin") {
          // Admin ve todos los cobros
          filteredData = data;
          console.log("Admin - mostrando todos los cobros");
        }
      } else if (user && (user.role === "Santi" || user.role === "Guille")) {
        // En vista general, Santi y Guille solo ven sus propios cobros
        filteredData = data.filter(cobro => cobro.cobrador === user.role);
        console.log("Vista general - filtrando por cobrador:", user.role);
        console.log("Cobros filtrados:", filteredData.length);
      }

      setCobros(filteredData);
      setLoading(false);
    }, (error) => {
      console.error("Error al cargar cobranzas:", error);
      toast.current?.show({ 
        severity: 'error', 
        summary: 'Error', 
        detail: `Error al cargar datos: ${error.message}` 
      });
      setLoading(false);
    });
    return () => unsubscribe();
  }, [showOnlyMyCobros, user]);

  const formatFecha = (rowData) => {
    if (!rowData.fecha) return "";
    const date = rowData.fecha.toDate ? rowData.fecha.toDate() : new Date(rowData.fecha.seconds * 1000);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatMonto = (rowData) => {
    if (!rowData.monto) return "";
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(rowData.monto);
  };

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
      console.error("Error al actualizar estado:", error);
      toast.current.show({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'Error al actualizar el estado' 
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const cargadoTemplate = (rowData) => (
    <div className="flex align-items-center gap-2">
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

  const clearFilters = () => {
    setFilters({
      fecha: { value: null, matchMode: FilterMatchMode.DATE_IS },
      cobrador: { value: null, matchMode: FilterMatchMode.EQUALS },
      forma: { value: null, matchMode: FilterMatchMode.EQUALS },
      cliente: { value: null, matchMode: FilterMatchMode.CONTAINS },
      cargado: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
  };

  const headerTemplate = () => (
    <div className="mb-3">
      <div className="flex flex-column md:flex-row justify-content-between align-items-center mb-3 gap-2">
        <div className="text-center md:text-left">
          <h2 className="m-0 text-lg md:text-xl" style={{ color: "#1f2937" }}>
            {showOnlyMyCobros ? "Mis Cobranzas" : "Lista de Cobranzas"}
          </h2>
          <p className="mt-1 mb-0 text-sm" style={{ color: "#6b7280" }}>
            {showOnlyMyCobros 
              ? `Total: ${cobros.length} cobranzas realizadas por ${user?.name}` 
              : `Total: ${cobros.length} cobranzas registradas`
            }
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-content-center">
          {showOnlyMyCobros && (
            <Button 
              label="Volver" 
              icon="pi pi-arrow-left" 
              className="p-button-secondary p-button-sm"
              onClick={() => onNavigateToDashboard && onNavigateToDashboard()}
            />
          )}
          <Button 
            label="Limpiar" 
            icon="pi pi-times" 
            className="p-button-outlined p-button-sm"
            onClick={clearFilters}
          />
        </div>
      </div>

      <div className="p-2 surface-100 border-round border-1" style={{ borderColor: "#e5e7eb" }}>
        <div className="grid">
          <div className="col-12 md:col-6 lg:col-3">
            <label className="block mb-1 text-sm font-medium" style={{ color: "#374151" }}>
              Fecha específica
            </label>
            <Calendar 
              value={filters.fecha.value} 
              onChange={(e) => setFilters({...filters, fecha: {...filters.fecha, value: e.value}})}
              dateFormat="dd/mm/yy" 
              showIcon 
              placeholder="Selecciona fecha"
              className="w-full"
            />
          </div>
          <div className="col-12 md:col-6 lg:col-3">
            <label className="block mb-1 text-sm font-medium" style={{ color: "#374151" }}>
              Cobrador
            </label>
            <Dropdown 
              value={filters.cobrador.value} 
              options={cobradores} 
              onChange={(e) => setFilters({...filters, cobrador: {...filters.cobrador, value: e.value}})}
              placeholder="Selecciona cobrador"
              className="w-full"
            />
          </div>
          <div className="col-12 md:col-6 lg:col-3">
            <label className="block mb-1 text-sm font-medium" style={{ color: "#374151" }}>
              Método de pago
            </label>
            <Dropdown 
              value={filters.forma.value} 
              options={formasDeCobro} 
              onChange={(e) => setFilters({...filters, forma: {...filters.forma, value: e.value}})}
              placeholder="Selecciona método"
              className="w-full"
            />
          </div>
          <div className="col-12 md:col-6 lg:col-3">
            <label className="block mb-1 text-sm font-medium" style={{ color: "#374151" }}>
              Cliente
            </label>
            <InputText 
              value={filters.cliente.value || ""} 
              onChange={(e) => setFilters({...filters, cliente: {...filters.cliente, value: e.target.value}})}
              placeholder="Buscar por cliente"
              className="w-full"
            />
          </div>
          <div className="col-12 md:col-6 lg:col-3">
            <label className="block mb-1 text-sm font-medium" style={{ color: "#374151" }}>
              Estado de carga
            </label>
            <Dropdown 
              value={filters.cargado.value} 
              options={estadoCarga} 
              onChange={(e) => setFilters({...filters, cargado: {...filters.cargado, value: e.value}})}
              placeholder="Selecciona estado"
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-2 px-3 md:p-3 lg:p-4" style={{ width: "100%", margin: "0 auto", boxSizing: "border-box", overflowX: "auto" }}>
      <Toast ref={toast} />
      <Card className="p-fluid" style={{ overflowX: "auto", width: "100%" }}>
        <DataTable 
          value={cobros} 
          paginator 
          rows={10} 
          emptyMessage="No hay cobranzas cargadas."
          loading={loading}
          header={headerTemplate()}
          className="p-fluid"
          stripedRows
          showGridlines
          filters={filters}
          filterDisplay="menu"
          globalFilterFields={['cliente', 'cobrador', 'forma']}
          responsiveLayout="stack"
          style={{ width: "100%" }}
        >
          <Column field="fecha" header="Fecha" body={formatFecha} />
          <Column field="cliente" header="Cliente" />
          <Column field="monto" header="Monto" body={formatMonto} />
          <Column field="cobrador" header="Quién cobró" />
          <Column field="forma" header="Forma de cobro" />
          <Column field="cargado" header="¿Cargado en el sistema?" body={cargadoTemplate} />
        </DataTable>
      </Card>
    </div>
  );
}

export default CobrosList;
