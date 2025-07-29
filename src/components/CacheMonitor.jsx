import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';

function CacheMonitor() {
  const [estado, setEstado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useRef(null);

  const cargarEstado = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cache/status');
      const data = await response.json();
      
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
      const response = await fetch('/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo })
      });
      const data = await response.json();
      
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
      const response = await fetch('/api/cache/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo })
      });
      const data = await response.json();
      
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

  useEffect(() => {
    cargarEstado();
    // Actualizar cada 30 segundos
    const interval = setInterval(cargarEstado, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!estado) {
    return (
      <Card title="Monitor de Cache" className="mb-3">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', marginBottom: '1rem' }}></div>
          <p>Cargando estado del cache...</p>
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

  return (
    <>
      <Toast ref={toast} />
      <Card title="Monitor de Cache Compartido" className="mb-3">
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
        
        {/* Acciones globales */}
        <div className="mt-3 pt-3 border-top-1 border-gray-200">
          <div className="flex justify-content-between align-items-center">
            <div>
              <h4 className="m-0">Acciones Globales</h4>
              <p className="text-sm text-gray-600 m-0">
                Gestiona todo el cache desde aquí
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                label="Invalidar Todo" 
                icon="pi pi-trash" 
                className="p-button-danger"
                onClick={() => invalidarCache('todos')}
              />
              <Button 
                label="Actualizar Todo" 
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
          </div>
        </div>
        
        {/* Información del sistema */}
        <div className="mt-3 pt-3 border-top-1 border-gray-200">
          <div className="grid">
            <div className="col-12 md:col-6">
              <h5 className="m-0 mb-2">Configuración</h5>
              <ul className="list-none p-0 m-0">
                <li className="mb-1">
                  <span className="font-bold">Clientes:</span> TTL 7 días
                </li>
                <li className="mb-1">
                  <span className="font-bold">Productos:</span> TTL 12 horas
                </li>
                <li className="mb-1">
                  <span className="font-bold">Actualización automática:</span> Cada 30 segundos
                </li>
              </ul>
            </div>
            <div className="col-12 md:col-6">
              <h5 className="m-0 mb-2">Beneficios</h5>
              <ul className="list-none p-0 m-0">
                <li className="mb-1">✅ 95% reducción de lecturas de Firebase</li>
                <li className="mb-1">✅ Cache compartido entre todos los dispositivos</li>
                <li className="mb-1">✅ Actualización automática según TTL</li>
                <li className="mb-1">✅ Control manual del cache</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

export default CacheMonitor;