import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { useRef } from "react";

function Reports({ user }) {
  const [cobros, setCobros] = useState([]);
  const [filteredCobros, setFilteredCobros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(null);
  const [selectedCobrador, setSelectedCobrador] = useState(null);
  const [selectedForma, setSelectedForma] = useState(null);
  const toast = useRef(null);

  // Opciones para filtros
  const cobradores = [
    { label: "Todos los cobradores", value: null },
    { label: "Mariano", value: "Mariano" },
    { label: "Ruben", value: "Ruben" },
    { label: "Diego", value: "Diego" },
    { label: "Guille", value: "Guille" },
    { label: "Santi", value: "Santi" },
    { label: "German", value: "German" },
  ];

  const formasDeCobro = [
    { label: "Todas las formas", value: null },
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

  useEffect(() => {
    const q = query(collection(db, "cobranzas"), orderBy("fecha", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      // Filtrar según el rol del usuario
      let filteredData = data;
      if (user.role === "cobrador") {
        filteredData = data.filter(cobro => cobro.cobrador === user.name);
      }

      setCobros(filteredData);
      setFilteredCobros(filteredData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = cobros;

    // Filtro por rango de fechas
    if (dateRange && dateRange[0] && dateRange[1]) {
      filtered = filtered.filter(cobro => {
        const fechaCobro = cobro.fecha.toDate ? cobro.fecha.toDate() : new Date(cobro.fecha.seconds * 1000);
        return fechaCobro >= dateRange[0] && fechaCobro <= dateRange[1];
      });
    }

    // Filtro por cobrador
    if (selectedCobrador) {
      filtered = filtered.filter(cobro => cobro.cobrador === selectedCobrador);
    }

    // Filtro por forma de pago
    if (selectedForma) {
      filtered = filtered.filter(cobro => cobro.forma === selectedForma);
    }

    setFilteredCobros(filtered);
  }, [cobros, dateRange, selectedCobrador, selectedForma]);

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

  // Template para estado cargado
  const cargadoTemplate = (rowData) => (
    <Tag 
      value={rowData.cargado ? "Sí" : "No"} 
      severity={rowData.cargado ? "success" : "danger"} 
    />
  );

  // Calcular estadísticas
  const stats = {
    total: filteredCobros.length,
    montoTotal: filteredCobros.reduce((sum, cobro) => sum + (cobro.monto || 0), 0),
    cargadas: filteredCobros.filter(cobro => cobro.cargado).length,
    pendientes: filteredCobros.filter(cobro => !cobro.cargado).length
  };

  // Exportar a CSV
  const exportToCSV = () => {
    if (filteredCobros.length === 0) {
      toast.current.show({
        severity: 'warn',
        summary: 'Sin datos',
        detail: 'No hay datos para exportar con los filtros actuales'
      });
      return;
    }

    const headers = ['Fecha', 'Cliente', 'Monto', 'Cobrador', 'Forma de Pago', 'Cargado en Sistema'];
    const csvData = filteredCobros.map(cobro => [
      formatFecha(cobro),
      cobro.cliente,
      formatMonto(cobro),
      cobro.cobrador,
      cobro.forma,
      cobro.cargado ? 'Sí' : 'No'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_cobranzas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.current.show({
      severity: 'success',
      summary: 'Exportado',
      detail: `Se exportaron ${filteredCobros.length} registros`
    });
  };

  // Limpiar filtros
  const clearFilters = () => {
    setDateRange(null);
    setSelectedCobrador(null);
    setSelectedForma(null);
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
      <Toast ref={toast} />
      
      <Card>
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0, color: "#1f2937" }}>
              {user.role === "admin" ? "Reportes y Exportación" : "Mis Reportes"}
            </h2>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button 
                label="Limpiar Filtros" 
                icon="pi pi-times" 
                className="p-button-outlined"
                onClick={clearFilters}
              />
              <Button 
                label="Exportar CSV" 
                icon="pi pi-download" 
                className="p-button-success"
                onClick={exportToCSV}
                disabled={filteredCobros.length === 0}
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
            {/* Rango de fechas */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                Rango de fechas
              </label>
              <Calendar 
                value={dateRange} 
                onChange={(e) => setDateRange(e.value)} 
                selectionMode="range"
                dateFormat="dd/mm/yy" 
                showIcon 
                placeholder="Selecciona fechas"
                style={{ width: "100%" }}
              />
            </div>

            {/* Filtro por cobrador - Solo para admin */}
            {user.role === "admin" && (
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                  Cobrador
                </label>
                <Dropdown 
                  value={selectedCobrador} 
                  options={cobradores} 
                  onChange={(e) => setSelectedCobrador(e.value)} 
                  placeholder="Selecciona cobrador"
                  style={{ width: "100%" }}
                />
              </div>
            )}

            {/* Filtro por forma de pago */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                Forma de pago
              </label>
              <Dropdown 
                value={selectedForma} 
                options={formasDeCobro} 
                onChange={(e) => setSelectedForma(e.value)} 
                placeholder="Selecciona forma de pago"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", 
            gap: "1rem",
            marginTop: "1rem"
          }}>
            <Card style={{ textAlign: "center", padding: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.5rem", color: "#2563eb" }}>{stats.total}</h3>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>Total registros</p>
            </Card>
            <Card style={{ textAlign: "center", padding: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.5rem", color: "#059669" }}>
                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(stats.montoTotal)}
              </h3>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>Monto total</p>
            </Card>
            <Card style={{ textAlign: "center", padding: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.5rem", color: "#22c55e" }}>{stats.cargadas}</h3>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>Cargadas</p>
            </Card>
            <Card style={{ textAlign: "center", padding: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.5rem", color: "#ef4444" }}>{stats.pendientes}</h3>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>Pendientes</p>
            </Card>
          </div>
        </div>

        {/* Tabla de datos */}
        <DataTable 
          value={filteredCobros} 
          paginator 
          rows={10} 
          responsiveLayout="scroll" 
          emptyMessage="No hay datos para mostrar con los filtros actuales."
          loading={loading}
          style={{ minHeight: "400px" }}
          stripedRows
          showGridlines
        >
          <Column 
            field="fecha" 
            header="Fecha" 
            body={formatFecha}
            style={{ minWidth: "100px" }}
          />
          <Column 
            field="cliente" 
            header="Cliente"
            style={{ minWidth: "150px" }}
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
          />
          <Column 
            field="forma" 
            header="Forma de cobro"
            style={{ minWidth: "150px" }}
          />
          <Column 
            field="cargado" 
            header="¿Cargado en el sistema?" 
            body={cargadoTemplate}
            style={{ minWidth: "150px" }}
          />
        </DataTable>
      </Card>
    </div>
  );
}

export default Reports; 