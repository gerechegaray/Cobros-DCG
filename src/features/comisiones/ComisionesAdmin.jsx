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
import { getComisiones, calcularComisiones, getComisionesVendedor, seedReglas, syncFacturas, syncFacturasCompleta, getComisionFlete, calcularComisionFlete, cerrarPeriodo, agregarAjuste, pagarComision } from './comisionesService';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

function ComisionesAdmin({ user }) {
  const toast = useRef(null);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [sincronizandoCompleta, setSincronizandoCompleta] = useState(false);
  const [comisiones, setComisiones] = useState(null);
  const [comisionFlete, setComisionFlete] = useState(null);
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState('Guille');
  const [periodo, setPeriodo] = useState('');
  const [cerrando, setCerrando] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [mostrarDialogAjuste, setMostrarDialogAjuste] = useState(false);
  const [ajusteForm, setAjusteForm] = useState({ tipo: 'positivo', monto: 0, motivo: '' });
  
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
      const [data, flete] = await Promise.all([
        getComisiones(vendedorSeleccionado, periodo),
        getComisionFlete(vendedorSeleccionado, periodo)
      ]);
      setComisiones(data);
      setComisionFlete(flete);
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
      await Promise.all([
        calcularComisiones(periodo),
        calcularComisionFlete(periodo)
      ]);
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
  
  // 🆕 FASE 3: Cerrar período
  const handleCerrarPeriodo = async () => {
    if (!periodo) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Período requerido',
        detail: 'Selecciona un período para cerrar'
      });
      return;
    }
    
    confirmDialog({
      message: `¿Estás seguro de cerrar el período ${periodo}? Este período quedará cerrado y no podrá recalcularse.`,
      header: 'Confirmar Cierre de Período',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, cerrar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-warning',
      accept: async () => {
        setCerrando(true);
        try {
          const resultado = await cerrarPeriodo(periodo);
          toast.current?.show({
            severity: 'success',
            summary: 'Período cerrado',
            detail: `El período ${periodo} ha sido cerrado correctamente`
          });
          await cargarComisiones();
        } catch (error) {
          console.error('Error cerrando período:', error);
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo cerrar el período'
          });
        } finally {
          setCerrando(false);
        }
      }
    });
  };
  
  // 🆕 FASE 3: Agregar ajuste
  const handleAgregarAjuste = async () => {
    if (!ajusteForm.monto || ajusteForm.monto <= 0) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Monto inválido',
        detail: 'El monto debe ser mayor a 0'
      });
      return;
    }
    
    if (!ajusteForm.motivo || ajusteForm.motivo.trim() === '') {
      toast.current?.show({
        severity: 'warn',
        summary: 'Motivo requerido',
        detail: 'Debes ingresar un motivo para el ajuste'
      });
      return;
    }
    
    try {
      await agregarAjuste(
        vendedorSeleccionado,
        periodo,
        ajusteForm.tipo,
        ajusteForm.monto,
        ajusteForm.motivo
      );
      toast.current?.show({
        severity: 'success',
        summary: 'Ajuste agregado',
        detail: `Ajuste ${ajusteForm.tipo === 'positivo' ? 'sumado' : 'restado'} correctamente`
      });
      setMostrarDialogAjuste(false);
      setAjusteForm({ tipo: 'positivo', monto: 0, motivo: '' });
      await cargarComisiones();
    } catch (error) {
      console.error('Error agregando ajuste:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo agregar el ajuste'
      });
    }
  };
  
  // 🆕 FASE 3: Pagar comisión
  const handlePagarComision = async () => {
    if (!vendedorSeleccionado || !periodo) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Datos requeridos',
        detail: 'Selecciona vendedor y período'
      });
      return;
    }
    
    confirmDialog({
      message: `¿Marcar como pagada la comisión de ${vendedorSeleccionado} para ${periodo}?`,
      header: 'Confirmar Pago',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Sí, marcar como pagado',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-success',
      accept: async () => {
        setPagando(true);
        try {
          await pagarComision(vendedorSeleccionado, periodo);
          toast.current?.show({
            severity: 'success',
            summary: 'Comisión pagada',
            detail: `La comisión de ${vendedorSeleccionado} para ${periodo} ha sido marcada como pagada`
          });
          await cargarComisiones();
        } catch (error) {
          console.error('Error pagando comisión:', error);
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo marcar como pagado'
          });
        } finally {
          setPagando(false);
        }
      }
    });
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
  
  // Agrupar detalle por categoría
  const agruparPorCategoria = (detalle) => {
    if (!detalle || !Array.isArray(detalle) || detalle.length === 0) {
      return [];
    }
    
    const agrupado = {};
    
    detalle.forEach(item => {
      const categoria = item.categoria || 'Sin categoría';
      
      if (!agrupado[categoria]) {
        agrupado[categoria] = {
          categoria: categoria,
          porcentaje: item.porcentaje || 0,
          subtotal: 0,
          comision: 0
        };
      }
      
      agrupado[categoria].subtotal += parseFloat(item.subtotal) || 0;
      agrupado[categoria].comision += parseFloat(item.comision) || 0;
    });
    
    // Convertir a array y ordenar por comisión descendente
    return Object.values(agrupado).sort((a, b) => b.comision - a.comision);
  };
  
  // Generar label del período desde periodo (YYYY-MM)
  // Asegurar que el formato sea correcto para evitar problemas de zona horaria
  const periodoLabel = periodo ? (() => {
    const [anio, mes] = periodo.split('-').map(Number);
    // Crear fecha en UTC para evitar problemas de zona horaria
    const fecha = new Date(Date.UTC(anio, mes - 1, 1));
    return fecha.toLocaleDateString('es-AR', { 
      year: 'numeric', 
      month: 'long',
      timeZone: 'UTC'
    });
  })() : '';
  
  // Obtener resumen por categoría
  const resumenPorCategoria = comisiones?.detalle 
    ? agruparPorCategoria(comisiones.detalle)
    : [];
  
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
              disabled={comisiones?.estado === 'cerrado' || comisiones?.estado === 'pagado'}
            />
            {comisiones?.estado === 'calculado' && (
              <Button
                label="Cerrar Período"
                icon="pi pi-lock"
                onClick={handleCerrarPeriodo}
                loading={cerrando}
                className="p-button-warning"
                tooltip="Cierra el período y bloquea recálculos"
              />
            )}
            {comisiones?.estado === 'cerrado' && (
              <>
                <Button
                  label="Agregar Ajuste"
                  icon="pi pi-plus-circle"
                  onClick={() => setMostrarDialogAjuste(true)}
                  className="p-button-outlined p-button-info"
                />
                <Button
                  label="Marcar como Pagado"
                  icon="pi pi-check"
                  onClick={handlePagarComision}
                  loading={pagando}
                  className="p-button-success"
                />
              </>
            )}
          </div>
        </div>
      </Card>
      
      <ConfirmDialog />
      
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
                <div className="comisiones-kpi-label">Comisión por Cobranza</div>
              </div>
            </Card>
          </div>
          
          {comisionFlete && (
            <Card className="comisiones-detail-card" style={{ marginTop: 'var(--spacing-4)' }}>
              <h2 style={{ marginBottom: 'var(--spacing-4)' }}>Comisión por Flete</h2>
              <div className="comisiones-kpis-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div>
                  <div style={{ color: 'var(--dcg-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-1)' }}>
                    Total Transportado
                  </div>
                  <div style={{ color: 'var(--dcg-text-primary)', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                    {formatMonto(comisionFlete.totalFlete || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--dcg-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-1)' }}>
                    Comisión por Flete ({comisionFlete.porcentaje || 4}%)
                  </div>
                  <div style={{ color: 'var(--dcg-success)', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                    {formatMonto(comisionFlete.comisionFlete || 0)}
                  </div>
                </div>
              </div>
            </Card>
          )}
          
          <Card className="comisiones-detail-card" style={{ marginTop: 'var(--spacing-4)' }}>
            {comisiones?.estado === 'calculado' && (
              <div className="comisiones-warning">
                <i className="pi pi-info-circle"></i>
                <span>Monto estimado – sujeto a validación administrativa</span>
              </div>
            )}
            
            <h2 style={{ marginTop: comisiones?.estado === 'calculado' ? 'var(--spacing-4)' : '0' }}>
              Resumen por Categoría - {vendedorSeleccionado} - {periodoLabel}
            </h2>
            
            {resumenPorCategoria.length > 0 ? (
              <DataTable
                value={resumenPorCategoria}
                className="comisiones-table"
              >
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
                  field="porcentaje" 
                  header="% Comisión"
                  body={(rowData) => `${rowData.porcentaje}%`}
                  align="right"
                />
                <Column 
                  field="subtotal" 
                  header="Base"
                  body={(rowData) => formatMonto(rowData.subtotal)}
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
            
            <div style={{ marginTop: 'var(--spacing-6)', paddingTop: 'var(--spacing-4)', borderTop: '1px solid var(--dcg-border)' }}>
              <h2 style={{ marginBottom: 'var(--spacing-4)' }}>
                {comisiones?.estado === 'pagado' ? 'Total Pagado del Período' : 'Total Estimado del Período'}
              </h2>
              <div style={{ 
                fontSize: 'var(--font-size-3xl)', 
                fontWeight: 'var(--font-weight-bold)', 
                color: 'var(--dcg-success)',
                marginTop: 'var(--spacing-4)'
              }}>
                {formatMonto(
                  (comisiones?.totalFinal || comisiones?.totalComision || 0) + (comisionFlete?.comisionFlete || 0)
                )}
              </div>
              <div style={{ 
                color: 'var(--dcg-text-secondary)', 
                fontSize: 'var(--font-size-sm)',
                marginTop: 'var(--spacing-2)'
              }}>
                = Comisión por Cobranza {comisiones?.ajustes && comisiones.ajustes.length > 0 ? '+ Ajustes' : ''} + Comisión por Flete
              </div>
              {comisiones?.ajustes && comisiones.ajustes.length > 0 && (
                <div style={{ 
                  color: 'var(--dcg-text-secondary)', 
                  fontSize: 'var(--font-size-xs)',
                  marginTop: 'var(--spacing-1)',
                  fontStyle: 'italic'
                }}>
                  Comisión base: {formatMonto(comisiones.totalComision || 0)} | 
                  Ajustes: {formatMonto(
                    comisiones.ajustes.reduce((sum, a) => sum + (a.tipo === 'positivo' ? a.monto : -a.monto), 0)
                  )} | 
                  Total: {formatMonto(comisiones.totalFinal || comisiones.totalComision || 0)}
                </div>
              )}
            </div>
          </Card>
        </>
      )}
      
      {/* 🆕 FASE 3: Dialog para agregar ajuste */}
      <Dialog
        header="Agregar Ajuste Manual"
        visible={mostrarDialogAjuste}
        style={{ width: '500px' }}
        onHide={() => {
          setMostrarDialogAjuste(false);
          setAjusteForm({ tipo: 'positivo', monto: 0, motivo: '' });
        }}
        footer={
          <div>
            <Button
              label="Cancelar"
              icon="pi pi-times"
              onClick={() => {
                setMostrarDialogAjuste(false);
                setAjusteForm({ tipo: 'positivo', monto: 0, motivo: '' });
              }}
              className="p-button-text"
            />
            <Button
              label="Agregar Ajuste"
              icon="pi pi-check"
              onClick={handleAgregarAjuste}
              className="p-button-primary"
            />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <div>
            <label>Tipo de Ajuste:</label>
            <Dropdown
              value={ajusteForm.tipo}
              options={[
                { label: 'Suma (+)', value: 'positivo' },
                { label: 'Resta (-)', value: 'negativo' }
              ]}
              onChange={(e) => setAjusteForm({ ...ajusteForm, tipo: e.value })}
              style={{ width: '100%', marginTop: 'var(--spacing-2)' }}
            />
          </div>
          <div>
            <label>Monto:</label>
            <InputNumber
              value={ajusteForm.monto}
              onValueChange={(e) => setAjusteForm({ ...ajusteForm, monto: e.value || 0 })}
              mode="currency"
              currency="ARS"
              locale="es-AR"
              style={{ width: '100%', marginTop: 'var(--spacing-2)' }}
            />
          </div>
          <div>
            <label>Motivo (obligatorio):</label>
            <InputTextarea
              value={ajusteForm.motivo}
              onChange={(e) => setAjusteForm({ ...ajusteForm, motivo: e.target.value })}
              rows={4}
              style={{ width: '100%', marginTop: 'var(--spacing-2)' }}
              placeholder="Describe el motivo del ajuste..."
            />
          </div>
        </div>
      </Dialog>
      
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

