import React, { useEffect, useState, useRef } from "react";
import { db } from "../../services/firebase";
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
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Panel } from "primereact/panel";

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
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [viewMode, setViewMode] = useState('compact'); // 'compact' o 'detailed'
  const [groupByDate, setGroupByDate] = useState(true);

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
    <div className="flex align-items-center gap-3" style={{ minWidth: 120 }}>
      <Tag 
        value={rowData.cargado ? "Sí" : "No"} 
        severity={rowData.cargado ? "success" : "danger"} 
        style={{
          fontSize: '1.1rem',
          fontWeight: 700,
          padding: '0.5rem 1.2rem',
          borderRadius: 12,
          minWidth: 48,
          textAlign: 'center'
        }}
      />
      {user?.role === "admin" && (
        <Button
          icon={rowData.cargado ? "pi pi-times" : "pi pi-check"}
          className={rowData.cargado ? "p-button-rounded p-button-text p-button-danger p-button-sm" : "p-button-rounded p-button-text p-button-success p-button-sm"}
          style={{
            width: 36,
            height: 36,
            minWidth: 36,
            minHeight: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            boxShadow: 'none',
            border: 'none',
            marginLeft: 8
          }}
          size="small"
          loading={updatingId === rowData.id}
          onClick={() => {
            if (rowData.cargado) {
              confirmDialog({
                message: '¿Seguro que deseas marcar este cobro como NO cargado?',
                header: 'Confirmar cambio de estado',
                icon: 'pi pi-exclamation-triangle',
                accept: () => updateCargadoStatus(rowData.id, false)
              });
            } else {
              updateCargadoStatus(rowData.id, true);
            }
          }}
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

  // Calcular estadísticas
  const calculateStats = () => {
    const total = cobros.length;
    const totalAmount = cobros.reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
    const loadedCount = cobros.filter(cobro => cobro.cargado).length;
    const notLoadedCount = total - loadedCount;
    
    // Estadísticas por cobrador
    const statsByCobrador = {};
    cobros.forEach(cobro => {
      const cobrador = cobro.cobrador || 'Sin asignar';
      if (!statsByCobrador[cobrador]) {
        statsByCobrador[cobrador] = { count: 0, amount: 0 };
      }
      statsByCobrador[cobrador].count++;
      statsByCobrador[cobrador].amount += cobro.monto || 0;
    });

    return {
      total,
      totalAmount,
      loadedCount,
      notLoadedCount,
      statsByCobrador
    };
  };

  // Agrupar cobros por fecha
  const groupCobrosByDate = () => {
    const grouped = {};
    cobros.forEach(cobro => {
      const fecha = formatFecha(cobro);
      if (!grouped[fecha]) {
        grouped[fecha] = [];
      }
      grouped[fecha].push(cobro);
    });
    return grouped;
  };

  const stats = calculateStats();
  const groupedCobros = groupByDate ? groupCobrosByDate() : null;

  const headerTemplate = () => (
    <div className="mb-3">
      {/* Estadísticas principales */}
      <div className="grid mb-3">
        <div className="col-12 md:col-3">
          <Card className="text-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm opacity-90">Total Cobranzas</div>
          </Card>
        </div>
        <div className="col-12 md:col-3">
          <Card className="text-center" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <div className="text-2xl font-bold">{formatMonto({ monto: stats.totalAmount })}</div>
            <div className="text-sm opacity-90">Monto Total</div>
          </Card>
        </div>
        <div className="col-12 md:col-3">
          <Card className="text-center" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <div className="text-2xl font-bold">{stats.loadedCount}</div>
            <div className="text-sm opacity-90">Cargados</div>
          </Card>
        </div>
        <div className="col-12 md:col-3">
          <Card className="text-center" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <div className="text-2xl font-bold">{stats.notLoadedCount}</div>
            <div className="text-sm opacity-90">Pendientes</div>
          </Card>
        </div>
      </div>

      {/* Controles de vista */}
      <div className="flex flex-column md:flex-row justify-content-between align-items-center mb-3 gap-2">
        <div className="text-center md:text-left">
          <h2 className="m-0 text-lg md:text-xl" style={{ color: "#1f2937" }}>
            {showOnlyMyCobros ? "Mis Cobranzas" : "Lista de Cobranzas"}
          </h2>
          <p className="mt-1 mb-0 text-sm" style={{ color: "#6b7280" }}>
            {showOnlyMyCobros 
              ? `${stats.total} cobranzas realizadas por ${user?.name}` 
              : `${stats.total} cobranzas registradas`
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
            label={viewMode === 'compact' ? 'Vista Detallada' : 'Vista Compacta'}
            icon={viewMode === 'compact' ? 'pi pi-list' : 'pi pi-th-large'}
            className="p-button-outlined p-button-sm"
            onClick={() => setViewMode(viewMode === 'compact' ? 'detailed' : 'compact')}
          />
          <Button 
            label={groupByDate ? 'Sin Agrupar' : 'Agrupar por Fecha'}
            icon={groupByDate ? 'pi pi-calendar-times' : 'pi pi-calendar'}
            className="p-button-outlined p-button-sm"
            onClick={() => setGroupByDate(!groupByDate)}
          />
          <Button 
            label="Filtros" 
            icon={filtersVisible ? "pi pi-chevron-up" : "pi pi-filter"} 
            className="p-button-outlined p-button-sm"
            onClick={() => setFiltersVisible(!filtersVisible)}
          />
        </div>
      </div>

      {/* Filtros desplegables */}
      {filtersVisible && (
        <Card className="p-mb-3 p-shadow-2" style={{ borderRadius: 8, background: '#f8fafc' }}>
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
                style={{ borderRadius: "8px" }}
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
                style={{ borderRadius: "8px" }}
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
                style={{ borderRadius: "8px" }}
              />
            </div>
            <div className="col-12 md:col-6 lg:col-3">
              <label className="block mb-1 text-sm font-medium" style={{ color: "#374151" }}>
                Cliente
              </label>
              <InputText 
                value={filters.cliente.value || ''} 
                onChange={(e) => setFilters({...filters, cliente: {...filters.cliente, value: e.target.value}})}
                placeholder="Buscar por cliente"
                className="w-full"
                style={{ borderRadius: "8px" }}
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
                style={{ borderRadius: "8px" }}
              />
            </div>
          </div>
          <div className="flex justify-content-end mt-3">
            <Button 
              label="Limpiar filtros" 
              icon="pi pi-times" 
              className="p-button-outlined p-button-sm"
              onClick={clearFilters}
            />
          </div>
        </Card>
      )}
    </div>
  );

  return (
    <div className="p-2 px-3 md:p-3 lg:p-4" style={{ width: "100%", margin: "0 auto", boxSizing: "border-box", overflowX: "auto" }}>
      <Toast ref={toast} />
      <ConfirmDialog />
      
      {/* Header con título y botones para móvil */}
      <div className="cobros-header-mobile" style={{ display: 'none' }}>
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
                label="Filtros" 
                icon={filtersVisible ? "pi pi-chevron-up" : "pi pi-filter"} 
                className="p-button-outlined p-button-sm"
                onClick={() => setFiltersVisible(!filtersVisible)}
              />
            </div>
          </div>

          {/* Filtros desplegables para móvil */}
          {filtersVisible && (
            <Card className="p-mb-3 p-shadow-2" style={{ borderRadius: 8, background: '#f8fafc' }}>
              <div className="grid">
                <div className="col-12">
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
                    style={{ borderRadius: "8px" }}
                  />
                </div>
                <div className="col-12">
                  <label className="block mb-1 text-sm font-medium" style={{ color: "#374151" }}>
                    Cobrador
                  </label>
                  <Dropdown 
                    value={filters.cobrador.value} 
                    options={cobradores} 
                    onChange={(e) => setFilters({...filters, cobrador: {...filters.cobrador, value: e.value}})}
                    placeholder="Selecciona cobrador"
                    className="w-full"
                    style={{ borderRadius: "8px" }}
                  />
                </div>
                <div className="col-12">
                  <label className="block mb-1 text-sm font-medium" style={{ color: "#374151" }}>
                    Método de pago
                  </label>
                  <Dropdown 
                    value={filters.forma.value} 
                    options={formasDeCobro} 
                    onChange={(e) => setFilters({...filters, forma: {...filters.forma, value: e.value}})}
                    placeholder="Selecciona método"
                    className="w-full"
                    style={{ borderRadius: "8px" }}
                  />
                </div>
                <div className="col-12">
                  <label className="block mb-1 text-sm font-medium" style={{ color: "#374151" }}>
                    Cliente
                  </label>
                  <InputText 
                    value={filters.cliente.value || ''} 
                    onChange={(e) => setFilters({...filters, cliente: {...filters.cliente, value: e.target.value}})}
                    placeholder="Buscar por cliente"
                    className="w-full"
                    style={{ borderRadius: "8px" }}
                  />
                </div>
                <div className="col-12">
                  <label className="block mb-1 text-sm font-medium" style={{ color: "#374151" }}>
                    Estado de carga
                  </label>
                  <Dropdown 
                    value={filters.cargado.value} 
                    options={estadoCarga} 
                    onChange={(e) => setFilters({...filters, cargado: {...filters.cargado, value: e.value}})}
                    placeholder="Selecciona estado"
                    className="w-full"
                    style={{ borderRadius: "8px" }}
                  />
                </div>
              </div>
              <div className="flex justify-content-end mt-3">
                <Button 
                  label="Limpiar filtros" 
                  icon="pi pi-times" 
                  className="p-button-outlined p-button-sm"
                  onClick={clearFilters}
                />
              </div>
            </Card>
          )}
        </div>
      </div>

      <Card className="p-fluid" style={{ overflowX: "auto", width: "100%" }}>
        {/* Vista de lista compacta para móvil */}
        <div className="cobros-list-mobile" style={{ display: 'none' }}>
          {cobros.length === 0 && !loading && (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '1rem' }}>No hay cobranzas cargadas.</div>
          )}
          
          {/* Vista agrupada por fecha para móvil */}
          {groupByDate && groupedCobros ? (
            Object.entries(groupedCobros).map(([fecha, cobrosDelDia]) => {
              const totalDelDia = cobrosDelDia.reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
              const cargadosDelDia = cobrosDelDia.filter(cobro => cobro.cargado).length;
              
              return (
                <div key={fecha} className="mb-3">
                  <div className="p-2 mb-2" style={{ 
                    background: '#f8fafc', 
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div className="flex justify-content-between align-items-center">
                      <div>
                        <h5 className="m-0" style={{ color: '#1f2937', fontSize: '0.9rem', fontWeight: '600' }}>
                          {fecha}
                        </h5>
                        <p className="m-0 mt-1" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          {cobrosDelDia.length} cobranzas • {formatMonto({ monto: totalDelDia })} • {cargadosDelDia} cargados
                        </p>
                      </div>
                      <Tag 
                        value={`${cargadosDelDia}/${cobrosDelDia.length}`}
                        severity={cargadosDelDia === cobrosDelDia.length ? 'success' : 'warning'}
                        style={{ fontSize: '0.7rem', fontWeight: '600' }}
                      />
                    </div>
                  </div>
                  
                  <div className="cobros-list-items-mobile">
                    {cobrosDelDia.map((cobro, index) => (
                      <div key={cobro.id} className="cobro-list-item-mobile" style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        borderBottom: index < cobrosDelDia.length - 1 ? '1px solid #f1f5f9' : 'none',
                        background: index % 2 === 0 ? '#ffffff' : '#fafbfc',
                        fontSize: '0.8rem'
                      }}>
                        <div className="flex-1" style={{ minWidth: '80px' }}>
                          <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '2px', fontSize: '0.85rem' }}>
                            {cobro.cliente}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                            {cobro.cobrador} • {cobro.forma}
                          </div>
                        </div>
                        <div className="text-right" style={{ minWidth: '80px', marginRight: '8px' }}>
                          <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.8rem' }}>
                            {formatMonto(cobro)}
                          </div>
                        </div>
                        <div className="flex align-items-center gap-1" style={{ minWidth: '80px' }}>
                          <Tag 
                            value={cobro.cargado ? "Sí" : "No"} 
                            severity={cobro.cargado ? "success" : "danger"} 
                            style={{ fontSize: '0.65rem', padding: '1px 4px' }}
                          />
                          {user?.role === "admin" && (
                            <Button
                              icon={cobro.cargado ? "pi pi-times" : "pi pi-check"}
                              className={cobro.cargado ? "p-button-rounded p-button-text p-button-danger p-button-sm" : "p-button-rounded p-button-text p-button-success p-button-sm"}
                              style={{ width: 20, height: 20, minWidth: 20, minHeight: 20, fontSize: '0.6rem' }}
                              size="small"
                              loading={updatingId === cobro.id}
                              onClick={() => {
                                if (cobro.cargado) {
                                  confirmDialog({
                                    message: '¿Seguro que deseas marcar este cobro como NO cargado?',
                                    header: 'Confirmar cambio de estado',
                                    icon: 'pi pi-exclamation-triangle',
                                    accept: () => updateCargadoStatus(cobro.id, false)
                                  });
                                } else {
                                  updateCargadoStatus(cobro.id, true);
                                }
                              }}
                              tooltip={cobro.cargado ? "Marcar como no cargado" : "Marcar como cargado"}
                              tooltipOptions={{ position: "top" }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            /* Vista simple sin agrupar para móvil */
            cobros.map((cobro, index) => (
              <div key={cobro.id} className="cobro-list-item-mobile" style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 10px',
                borderBottom: index < cobros.length - 1 ? '1px solid #f1f5f9' : 'none',
                background: index % 2 === 0 ? '#ffffff' : '#fafbfc',
                fontSize: '0.8rem'
              }}>
                <div className="flex-1" style={{ minWidth: '80px' }}>
                  <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '2px', fontSize: '0.85rem' }}>
                    {cobro.cliente}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                    {formatFecha(cobro)} • {cobro.cobrador} • {cobro.forma}
                  </div>
                </div>
                <div className="text-right" style={{ minWidth: '80px', marginRight: '8px' }}>
                  <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.8rem' }}>
                    {formatMonto(cobro)}
                  </div>
                </div>
                <div className="flex align-items-center gap-1" style={{ minWidth: '80px' }}>
                  <Tag 
                    value={cobro.cargado ? "Sí" : "No"} 
                    severity={cobro.cargado ? "success" : "danger"} 
                    style={{ fontSize: '0.65rem', padding: '1px 4px' }}
                  />
                  {user?.role === "admin" && (
                    <Button
                      icon={cobro.cargado ? "pi pi-times" : "pi pi-check"}
                      className={cobro.cargado ? "p-button-rounded p-button-text p-button-danger p-button-sm" : "p-button-rounded p-button-text p-button-success p-button-sm"}
                      style={{ width: 20, height: 20, minWidth: 20, minHeight: 20, fontSize: '0.6rem' }}
                      size="small"
                      loading={updatingId === cobro.id}
                      onClick={() => {
                        if (cobro.cargado) {
                          confirmDialog({
                            message: '¿Seguro que deseas marcar este cobro como NO cargado?',
                            header: 'Confirmar cambio de estado',
                            icon: 'pi pi-exclamation-triangle',
                            accept: () => updateCargadoStatus(cobro.id, false)
                          });
                        } else {
                          updateCargadoStatus(cobro.id, true);
                        }
                      }}
                      tooltip={cobro.cargado ? "Marcar como no cargado" : "Marcar como cargado"}
                      tooltipOptions={{ position: "top" }}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {/* Vista de lista simple agrupada por fecha */}
        {groupByDate && groupedCobros && (
          <div className="cobros-list-desktop" style={{ display: groupByDate ? 'block' : 'none' }}>
            {Object.entries(groupedCobros).map(([fecha, cobrosDelDia]) => {
              const totalDelDia = cobrosDelDia.reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
              const cargadosDelDia = cobrosDelDia.filter(cobro => cobro.cargado).length;
              
              return (
                <div key={fecha} className="mb-3">
                  <div className="flex justify-content-between align-items-center mb-2 p-2" style={{ 
                    background: '#f8fafc', 
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div>
                      <h4 className="m-0" style={{ color: '#1f2937', fontSize: '1rem', fontWeight: '600' }}>
                        {fecha}
                      </h4>
                      <p className="m-0 mt-1" style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                        {cobrosDelDia.length} cobranzas • {formatMonto({ monto: totalDelDia })} • {cargadosDelDia} cargados
                      </p>
                    </div>
                    <Tag 
                      value={`${cargadosDelDia}/${cobrosDelDia.length}`}
                      severity={cargadosDelDia === cobrosDelDia.length ? 'success' : 'warning'}
                      style={{ fontSize: '0.8rem', fontWeight: '600' }}
                    />
                  </div>
                  
                  <div className="cobros-list-items">
                    {cobrosDelDia.map((cobro, index) => (
                      <div key={cobro.id} className="cobro-list-item" style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderBottom: index < cobrosDelDia.length - 1 ? '1px solid #f1f5f9' : 'none',
                        background: index % 2 === 0 ? '#ffffff' : '#fafbfc',
                        fontSize: '0.875rem'
                      }}>
                        <div className="flex-1" style={{ minWidth: '120px' }}>
                          <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '2px' }}>
                            {cobro.cliente}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {cobro.cobrador} • {cobro.forma}
                          </div>
                        </div>
                        <div className="text-right" style={{ minWidth: '100px', marginRight: '12px' }}>
                          <div style={{ fontWeight: '600', color: '#1f2937' }}>
                            {formatMonto(cobro)}
                          </div>
                        </div>
                        <div className="flex align-items-center gap-2" style={{ minWidth: '120px' }}>
                          <Tag 
                            value={cobro.cargado ? "Sí" : "No"} 
                            severity={cobro.cargado ? "success" : "danger"} 
                            style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                          />
                          {user?.role === "admin" && (
                            <Button
                              icon={cobro.cargado ? "pi pi-times" : "pi pi-check"}
                              className={cobro.cargado ? "p-button-rounded p-button-text p-button-danger p-button-sm" : "p-button-rounded p-button-text p-button-success p-button-sm"}
                              style={{ width: 24, height: 24, minWidth: 24, minHeight: 24, fontSize: '0.7rem' }}
                              size="small"
                              loading={updatingId === cobro.id}
                              onClick={() => {
                                if (cobro.cargado) {
                                  confirmDialog({
                                    message: '¿Seguro que deseas marcar este cobro como NO cargado?',
                                    header: 'Confirmar cambio de estado',
                                    icon: 'pi pi-exclamation-triangle',
                                    accept: () => updateCargadoStatus(cobro.id, false)
                                  });
                                } else {
                                  updateCargadoStatus(cobro.id, true);
                                }
                              }}
                              tooltip={cobro.cargado ? "Marcar como no cargado" : "Marcar como cargado"}
                              tooltipOptions={{ position: "top" }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabla tradicional para desktop */}
        <div className="cobros-table-desktop" style={{ display: groupByDate ? 'none' : 'block' }}>
          <DataTable 
            value={cobros} 
            paginator 
            rows={viewMode === 'compact' ? 25 : 10} 
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
        </div>
      </Card>
      {/* Estilos para alternar entre tabla y cards según el tamaño de pantalla */}
      <style>{`
        @media (max-width: 768px) {
          .cobros-table-desktop { display: none !important; }
          .cobros-list-mobile { display: block !important; }
          .cobros-header-mobile { display: block !important; }
          .cobros-list-desktop { display: none !important; }
        }
        @media (min-width: 769px) {
          .cobros-table-desktop { display: block !important; }
          .cobros-list-mobile { display: none !important; }
          .cobros-header-mobile { display: none !important; }
          .cobros-list-desktop { display: block !important; }
        }
        
        /* Estilos para la lista de cobranzas desktop */
        .cobros-list-desktop .cobro-list-item {
          transition: background-color 0.2s ease;
        }
        .cobros-list-desktop .cobro-list-item:hover {
          background-color: #f8fafc !important;
        }
        
        /* Optimización para pantallas grandes */
        @media (min-width: 1200px) {
          .cobros-list-desktop .cobro-list-item {
            padding: 10px 16px !important;
            font-size: 0.9rem !important;
          }
        }
        
        /* Estilos para la lista de cobranzas móvil */
        .cobros-list-mobile .cobro-list-item-mobile {
          transition: background-color 0.2s ease;
        }
        .cobros-list-mobile .cobro-list-item-mobile:hover {
          background-color: #f1f5f9 !important;
        }
        
        /* Optimización para pantallas pequeñas */
        @media (max-width: 480px) {
          .cobros-list-mobile .cobro-list-item-mobile {
            padding: 6px 8px !important;
            font-size: 0.75rem !important;
          }
          .cobros-list-mobile .cobro-list-item-mobile .flex-1 {
            min-width: 60px !important;
          }
          .cobros-list-mobile .cobro-list-item-mobile .text-right {
            min-width: 60px !important;
            margin-right: 4px !important;
          }
          .cobros-list-mobile .cobro-list-item-mobile .flex.align-items-center {
            min-width: 60px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default CobrosList;
