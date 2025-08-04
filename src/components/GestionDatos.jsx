import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { Toast } from 'primereact/toast';
import { TabView, TabPanel } from 'primereact/tabview';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Tag } from 'primereact/tag';
import { api } from '../services/api';

function GestionDatos({ user }) {
  const [activeTab, setActiveTab] = useState(0);
  const [estado, setEstado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para limpieza de datos
  const [cleanupConfig, setCleanupConfig] = useState({
    dias: 30,
    coleccion: 'visitas'
  });
  const [previewData, setPreviewData] = useState([]);
  const [cleanupStats, setCleanupStats] = useState(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [executing, setExecuting] = useState(false);
  
  const toast = useRef(null);

  // Configuración de colecciones para limpieza
  const coleccionesLimpieza = [
    { label: 'Visitas', value: 'visitas', dias: 30 },
    { label: 'Hojas de Ruta', value: 'hojasDeRuta', dias: 30 },
    { label: 'Cobranzas', value: 'cobranzas', dias: 60 },
    { label: 'Presupuestos', value: 'presupuestos', dias: 60 }
  ];

  const cargarEstado = async () => {
    setLoading(true);
    try {
      const data = await api.getCacheStatus();
      
      // 🆕 Agregar estado del caché del frontend
      const estadoFrontend = obtenerEstadoCacheFrontend();
      const estadoCompleto = {
        ...data.estado,
        clientesFrontend: estadoFrontend.clientes
      };
      
      setEstado(estadoCompleto);
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo cargar el estado del cache'
      });
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Función para obtener estado del caché del frontend
  const obtenerEstadoCacheFrontend = () => {
    const ahora = Date.now();
    const ttl = 7 * 24 * 60 * 60 * 1000; // 7 días
    
    try {
      const cache = localStorage.getItem("clientes_catalogo");
      if (cache) {
        const cacheData = JSON.parse(cache);
        const tiempoTranscurrido = ahora - cacheData.timestamp;
        const tiempoRestante = ttl - tiempoTranscurrido;
        
        return {
          clientes: {
            tieneDatos: tiempoTranscurrido < ttl,
            ultimaActualizacion: new Date(cacheData.timestamp).toLocaleString(),
            expiraEn: tiempoRestante > 0 ? `${Math.round(tiempoRestante / (1000 * 60 * 60 * 24))} días` : 'EXPIRADO',
            registros: cacheData.data.length,
            tiempoTranscurrido: `${Math.round(tiempoTranscurrido / (1000 * 60 * 60 * 24))} días`
          }
        };
      }
    } catch (error) {
      // Error al leer caché del frontend
    }
    
    return {
      clientes: {
        tieneDatos: false,
        ultimaActualizacion: 'Nunca',
        expiraEn: 'N/A',
        registros: 0,
        tiempoTranscurrido: 'N/A'
      }
    };
  };

  const invalidarCache = async (tipo) => {
    try {
      const data = await api.invalidateCache(tipo);
      
      if (data.success) {
        toast.current?.show({
          severity: 'success',
          summary: 'Cache Invalidado',
          detail: `Cache de ${tipo} invalidado exitosamente`
        });
        cargarEstado(); // Recargar estado
      }
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo invalidar el cache'
      });
    }
  };

  const refrescarCache = async (tipo) => {
    setRefreshing(true);
    try {
      const data = await api.refreshCache(tipo);
      
      if (data.success) {
        toast.current?.show({
          severity: 'success',
          summary: 'Cache Actualizado',
          detail: `Cache de ${tipo} actualizado exitosamente`
        });
        cargarEstado(); // Recargar estado
      }
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar el cache'
      });
    } finally {
      setRefreshing(false);
    }
  };

  // 🆕 Funciones para limpieza de datos
  const obtenerEstadisticasLimpieza = async () => {
    try {
      const data = await api.getCleanupStats();
      setCleanupStats(data);
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron obtener las estadísticas de limpieza'
      });
    }
  };

  const obtenerVistaPrevia = async () => {
    try {
      const data = await api.getCleanupPreview({
        dias: cleanupConfig.dias,
        coleccion: cleanupConfig.coleccion
      });
      setPreviewData(data.registros);
      setShowPreviewDialog(true);
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener la vista previa'
      });
    }
  };

  const exportarDatos = async () => {
    setExporting(true);
    try {
      const response = await api.exportCleanupData({
        dias: cleanupConfig.dias,
        coleccion: cleanupConfig.coleccion
      });
      
      // Convertir JSON a CSV
      if (response.registros && response.registros.length > 0) {
        const headers = Object.keys(response.registros[0]).join(',');
        const rows = response.registros.map(registro => 
          Object.values(registro).map(valor => {
            if (valor === null || valor === undefined) {
              return '""';
            }
            if (typeof valor === 'object') {
              return `"${JSON.stringify(valor).replace(/"/g, '""')}"`;
            }
            if (typeof valor === 'string') {
              return `"${valor.replace(/"/g, '""')}"`;
            }
            return valor;
          }).join(',')
        );
        
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `datos_antiguos_${cleanupConfig.coleccion}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast.current?.show({
          severity: 'success',
          summary: 'Exportación Exitosa',
          detail: `${response.total} registros exportados correctamente`
        });
      } else {
        toast.current?.show({
          severity: 'info',
          summary: 'Sin datos',
          detail: 'No hay registros para exportar'
        });
      }
    } catch (error) {
      console.error('Error exportando datos:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo exportar los datos'
      });
    } finally {
      setExporting(false);
    }
  };

  const ejecutarLimpieza = async () => {
    setExecuting(true);
    try {
      const data = await api.executeCleanup({
        dias: cleanupConfig.dias,
        coleccion: cleanupConfig.coleccion
      });
      
      toast.current?.show({
        severity: 'success',
        summary: 'Limpieza Exitosa',
        detail: `${data.eliminados} registros eliminados de ${cleanupConfig.coleccion}`
      });
      
      setShowCleanupDialog(false);
      obtenerEstadisticasLimpieza();
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo ejecutar la limpieza'
      });
    } finally {
      setExecuting(false);
    }
  };

  useEffect(() => {
    cargarEstado();
    obtenerEstadisticasLimpieza();
    // Actualizar cada 30 segundos
    const interval = setInterval(() => {
      cargarEstado();
      obtenerEstadisticasLimpieza();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Actualizar días según la colección seleccionada
    const coleccion = coleccionesLimpieza.find(c => c.value === cleanupConfig.coleccion);
    if (coleccion) {
      setCleanupConfig(prev => ({ ...prev, dias: coleccion.dias }));
    }
  }, [cleanupConfig.coleccion]);

  if (!estado) {
    return (
      <Card title="Gestión de Datos" className="mb-3">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', marginBottom: '1rem' }}></div>
          <p>Cargando estado del sistema...</p>
        </div>
      </Card>
    );
  }

  const calcularPorcentajeExpiracion = (tipo) => {
    if (!estado[tipo].tieneDatos) return 0;
    
    const ahora = Date.now();
    const ultimaActualizacion = new Date(estado[tipo].ultimaActualizacion).getTime();
    const ttl = tipo === 'clientes' ? 7 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
    const tiempoTranscurrido = ahora - ultimaActualizacion;
    const porcentaje = (tiempoTranscurrido / ttl) * 100;
    
    return Math.min(porcentaje, 100);
  };

  const renderCacheMonitor = () => (
    <div className="grid">
      {/* Clientes */}
      <div className="col-12 md:col-6">
        <Card title="Clientes" className="mb-2">
          <div className="mb-3">
            <div className="flex justify-content-between align-items-center mb-2">
              <span>Estado:</span>
              <span className={`font-bold ${estado.clientes.tieneDatos ? 'text-green-600' : 'text-red-600'}`}>
                {estado.clientes.tieneDatos ? '✅ Cargado' : '❌ No cargado'}
              </span>
            </div>
            
            <div className="mb-2">
              <span className="text-sm">Última actualización:</span>
              <div className="font-mono text-xs bg-gray-100 p-1 rounded mt-1">
                {estado.clientes.ultimaActualizacion}
              </div>
            </div>
            
            <div className="mb-2">
              <span className="text-sm">Tiempo transcurrido:</span>
              <div className="font-bold text-blue-600">
                {estado.clientes.tiempoTranscurrido}
              </div>
            </div>
            
            <div className="mb-2">
              <span className="text-sm">Registros en cache:</span>
              <div className="font-bold">
                {estado.clientes.registros.toLocaleString()}
              </div>
            </div>
            
            <div className="mb-3">
              <span className="text-sm">Expira en:</span>
              <div className="font-bold text-orange-600">
                {estado.clientes.expiraEn}
              </div>
            </div>
            
            <ProgressBar 
              value={calcularPorcentajeExpiracion('clientes')} 
              color={calcularPorcentajeExpiracion('clientes') > 80 ? '#ef4444' : '#22c55e'}
              className="mb-3"
            />
            
            <div className="flex gap-2">
              <Button 
                label="Invalidar" 
                icon="pi pi-trash" 
                className="p-button-danger p-button-sm"
                onClick={() => invalidarCache('clientes')}
                disabled={!estado.clientes.tieneDatos}
              />
              <Button 
                label="Actualizar" 
                icon="pi pi-refresh" 
                className="p-button-info p-button-sm"
                onClick={() => refrescarCache('clientes')}
                loading={refreshing}
              />
            </div>
          </div>
        </Card>
      </div>
      
      {/* Productos */}
      <div className="col-12 md:col-6">
        <Card title="Productos" className="mb-2">
          <div className="mb-3">
            <div className="flex justify-content-between align-items-center mb-2">
              <span>Estado:</span>
              <span className={`font-bold ${estado.productos.tieneDatos ? 'text-green-600' : 'text-red-600'}`}>
                {estado.productos.tieneDatos ? '✅ Cargado' : '❌ No cargado'}
              </span>
            </div>
            
            <div className="mb-2">
              <span className="text-sm">Última actualización:</span>
              <div className="font-mono text-xs bg-gray-100 p-1 rounded mt-1">
                {estado.productos.ultimaActualizacion}
              </div>
            </div>
            
            <div className="mb-2">
              <span className="text-sm">Tiempo transcurrido:</span>
              <div className="font-bold text-blue-600">
                {estado.productos.tiempoTranscurrido}
              </div>
            </div>
            
            <div className="mb-2">
              <span className="text-sm">Registros en cache:</span>
              <div className="font-bold">
                {estado.productos.registros.toLocaleString()}
              </div>
            </div>
            
            <div className="mb-3">
              <span className="text-sm">Expira en:</span>
              <div className="font-bold text-orange-600">
                {estado.productos.expiraEn}
              </div>
            </div>
            
            <ProgressBar 
              value={calcularPorcentajeExpiracion('productos')} 
              color={calcularPorcentajeExpiracion('productos') > 80 ? '#ef4444' : '#22c55e'}
              className="mb-3"
            />
            
            <div className="flex gap-2">
              <Button 
                label="Invalidar" 
                icon="pi pi-trash" 
                className="p-button-danger p-button-sm"
                onClick={() => invalidarCache('productos')}
                disabled={!estado.productos.tieneDatos}
              />
              <Button 
                label="Actualizar" 
                icon="pi pi-refresh" 
                className="p-button-info p-button-sm"
                onClick={() => refrescarCache('productos')}
                loading={refreshing}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* 🆕 Clientes Frontend */}
      <div className="col-12 md:col-6">
        <Card title="Clientes (Frontend)" className="mb-2">
          <div className="mb-3">
            <div className="flex justify-content-between align-items-center mb-2">
              <span>Estado:</span>
              <span className={`font-bold ${estado.clientesFrontend?.tieneDatos ? 'text-green-600' : 'text-red-600'}`}>
                {estado.clientesFrontend?.tieneDatos ? '✅ Cargado' : '❌ No cargado'}
              </span>
            </div>
            
            <div className="mb-2">
              <span className="text-sm">Última actualización:</span>
              <div className="font-mono text-xs bg-gray-100 p-1 rounded mt-1">
                {estado.clientesFrontend?.ultimaActualizacion || 'N/A'}
              </div>
            </div>
            
            <div className="mb-2">
              <span className="text-sm">Tiempo transcurrido:</span>
              <div className="font-bold text-blue-600">
                {estado.clientesFrontend?.tiempoTranscurrido || 'N/A'}
              </div>
            </div>
            
            <div className="mb-2">
              <span className="text-sm">Registros en cache:</span>
              <div className="font-bold">
                {estado.clientesFrontend?.registros?.toLocaleString() || '0'}
              </div>
            </div>
            
            <div className="mb-3">
              <span className="text-sm">Expira en:</span>
              <div className="font-bold text-orange-600">
                {estado.clientesFrontend?.expiraEn || 'N/A'}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                label="Limpiar Cache" 
                icon="pi pi-trash" 
                className="p-button-danger p-button-sm"
                onClick={() => {
                  localStorage.removeItem("clientes_catalogo");
                  cargarEstado();
                }}
                disabled={!estado.clientesFrontend?.tieneDatos}
              />
              <Button 
                label="Recargar" 
                icon="pi pi-refresh" 
                className="p-button-info p-button-sm"
                onClick={() => {
                  localStorage.removeItem("clientes_catalogo");
                  window.location.reload();
                }}
                loading={refreshing}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderLimpiezaDatos = () => (
    <div className="grid">
      {/* Configuración de limpieza */}
      <div className="col-12 md:col-6">
        <Card title="Configuración de Limpieza" className="mb-3">
          <div className="mb-3">
            <label className="block text-sm font-medium mb-2">Colección:</label>
            <Dropdown
              value={cleanupConfig.coleccion}
              options={coleccionesLimpieza}
              onChange={(e) => setCleanupConfig(prev => ({ ...prev, coleccion: e.value }))}
              placeholder="Seleccionar colección"
              className="w-full"
            />
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-2">Días de antigüedad:</label>
            <div className="text-lg font-bold text-blue-600">
              {cleanupConfig.dias} días
            </div>
            <small className="text-gray-600">
              Registros con más de {cleanupConfig.dias} días serán eliminados
            </small>
          </div>
          
          <div className="flex gap-2">
            <Button 
              label="Vista Previa" 
              icon="pi pi-eye" 
              className="p-button-info"
              onClick={obtenerVistaPrevia}
            />
            <Button 
              label="Exportar" 
              icon="pi pi-download" 
              className="p-button-success"
              onClick={exportarDatos}
              loading={exporting}
            />
          </div>
        </Card>
      </div>
      
      {/* Estadísticas de limpieza */}
      <div className="col-12 md:col-6">
        <Card title="Estadísticas de Datos Antiguos" className="mb-3">
          {cleanupStats ? (
            <div className="grid">
              {Object.entries(cleanupStats).map(([coleccion, stats]) => (
                <div key={coleccion} className="col-12 md:col-6">
                  <div className="p-3 border-round border-1 border-gray-200 mb-2">
                    <div className="font-bold text-capitalize mb-1">
                      {coleccion.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-sm text-gray-600">
                      Registros antiguos: <span className="font-bold text-red-600">{stats.antiguos}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Total registros: <span className="font-bold">{stats.total}</span>
                    </div>
                    {stats.antiguos > 0 && (
                      <div className="mt-2">
                        <ProgressBar 
                          value={(stats.antiguos / stats.total) * 100} 
                          color="#ef4444"
                          className="mb-2"
                        />
                        <small className="text-red-600">
                          {Math.round((stats.antiguos / stats.total) * 100)}% son antiguos
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-3">
              <ProgressSpinner size="small" />
              <p className="mt-2">Cargando estadísticas...</p>
            </div>
          )}
        </Card>
      </div>
      
      {/* Acciones de limpieza */}
      <div className="col-12">
        <Card title="Acciones de Limpieza" className="mb-3">
          <div className="flex justify-content-between align-items-center">
            <div>
              <h4 className="m-0">Eliminar Datos Antiguos</h4>
              <p className="text-sm text-gray-600 m-0">
                Eliminará registros de {cleanupConfig.coleccion} con más de {cleanupConfig.dias} días
              </p>
            </div>
            <Button 
              label="Ejecutar Limpieza" 
              icon="pi pi-trash" 
              className="p-button-danger"
              onClick={() => setShowCleanupDialog(true)}
              disabled={!cleanupStats || cleanupStats[cleanupConfig.coleccion]?.antiguos === 0}
            />
          </div>
        </Card>
      </div>
    </div>
  );

  const renderEstadisticas = () => (
    <div className="grid">
      <div className="col-12">
        <Card title="Resumen del Sistema" className="mb-3">
          <div className="grid">
            <div className="col-12 md:col-6">
              <h5 className="m-0 mb-2">Estado del Cache</h5>
              <ul className="list-none p-0 m-0">
                <li className="mb-1">
                  <span className="font-bold">Clientes:</span> {estado.clientes.tieneDatos ? '✅ Activo' : '❌ Inactivo'}
                </li>
                <li className="mb-1">
                  <span className="font-bold">Productos:</span> {estado.productos.tieneDatos ? '✅ Activo' : '❌ Inactivo'}
                </li>
                <li className="mb-1">
                  <span className="font-bold">Frontend:</span> {estado.clientesFrontend?.tieneDatos ? '✅ Activo' : '❌ Inactivo'}
                </li>
              </ul>
            </div>
            <div className="col-12 md:col-6">
              <h5 className="m-0 mb-2">Datos Antiguos</h5>
              {cleanupStats ? (
                <ul className="list-none p-0 m-0">
                  {Object.entries(cleanupStats).map(([coleccion, stats]) => (
                    <li key={coleccion} className="mb-1">
                      <span className="font-bold text-capitalize">
                        {coleccion.replace(/([A-Z])/g, ' $1').trim()}:
                      </span> {stats.antiguos} antiguos de {stats.total} total
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Cargando estadísticas...</p>
              )}
            </div>
          </div>
        </Card>
      </div>
      
      <div className="col-12">
        <Card title="Acciones Globales" className="mb-3">
          <div className="flex gap-2 flex-wrap">
            <Button 
              label="Invalidar Todo el Cache" 
              icon="pi pi-trash" 
              className="p-button-danger"
              onClick={() => invalidarCache('todos')}
            />
            <Button 
              label="Actualizar Todo el Cache" 
              icon="pi pi-refresh" 
              className="p-button-success"
              onClick={() => refrescarCache('todos')}
              loading={refreshing}
            />
            <Button 
              label="Recargar Estado" 
              icon="pi pi-sync" 
              className="p-button-outlined"
              onClick={cargarEstado}
              loading={loading}
            />
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <>
      <Toast ref={toast} />
      <ConfirmDialog />
      
      <Card title="Gestión de Datos" className="mb-3">
        <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
          <TabPanel header="Monitor de Cache">
            {renderCacheMonitor()}
          </TabPanel>
          <TabPanel header="Limpieza de Datos">
            {renderLimpiezaDatos()}
          </TabPanel>
          <TabPanel header="Estadísticas">
            {renderEstadisticas()}
          </TabPanel>
        </TabView>
      </Card>
      
      {/* Dialog de vista previa */}
      <Dialog 
        header={`Vista Previa - ${cleanupConfig.coleccion}`} 
        visible={showPreviewDialog} 
        onHide={() => setShowPreviewDialog(false)}
        style={{ width: '80vw' }}
        maximizable
      >
        <DataTable 
          value={previewData} 
          paginator 
          rows={10}
          className="p-datatable-sm"
        >
          <Column field="id" header="ID" style={{ width: '100px' }} />
          <Column field="fechaCreacion" header="Fecha Creación" />
          <Column field="estado" header="Estado" />
          <Column field="clienteNombre" header="Cliente" />
          <Column field="monto" header="Monto" />
        </DataTable>
        <div className="flex justify-content-end gap-2 mt-3">
          <Button 
            label="Cerrar" 
            className="p-button-outlined"
            onClick={() => setShowPreviewDialog(false)}
          />
          <Button 
            label="Exportar" 
            icon="pi pi-download" 
            className="p-button-success"
            onClick={exportarDatos}
            loading={exporting}
          />
        </div>
      </Dialog>
      
      {/* Dialog de confirmación de limpieza */}
      <Dialog 
        header="Confirmar Limpieza de Datos" 
        visible={showCleanupDialog} 
        onHide={() => setShowCleanupDialog(false)}
        style={{ width: '50vw' }}
      >
        <div className="p-3">
          <p className="mb-3">
            ¿Estás seguro de que quieres eliminar los registros antiguos de <strong>{cleanupConfig.coleccion}</strong>?
          </p>
          <div className="bg-red-50 p-3 border-round border-1 border-red-200 mb-3">
            <div className="flex align-items-center gap-2 mb-2">
              <i className="pi pi-exclamation-triangle text-red-600"></i>
              <span className="font-bold text-red-600">Advertencia</span>
            </div>
            <p className="text-sm text-red-700 m-0">
              Esta acción eliminará permanentemente los registros con más de {cleanupConfig.dias} días.
              Se recomienda exportar los datos antes de proceder.
            </p>
          </div>
          <div className="flex justify-content-end gap-2">
            <Button 
              label="Cancelar" 
              className="p-button-outlined"
              onClick={() => setShowCleanupDialog(false)}
            />
            <Button 
              label="Eliminar Datos" 
              icon="pi pi-trash" 
              className="p-button-danger"
              onClick={ejecutarLimpieza}
              loading={executing}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}

export default GestionDatos; 