import React, { useEffect, useState, useRef } from "react";
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

function Reports({ user }) {
  const [cobros, setCobros] = useState([]);
  const [filteredCobros, setFilteredCobros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(null);
  const [selectedCobrador, setSelectedCobrador] = useState(null);
  const [selectedForma, setSelectedForma] = useState(null);
  const toast = useRef(null);

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

      const filteredData = user.role === "cobrador"
        ? data.filter(cobro => cobro.cobrador === user.name)
        : data;

      setCobros(filteredData);
      setFilteredCobros(filteredData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    let filtered = cobros;

    if (dateRange?.[0] && dateRange?.[1]) {
      filtered = filtered.filter(cobro => {
        const fecha = cobro.fecha?.toDate?.() || new Date(cobro.fecha?.seconds * 1000);
        return fecha >= dateRange[0] && fecha <= dateRange[1];
      });
    }

    if (selectedCobrador) {
      filtered = filtered.filter(cobro => cobro.cobrador === selectedCobrador);
    }

    if (selectedForma) {
      filtered = filtered.filter(cobro => cobro.forma === selectedForma);
    }

    setFilteredCobros(filtered);
  }, [cobros, dateRange, selectedCobrador, selectedForma]);

  const formatFecha = (rowData) => {
    if (!rowData.fecha) return "";
    const date = rowData.fecha.toDate ? rowData.fecha.toDate() : new Date(rowData.fecha.seconds * 1000);
    return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatMonto = (rowData) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS"
    }).format(rowData.monto || 0);
  };

  const exportToCSV = () => {
    if (filteredCobros.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Sin datos",
        detail: "No hay datos para exportar con los filtros actuales"
      });
      return;
    }

    const headers = ["Fecha", "Cliente", "Monto", "Cobrador", "Forma de Pago", "Cargado"];
    const csvData = filteredCobros.map(c => [
      formatFecha(c),
      c.cliente,
      formatMonto(c),
      c.cobrador,
      c.forma,
      c.cargado ? "Sí" : "No"
    ]);

    const content = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reporte_cobranzas_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.current.show({
      severity: "success",
      summary: "Exportado",
      detail: `Se exportaron ${filteredCobros.length} registros`
    });
  };

  const clearFilters = () => {
    setDateRange(null);
    setSelectedCobrador(null);
    setSelectedForma(null);
  };

  const stats = {
    total: filteredCobros.length,
    montoTotal: filteredCobros.reduce((sum, c) => sum + (c.monto || 0), 0),
    cargadas: filteredCobros.filter(c => c.cargado).length,
    pendientes: filteredCobros.filter(c => !c.cargado).length
  };

  return (
    <div className="p-p-2 p-p-md-3 p-p-lg-4" style={{ maxWidth: "100%", margin: "0 auto" }}>
      <Toast ref={toast} />

      <Card className="p-fluid">
        {/* Título y botones */}
        <div className="p-d-flex p-jc-between p-ai-center p-flex-column p-flex-md-row p-mb-3">
          <h2 style={{ color: "#1f2937" }}>
            {user.role === "admin" ? "Reportes y Exportación" : "Mis Reportes"}
          </h2>
          <div className="p-d-flex p-gap-2 p-mt-2 p-flex-wrap p-jc-center">
            <Button label="Limpiar" icon="pi pi-times" className="p-button-outlined p-button-sm" onClick={clearFilters} />
            <Button label="Exportar CSV" icon="pi pi-download" className="p-button-success p-button-sm" onClick={exportToCSV} />
          </div>
        </div>

        {/* Filtros */}
        <div className="p-p-3 p-surface-100 p-border-round p-border-1 p-mb-3">
          <div className="p-grid p-fluid">
            <div className="p-col-12 p-md-6 p-lg-4">
              <label>Rango de fechas</label>
              <Calendar 
                value={dateRange}
                onChange={(e) => setDateRange(e.value)}
                selectionMode="range"
                dateFormat="dd/mm/yy"
                showIcon
                placeholder="Selecciona fechas"
              />
            </div>
            {user.role === "admin" && (
              <div className="p-col-12 p-md-6 p-lg-4">
                <label>Cobrador</label>
                <Dropdown 
                  value={selectedCobrador}
                  options={cobradores}
                  onChange={(e) => setSelectedCobrador(e.value)}
                  placeholder="Selecciona cobrador"
                />
              </div>
            )}
            <div className="p-col-12 p-md-6 p-lg-4">
              <label>Forma de pago</label>
              <Dropdown 
                value={selectedForma}
                options={formasDeCobro}
                onChange={(e) => setSelectedForma(e.value)}
                placeholder="Selecciona forma de pago"
              />
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="p-grid p-fluid p-mb-3">
          {[
            { title: "Total registros", value: stats.total, color: "#2563eb" },
            { title: "Monto total", value: formatMonto({ monto: stats.montoTotal }), color: "#059669" },
            { title: "Cargadas", value: stats.cargadas, color: "#22c55e" },
            { title: "Pendientes", value: stats.pendientes, color: "#ef4444" }
          ].map((s, i) => (
            <div key={i} className="p-col-12 p-md-6 p-lg-3">
              <Card className="p-text-center p-p-3">
                <h3 style={{ color: s.color }}>{s.value}</h3>
                <p style={{ color: "#6b7280" }}>{s.title}</p>
              </Card>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <DataTable 
          value={filteredCobros}
          paginator
          rows={8}
          responsiveLayout="stack"
          emptyMessage="No hay cobranzas registradas."
          className="p-datatable-sm p-fluid"
        >
          <Column field="fecha" header="Fecha" body={formatFecha} style={colStyle} headerStyle={colStyle} />
          <Column field="cliente" header="Cliente" style={colStyle} headerStyle={colStyle} />
          <Column field="monto" header="Monto" body={formatMonto} style={colStyle} headerStyle={colStyle} />
          <Column field="cobrador" header="Cobrador" style={colStyle} headerStyle={colStyle} />
          <Column field="forma" header="Forma de Pago" style={colStyle} headerStyle={colStyle} />
          <Column field="cargado" header="Cargado" body={(row) => (
            <Tag value={row.cargado ? "Sí" : "No"} severity={row.cargado ? "success" : "danger"} />
          )} style={colStyle} headerStyle={colStyle} />
        </DataTable>
      </Card>
    </div>
  );
}

const colStyle = { wordWrap: "break-word", whiteSpace: "normal" };

export default Reports;
