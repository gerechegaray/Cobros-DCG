import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import { ProgressSpinner } from 'primereact/progressspinner';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { getComisiones, calcularComisiones, getComisionesVendedor, seedReglas, syncFacturas, syncFacturasCompleta } from './comisionesService';

function ComisionesAdmin({ user }) {
  const toast = useRef(null);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [sincronizandoCompleta, setSincronizandoCompleta] = useState(false);
  const [comisiones, setComisiones] = useState(null);
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState('Guille');
  const [periodo, setPeriodo] = useState('');
  
  const vendedores = [
    { label: 'Guille', value: 'Guille' },
    { label: 'Santi', value: 'Santi' }
  ];
  
  // Obtener período actual por defecto
  useEffect(() => {
    const now = new Date();
    const anio = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    setPeriodo(`${anio}-${mes}`);
  }, []);
  
  // Cargar comisiones cuando cambian vendedor o período
  useEffect(() => {
    if (vendedorSeleccionado && periodo) {
      cargarComisiones();
    }
  }, [vendedorSeleccionado, periodo]);
  
  const cargarComisiones = async () => {
    if (!vendedorSeleccionado || !periodo) return;
    
    setLoading(true);
    try {
      const data = await getComisiones(vendedorSeleccionado, periodo);
      setComisiones(data);
    } catch (error) {
      console.error('Error cargando comisiones:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar las comisiones'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCalcular = async () => {
    if (!periodo) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Período requerido',
        detail: 'Selecciona un período para calcular'
      });
      return;
    }
    
    setCalculando(true);
    try {
      await calcularComisiones(periodo);
      toast.current?.show({
        severity: 'success',
        summary: 'Comisiones calculadas',
        detail: `Las comisiones de ${periodo} han sido calculadas`
      });
      await cargarComisiones();
    } catch (error) {
      console.error('Error calculando comisiones:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudieron calcular las comisiones'
      });
    } finally {
      setCalculando(false);
    }
  };
  
  const handleSyncFacturas = async () => {
    setSincronizando(true);
    try {
      const resultado = await syncFacturas();
      toast.current?.show({
        severity: 'success',
        summary: 'Sincronización completada',
        detail: `${resultado.nuevas} nuevas, ${resultado.actualizadas} actualizadas`
      });
    } catch (error) {
      console.error('Error sincronizando facturas:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudieron sincronizar las facturas'
      });
    } finally {
      setSincronizando(false);
    }
  };
  
  const handleSyncFacturasCompleta = async () => {
    // Confirmar antes de ejecutar sincronización completa
    if (!window.confirm('¿Estás seguro? La sincronización completa procesará todos los payments históricos y puede tardar varios minutos.')) {
      return;
    }
    
    setSincronizandoCompleta(true);
    try {
      const resultado = await syncFacturasCompleta();
      toast.current?.show({
        severity: 'success',
        summary: 'Sincronización completa finalizada',
        detail: `${resultado.nuevas} nuevas, ${resultado.actualizadas} actualizadas. Tipo: ${resultado.tipo}`
      });
    } catch (error) {
      console.error('Error sincronizando facturas completa:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo completar la sincronización completa'
      });
    } finally {
      setSincronizandoCompleta(false);
    }
  };
  
  const handleSeedReglas = async () => {
    try {
      const resultado = await seedReglas();
      toast.current?.show({
        severity: 'success',
        summary: 'Reglas cargadas',
        detail: `${resultado.creadas} creadas, ${resultado.actualizadas} actualizadas`
      });
    } catch (error) {
      console.error('Error en seed de reglas:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudieron cargar las reglas'
      });
    }
  };
  
  const formatMonto = (monto) => {
    const valor = parseFloat(monto) || 0;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };
  
  const periodoLabel = periodo ? new Date(periodo + '-01').toLocaleDateString('es-AR', { 
    year: 'numeric', 
    month: 'long' 
  }) : '';
  
  if (loading && !comisiones) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <ProgressSpinner />
        <p>Cargando comisiones...</p>
      </div>
    );
  }
  
  return (
    <div className="comisiones-container">
      <Toast ref={toast} />
      
      <Card className="comisiones-header-card">
        <div className="comisiones-header">
          <div>
            <h1 className="comisiones-title">Comisiones de Vendedores</h1>
            <p className="comisiones-subtitle">Administración y cálculo de comisiones</p>
          </div>
          <div className="comisiones-admin-actions">
            <Button
              label="Sincronizar Facturas"
              icon="pi pi-sync"
              onClick={handleSyncFacturas}
              loading={sincronizando}
              className="p-button-outlined p-button-secondary"
              tooltip="Sincronización incremental (solo nuevos payments)"
            />
            <Button
              label="Sincronización Completa"
              icon="pi pi-refresh"
              onClick={handleSyncFacturasCompleta}
              loading={sincronizandoCompleta}
              className="p-button-outlined p-button-warning"
              tooltip="Sincroniza todos los payments históricos (puede tardar varios minutos)"
            />
            <Button
              label="Cargar Reglas"
              icon="pi pi-database"
              onClick={handleSeedReglas}
              className="p-button-outlined p-button-secondary"
            />
            <Button
              label="Calcular Comisiones"
              icon="pi pi-calculator"
              onClick={handleCalcular}
              loading={calculando}
              className="p-button-outlined"
            />
          </div>
        </div>
      </Card>
      
      <Card className="comisiones-filters-card">
        <div className="comisiones-filters">
          <div className="comisiones-filter-item">
            <label>Vendedor:</label>
            <Dropdown
              value={vendedorSeleccionado}
              options={vendedores}
              onChange={(e) => setVendedorSeleccionado(e.value)}
              placeholder="Seleccionar vendedor"
            />
          </div>
          <div className="comisiones-filter-item">
            <label>Período (YYYY-MM):</label>
            <InputText
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              placeholder="2025-01"
            />
          </div>
        </div>
      </Card>
      
      {comisiones && (
        <>
          <div className="comisiones-kpis-grid">
            <Card className="comisiones-kpi-card">
              <div className="comisiones-kpi-content">
                <i className="pi pi-wallet comisiones-kpi-icon primary"></i>
                <div className="comisiones-kpi-value primary">
                  {formatMonto(comisiones.totalCobrado)}
                </div>
                <div className="comisiones-kpi-label">Total Cobrado</div>
              </div>
            </Card>
            
            <Card className="comisiones-kpi-card">
              <div className="comisiones-kpi-content">
                <i className="pi pi-money-bill comisiones-kpi-icon success"></i>
                <div className="comisiones-kpi-value success">
                  {formatMonto(comisiones.totalComision)}
                </div>
                <div className="comisiones-kpi-label">Comisión Total</div>
              </div>
            </Card>
          </div>
          
          <Card className="comisiones-detail-card">
            <h2>Detalle de Comisiones - {vendedorSeleccionado} - {periodoLabel}</h2>
            
            {comisiones.detalle && comisiones.detalle.length > 0 ? (
              <DataTable
                value={comisiones.detalle}
                paginator
                rows={10}
                className="comisiones-table"
              >
                <Column field="facturaId" header="Factura ID" />
                <Column field="producto" header="Producto" />
                <Column 
                  field="categoria" 
                  header="Categoría"
                  body={(rowData) => (
                    <span className="comisiones-categoria-badge">
                      {rowData.categoria}
                    </span>
                  )}
                />
                <Column 
                  field="subtotal" 
                  header="Subtotal"
                  body={(rowData) => formatMonto(rowData.subtotal)}
                  align="right"
                />
                <Column 
                  field="porcentaje" 
                  header="%"
                  body={(rowData) => `${rowData.porcentaje}%`}
                  align="right"
                />
                <Column 
                  field="comision" 
                  header="Comisión"
                  body={(rowData) => (
                    <strong className="comisiones-comision-value">
                      {formatMonto(rowData.comision)}
                    </strong>
                  )}
                  align="right"
                />
              </DataTable>
            ) : (
              <div className="comisiones-empty">
                <p>No hay comisiones calculadas para este período.</p>
                <p>Haz clic en "Calcular Comisiones" para calcularlas.</p>
              </div>
            )}
          </Card>
        </>
      )}
      
      {!comisiones && !loading && (
        <Card>
          <div className="comisiones-empty">
            <p>No hay comisiones disponibles para este período.</p>
            <Button
              label="Calcular Comisiones"
              icon="pi pi-calculator"
              onClick={handleCalcular}
              loading={calculando}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

export default ComisionesAdmin;

