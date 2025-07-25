import React, { useEffect, useState, useRef } from "react";
import { db } from "../../services/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { getClientesCatalogo } from '../../services/firebase';
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
  const [clientesCatalogo, setClientesCatalogo] = useState([]);
  const [loadingClientesCatalogo, setLoadingClientesCatalogo] = useState(true);
  const [catalogoCargado, setCatalogoCargado] = useState(false);

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

  const fetchCobranzas = async (force = false) => {
    setLoading(true);
    let data = [];
    if (!force) {
      const cache = localStorage.getItem("cobranzas_list");
      if (cache) {
        data = JSON.parse(cache);
        setCobros(data);
        setLoading(false);
        return;
      }
    }
    try {
      const q = query(collection(db, "cobranzas"), orderBy("fecha", "desc"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      localStorage.setItem("cobranzas_list", JSON.stringify(data));
      setCobros(data);
    } catch (error) {
      console.error("Error al cargar cobranzas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCobranzas();
  }, []);

  // Cargar catálogo de clientes
  useEffect(() => {
    // Cargar catálogo de clientes para mostrar nombres
    async function fetchClientesCatalogo() {
      try {
        const data = await getClientesCatalogo();
        setClientesCatalogo(data);
        setCatalogoCargado(true);
      } catch (error) {
        console.error('Error al obtener clientes de Firestore:', error);
      } finally {
        setLoadingClientesCatalogo(false);
      }
    }
    fetchClientesCatalogo();
  }, []);

  // Agregar función para obtener razón social
  const getRazonSocial = (clienteId) => {
    if (catalogoCargado && clientesCatalogo.length > 0) {
      const cliente = clientesCatalogo.find(c => c.id === clienteId);
      return cliente ? cliente['Razón Social'] : clienteId;
    }
    return clienteId;
  };

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

  // Función para eliminar cobro
  const eliminarCobro = async (cobroId) => {
    try {
      await deleteDoc(doc(db, "cobranzas", cobroId));
      toast.current.show({ severity: 'success', summary: 'Eliminado', detail: 'Cobro eliminado correctamente' });
    } catch (error) {
      console.error("Error al eliminar cobro:", error);
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el cobro' });
    }
  };

  // Template para el botón de eliminar
  const eliminarTemplate = (rowData) => (
    user?.role === "admin" && (
      <Button
        icon="pi pi-trash"
        className="p-button-danger p-button-text p-button-sm"
        onClick={() => {
          confirmDialog({
            message: `¿Seguro que deseas eliminar el cobro de ${rowData.cliente}?`,
            header: "Confirmar eliminación",
            icon: "pi pi-exclamation-triangle",
            accept: () => eliminarCobro(rowData.id)
          });
        }}
        tooltip="Eliminar cobro"
        tooltipOptions={{ position: "top" }}
      />
    )
  );

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
    <div className="p-2 px-3 md:p-3 lg:p-4" style={{ width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
      <Toast ref={toast} />
      <ConfirmDialog />
      
      {/* Header con botón actualizar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: "#1f2937" }}>Lista de Cobranzas</h2>
        <Button 
          label="Actualizar" 
          icon="pi pi-refresh" 
          onClick={() => fetchCobranzas(true)} 
          className="p-button-sm p-button-info" 
        />
      </div>

      {/* Estadísticas discretas */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '16px', 
        padding: '8px 12px', 
        background: '#f8fafc', 
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        fontSize: '0.875rem'
      }}>
        <span style={{ color: '#6b7280' }}>
          <strong style={{ color: '#1f2937' }}>{stats.total}</strong> total
        </span>
        <span style={{ color: '#6b7280' }}>
          <strong style={{ color: '#059669' }}>{stats.loadedCount}</strong> cargados
        </span>
        <span style={{ color: '#6b7280' }}>
          <strong style={{ color: '#dc2626' }}>{stats.notLoadedCount}</strong> pendientes
        </span>
        <span style={{ color: '#6b7280' }}>
          <strong style={{ color: '#1f2937' }}>{formatMonto({ monto: stats.totalAmount })}</strong> total
        </span>
      </div>

      {/* Lista de cobros agrupados por fecha */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <div className="pi pi-spin pi-spinner" style={{ fontSize: '1.5rem' }}></div>
            <span>Cargando cobranzas...</span>
          </div>
        </div>
      ) : cobros.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          No hay cobranzas registradas.
        </div>
      ) : (
        <div>
          {Object.entries(groupedCobros).map(([fecha, cobrosDelDia]) => {
            const cargados = cobrosDelDia.filter(c => c.cargado);
            const noCargados = cobrosDelDia.filter(c => !c.cargado);
            const totalDelDia = cobrosDelDia.reduce((sum, c) => sum + (c.monto || 0), 0);
            
            return (
              <Card key={fecha} className="mb-3" style={{ borderRadius: 8 }}>
                {/* Header del día */}
                <div className="flex justify-content-between align-items-center mb-2 p-2" style={{ 
                  background: '#f8fafc', 
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div>
                    <h4 className="m-0" style={{ color: '#1f2937', fontSize: '1rem', fontWeight: '600' }}>
                      {fecha}
                    </h4>
                    <p className="m-0 mt-1" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      {cobrosDelDia.length} cobranzas • {formatMonto({ monto: totalDelDia })}
                    </p>
                  </div>
                  <Tag 
                    value={`${cargados.length}/${cobrosDelDia.length}`}
                    severity={cargados.length === cobrosDelDia.length ? 'success' : 'warning'}
                    style={{ fontSize: '0.7rem', fontWeight: '600' }}
                  />
                </div>

                {/* Cobros Cargados */}
                {cargados.length > 0 && (
                  <div className="mb-3">
                    <div className="flex align-items-center gap-2 mb-2">
                      <Tag value="Cargados" severity="success" style={{ fontSize: '0.7rem' }} />
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {cargados.length} cobranza{cargados.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="cobros-cargados">
                      {cargados.map((cobro, index) => (
                        <div key={cobro.id} className="cobro-item" style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderBottom: index < cargados.length - 1 ? '1px solid #f1f5f9' : 'none',
                          background: '#f0fdf4',
                          fontSize: '0.875rem',
                          borderRadius: '4px',
                          marginBottom: '4px'
                        }}>
                          <div className="flex-1" style={{ minWidth: '80px' }}>
                            <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '2px' }}>
                              {getRazonSocial(cobro.cliente)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                              {cobro.cobrador} • {cobro.forma}
                            </div>
                          </div>
                          <div className="text-right" style={{ minWidth: '80px', marginRight: '8px' }}>
                            <div style={{ fontWeight: '600', color: '#1f2937' }}>
                              {formatMonto(cobro)}
                            </div>
                          </div>
                          <div className="flex align-items-center gap-1" style={{ minWidth: '60px' }}>
                            <Tag 
                              value="Sí" 
                              severity="success" 
                              style={{ fontSize: '0.6rem', padding: '1px 4px' }}
                            />
                            {user?.role === "admin" && (
                              <Button
                                icon="pi pi-times"
                                className="p-button-rounded p-button-text p-button-danger p-button-sm"
                                style={{ width: 20, height: 20, minWidth: 20, minHeight: 20, fontSize: '0.6rem' }}
                                size="small"
                                loading={updatingId === cobro.id}
                                onClick={() => {
                                  confirmDialog({
                                    message: '¿Marcar como NO cargado?',
                                    header: 'Confirmar cambio',
                                    icon: 'pi pi-exclamation-triangle',
                                    accept: () => updateCargadoStatus(cobro.id, false)
                                  });
                                }}
                                tooltip="Marcar como no cargado"
                                tooltipOptions={{ position: "top" }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cobros No Cargados */}
                {noCargados.length > 0 && (
                  <div>
                    <div className="flex align-items-center gap-2 mb-2">
                      <Tag value="Pendientes" severity="danger" style={{ fontSize: '0.7rem' }} />
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {noCargados.length} cobranza{noCargados.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="cobros-pendientes">
                      {noCargados.map((cobro, index) => (
                        <div key={cobro.id} className="cobro-item" style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderBottom: index < noCargados.length - 1 ? '1px solid #f1f5f9' : 'none',
                          background: '#fef2f2',
                          fontSize: '0.875rem',
                          borderRadius: '4px',
                          marginBottom: '4px'
                        }}>
                          <div className="flex-1" style={{ minWidth: '80px' }}>
                            <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '2px' }}>
                              {getRazonSocial(cobro.cliente)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                              {cobro.cobrador} • {cobro.forma}
                            </div>
                          </div>
                          <div className="text-right" style={{ minWidth: '80px', marginRight: '8px' }}>
                            <div style={{ fontWeight: '600', color: '#1f2937' }}>
                              {formatMonto(cobro)}
                            </div>
                          </div>
                          <div className="flex align-items-center gap-1" style={{ minWidth: '60px' }}>
                            <Tag 
                              value="No" 
                              severity="danger" 
                              style={{ fontSize: '0.6rem', padding: '1px 4px' }}
                            />
                            {user?.role === "admin" && (
                              <Button
                                icon="pi pi-check"
                                className="p-button-rounded p-button-text p-button-success p-button-sm"
                                style={{ width: 20, height: 20, minWidth: 20, minHeight: 20, fontSize: '0.6rem' }}
                                size="small"
                                loading={updatingId === cobro.id}
                                onClick={() => updateCargadoStatus(cobro.id, true)}
                                tooltip="Marcar como cargado"
                                tooltipOptions={{ position: "top" }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Estilos responsive */}
      <style>{`
        @media (max-width: 768px) {
          .cobro-item {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 8px;
          }
          .cobro-item .flex-1 {
            min-width: 100% !important;
          }
          .cobro-item .text-right {
            min-width: 100% !important;
            margin-right: 0 !important;
            text-align: left !important;
          }
          .cobro-item .flex.align-items-center {
            min-width: 100% !important;
            justify-content: space-between;
          }
        }
        
        @media (max-width: 480px) {
          .grid .col-6 {
            padding: 0.25rem;
          }
          .grid .col-6 .p-card {
            padding: 0.5rem !important;
          }
          .grid .col-6 .text-xl {
            font-size: 1rem !important;
          }
          .grid .col-6 .text-xs {
            font-size: 0.6rem !important;
          }
        }
      `}</style>
    </div>
  );
}

export default CobrosList;
