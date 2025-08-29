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
import { ConfirmDialog } from 'primereact/confirmdialog';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Tag } from 'primereact/tag';
import { api } from '../services/api';
import * as XLSX from 'xlsx';
import AlegraConfig from './AlegraConfig';

function GestionDatos({ user }) {
  const [activeTab, setActiveTab] = useState(0);
  const [estado, setEstado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para limpieza de datos
  const [cleanupConfig, setCleanupConfig] = useState({
    dias: 30,
    coleccion: 'visitas',
    diasModificado: false
  });
  
  // Estados para exportación
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(null);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(null);
  const [filtroCliente, setFiltroCliente] = useState(null);
  const [exporting, setExporting] = useState(false);
  
  // Estado para clientes (usado en filtros de exportación)
  const [clientes, setClientes] = useState([]);
  
  // Configuración de campos para exportación
  const [camposExportacion, setCamposExportacion] = useState({
    visitas: ['clienteNombre', 'vendedorNombre', 'fecha', 'horario', 'estado', 'resultado', 'comentario'],
    hojasDeRuta: ['fecha', 'estado', 'responsable', 'total'],
    cobranzas: ['clienteNombre', 'vendedorNombre', 'monto', 'fecha', 'estado'],
    presupuestos: ['clienteNombre', 'vendedorNombre', 'total', 'estado', 'fechaCreacion']
  });
  const [previewData, setPreviewData] = useState([]);
  const [cleanupStats, setCleanupStats] = useState(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [executing, setExecuting] = useState(false);
  
  // Estados para sincronización
  const [syncNotifications, setSyncNotifications] = useState({
    clientes: false,
    productos: false
  });
  
  const toast = useRef(null);

  // Función para obtener el nombre del vendedor desde el caché
  const obtenerNombreVendedor = (vendedorId) => {
    if (!vendedorId) return 'N/A';
    
    // Mapeo hardcodeado de vendedores
    const vendedoresMap = {
      1: 'Guille',
      2: 'Santi'
    };
    
    // Si tenemos el ID en el mapeo, usarlo
    if (vendedoresMap[vendedorId]) {
      return vendedoresMap[vendedorId];
    }
    
    try {
      const vendedoresCache = localStorage.getItem("vendedores_catalogo");
      if (vendedoresCache) {
        const vendedores = JSON.parse(vendedoresCache).data;
        const vendedor = vendedores.find(v => v.id === vendedorId);
        if (vendedor) {
          return vendedor.nombre || vendedor.name || `Vendedor ${vendedorId}`;
        }
      }
    } catch (error) {
      console.log('Error obteniendo nombre de vendedor:', error);
    }
    return `Vendedor ${vendedorId}`;
  };

  // Función para obtener el nombre del vendedor desde registro
  const obtenerNombreVendedorDesdeRegistro = (registro) => {
    if (registro.vendedorNombre) {
      return registro.vendedorNombre;
    }
    if (registro.vendedorId) {
      return obtenerNombreVendedor(registro.vendedorId);
    }
    return 'N/A';
  };

  // Función para sincronizar clientes desde Alegra
  const sincronizarClientes = async () => {
    setRefreshing(true);
    try {
      const data = await api.syncClientesAlegra();
      
      if (data.success) {
        toast.current?.show({
          severity: 'success',
          summary: 'Sincronización Exitosa',
          detail: `${data.total} clientes sincronizados desde Alegra`
        });
        
        // Limpiar cache del frontend
        localStorage.removeItem("clientes_catalogo");
        
        // Recargar estado
        cargarEstado();
      }
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error de Sincronización',
        detail: 'No se pudieron sincronizar los clientes desde Alegra'
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Función para verificar si hay datos desactualizados
  const verificarActualizaciones = () => {
    const ahora = Date.now();
    const ttlClientes = 7 * 24 * 60 * 60 * 1000; // 7 días
    
    if (estado?.clientes?.ultimaActualizacion) {
      const ultimaActualizacion = new Date(estado.clientes.ultimaActualizacion).getTime();
      const tiempoTranscurrido = ahora - ultimaActualizacion;
      
      if (tiempoTranscurrido > ttlClientes) {
        setSyncNotifications(prev => ({ ...prev, clientes: true }));
      }
    }
  };

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
      
      // Agregar estado del caché del frontend
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

  // Función para obtener estado del caché del frontend
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

  // Funciones para limpieza de datos
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
      setExporting(true);
      toast.current?.show({
        severity: 'info',
        summary: 'Obteniendo vista previa...',
        detail: 'Buscando datos con los filtros aplicados',
        life: 3000
      });

      let data;
      
      // Usar la función apropiada según la colección
      switch (cleanupConfig.coleccion) {
        case 'hojasDeRuta':
          data = await api.getHojasDeRuta();
          break;
        case 'visitas':
          data = await api.getVisitas();
          break;
        case 'cobranzas':
          data = await api.getCobros({ page: 1, limit: 1000 });
          break;
        case 'presupuestos':
          data = await api.getPresupuestos({ page: 1, limit: 1000 });
          break;
        default:
          data = await api.getVisitas();
      }

      // Filtrar por fechas si están configuradas
      let registrosFiltrados = data.data || data || [];
      
      if (filtroFechaDesde || filtroFechaHasta) {
        registrosFiltrados = registrosFiltrados.filter(registro => {
          const fechaRegistro = registro.fecha || registro.fechaCreacion;
          if (!fechaRegistro) return false;
          
          const fecha = fechaRegistro._seconds ? new Date(fechaRegistro._seconds * 1000) : new Date(fechaRegistro);
          
          if (filtroFechaDesde && fecha < filtroFechaDesde) return false;
          if (filtroFechaHasta && fecha > filtroFechaHasta) return false;
          
          return true;
        });
      }

      // Filtrar por cliente si está configurado
      if (filtroCliente) {
        registrosFiltrados = registrosFiltrados.filter(registro => 
          registro.clienteId === filtroCliente || registro.cliente === filtroCliente
        );
      }

      // Filtrar por estado si está configurado
      if (filtroEstado && filtroEstado !== 'todos') {
        registrosFiltrados = registrosFiltrados.filter(registro => 
          registro.estado === filtroEstado
        );
      }

             // Enriquecer datos con información del cliente y vendedor
       const registrosEnriquecidos = await enriquecerDatos(registrosFiltrados);

      setPreviewData(registrosEnriquecidos);
      
      if (registrosEnriquecidos.length > 0) {
        setShowPreviewDialog(true);
        toast.current?.show({
          severity: 'success',
          summary: 'Vista previa obtenida',
          detail: `${registrosEnriquecidos.length} registros encontrados`,
          life: 3000
        });
      } else {
        toast.current?.show({
          severity: 'info',
          summary: 'Sin resultados',
          detail: 'No se encontraron registros con los filtros aplicados',
          life: 3000
        });
      }
    } catch (error) {
      console.error('Error obteniendo vista previa:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener la vista previa: ' + error.message,
        life: 5000
      });
    } finally {
      setExporting(false);
    }
  };

  const exportarDatos = async () => {
    setExporting(true);
    try {
      // Si no hay datos en preview, obtenerlos primero
      let datosParaExportar = previewData;
      
      if (datosParaExportar.length === 0) {
        toast.current?.show({
          severity: 'info',
          summary: 'Obteniendo datos...',
          detail: 'Primero obtén una vista previa para exportar',
          life: 3000
        });
        return;
      }
      
      toast.current?.show({
        severity: 'info',
        summary: 'Exportando...',
        detail: `Preparando archivo Excel con ${datosParaExportar.length} registros`,
        life: 3000
      });
      
      // Convertir JSON a Excel bien formateado
      if (datosParaExportar && datosParaExportar.length > 0) {
                 // Función para formatear valores
         const formatearValor = (valor, campo) => {
           if (valor === null || valor === undefined) {
             return '';
           }
           
           // Formatear fechas para que aparezcan en formato dd/mm/aaaa en Excel
           if (campo === 'fecha' && valor instanceof Date) {
             // Crear una fecha con el formato correcto para Excel
             const dia = valor.getDate().toString().padStart(2, '0');
             const mes = (valor.getMonth() + 1).toString().padStart(2, '0');
             const año = valor.getFullYear();
             return `${dia}/${mes}/${año}`;
           }
           
           // Formatear total como número
           if (campo === 'total' && typeof valor === 'number') {
             return valor;
           }
           
           // Formatear objetos JSON como strings legibles
           if (typeof valor === 'object') {
             if (valor._seconds) {
               // Convertir timestamp de Firebase a formato dd/mm/aaaa
               const fecha = new Date(valor._seconds * 1000);
               const dia = fecha.getDate().toString().padStart(2, '0');
               const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
               const año = fecha.getFullYear();
               return `${dia}/${mes}/${año}`;
             }
             return JSON.stringify(valor);
           }
           
           // Formatear strings
           if (typeof valor === 'string') {
             return valor;
           }
           
           return valor.toString();
         };
        
        // Obtener campos configurados para esta colección
        const camposConfigurados = camposExportacion[cleanupConfig.coleccion] || Object.keys(datosParaExportar[0]);
        
        // Crear headers con nombres legibles
        const headers = camposConfigurados.map(campo => {
          // Mapeo específico para hojas de ruta
          if (cleanupConfig.coleccion === 'hojasDeRuta') {
            const headerMap = {
              'fecha': 'Fecha',
              'estado': 'Estado',
              'responsable': 'Responsable',
              'total': 'Total'
            };
            return headerMap[campo] || campo.replace(/([A-Z])/g, ' $1').trim();
          }
          return campo.replace(/([A-Z])/g, ' $1').trim();
        });
        
        // Crear filas formateadas solo con campos configurados
        const rows = datosParaExportar.map(registro => {
          const fila = {};
          camposConfigurados.forEach(campo => {
            let valor;
            
            // Manejar campos especiales
            if (campo === 'vendedorNombre') {
              valor = registro.vendedorNombre || obtenerNombreVendedorDesdeRegistro(registro);
            } else if (campo === 'clienteNombre') {
              valor = registro.clienteNombre || registro.cliente || registro.clienteId || 'N/A';
            } else if (campo === 'responsable') {
              valor = registro.responsable || registro.vendedorNombre || obtenerNombreVendedorDesdeRegistro(registro) || 'N/A';
            } else if (campo === 'total') {
              valor = registro.total || 0;
            } else if (campo === 'comentario') {
              valor = registro.comentario || registro.observaciones || '';
            } else if (campo === 'resultado') {
              valor = registro.resultado || registro.observaciones || '';
            } else {
              valor = registro[campo];
            }
            
            fila[campo.replace(/([A-Z])/g, ' $1').trim()] = formatearValor(valor, campo);
          });
          return fila;
        });
        
        // Crear workbook y worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        
        // Configurar anchos de columna automáticos
        const columnWidths = headers.map(header => ({ wch: Math.max(header.length, 15) }));
        worksheet['!cols'] = columnWidths;
        
        // Agregar worksheet al workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, cleanupConfig.coleccion);
        
        // Generar archivo Excel
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exportacion_${cleanupConfig.coleccion}_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast.current?.show({
          severity: 'success',
          summary: 'Exportación Exitosa',
          detail: `${datosParaExportar.length} registros exportados correctamente en formato Excel`
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

  // Función para enriquecer datos con información del cliente y vendedor
  const enriquecerDatos = async (registros) => {
    try {
      // Obtener clientes del caché
      const cacheClientes = localStorage.getItem("clientes_catalogo");
      let clientesCache = [];
      if (cacheClientes) {
        const cacheData = JSON.parse(cacheClientes);
        clientesCache = cacheData.data || [];
      }

      // Enriquecer cada registro
      const registrosEnriquecidos = registros.map(registro => {
        const registroEnriquecido = { ...registro };
        
                          // Para hojas de ruta, usar los campos exactos de Firebase
          if (cleanupConfig.coleccion === 'hojasDeRuta') {
            // Formatear fecha para mejor legibilidad
            if (registro.fecha && registro.fecha.seconds) {
              registroEnriquecido.fecha = new Date(registro.fecha.seconds * 1000);
            } else if (registro.fecha && typeof registro.fecha === 'object' && registro.fecha._seconds) {
              registroEnriquecido.fecha = new Date(registro.fecha._seconds * 1000);
            } else if (registro.fecha && typeof registro.fecha === 'string') {
              // NUEVO: Manejar fechas que vienen como string ISO
              registroEnriquecido.fecha = new Date(registro.fecha);
            } else if (registro.fecha) {
              registroEnriquecido.fecha = new Date(registro.fecha);
            } else {
              registroEnriquecido.fecha = null;
            }
            
            // Mantener estado y responsable como están
            registroEnriquecido.estado = registro.estado || 'N/A';
            registroEnriquecido.responsable = registro.responsable || 'N/A';
            
            // Calcular total sumando todos los pedidos
            let totalCalculado = 0;
            if (registro.pedidos && Array.isArray(registro.pedidos)) {
              registro.pedidos.forEach(pedido => {
                if (pedido.total && typeof pedido.total === 'number') {
                  totalCalculado += pedido.total;
                }
              });
            }
            registroEnriquecido.total = totalCalculado;
            
            return registroEnriquecido;
          }
        
        // Para otras colecciones, mantener la lógica anterior
        if (registro.clienteId) {
          const cliente = clientesCache.find(c => c.id === registro.clienteId);
          if (cliente) {
            registroEnriquecido.clienteNombre = cliente.name || cliente.nombre || `Cliente ${registro.clienteId}`;
          } else {
            registroEnriquecido.clienteNombre = `Cliente ${registro.clienteId}`;
          }
        } else if (registro.cliente) {
          registroEnriquecido.clienteNombre = registro.cliente;
        } else {
          registroEnriquecido.clienteNombre = 'Sin cliente';
        }

        if (registro.vendedorId) {
          registroEnriquecido.vendedorNombre = obtenerNombreVendedor(registro.vendedorId);
        } else if (registro.vendedor) {
          registroEnriquecido.vendedorNombre = registro.vendedor;
        } else {
          registroEnriquecido.vendedorNombre = 'Sin vendedor';
        }

        return registroEnriquecido;
      });

      return registrosEnriquecidos;
    } catch (error) {
      console.error('Error enriqueciendo datos:', error);
      return registros; // Retornar datos originales si hay error
    }
  };

  // Función para cargar clientes para filtros
  const cargarClientes = async () => {
    try {
      const cache = localStorage.getItem("clientes_catalogo");
      if (cache) {
        const cacheData = JSON.parse(cache);
        setClientes(cacheData.data || []);
      }
    } catch (error) {
      console.log('Error cargando clientes:', error);
      setClientes([]);
    }
  };

  useEffect(() => {
    cargarEstado();
    obtenerEstadisticasLimpieza();
    cargarClientes();
    // Actualizar cada 30 segundos
    const interval = setInterval(() => {
      cargarEstado();
      obtenerEstadisticasLimpieza();
      verificarActualizaciones();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Actualizar días según la colección seleccionada solo si no se ha modificado manualmente
    const coleccion = coleccionesLimpieza.find(c => c.value === cleanupConfig.coleccion);
    if (coleccion && !cleanupConfig.diasModificado) {
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
      {/* Botón de sincronización prominente */}
      <div className="col-12">
        <Card title="Sincronización de Datos" className="mb-3">
          <div className="flex align-items-center justify-content-between">
            <div>
              <h4 className="m-0 mb-2">Sincronizar desde Alegra</h4>
              <p className="text-sm text-gray-600 m-0">
                Obtiene los últimos clientes y productos desde Alegra y los sincroniza con Firebase
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                label="Sincronizar Clientes" 
                icon="pi pi-sync" 
                className="p-button-success"
                onClick={sincronizarClientes}
                loading={refreshing}
              />
              <Button 
                label="Sincronizar Productos" 
                icon="pi pi-sync" 
                className="p-button-info"
                onClick={() => refrescarCache('productos')}
                loading={refreshing}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Configuración de Alegra */}
      <div className="col-12">
        <AlegraConfig />
      </div>

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
              <span className="text-sm">Registros en cache:</span>
              <div className="font-bold">
                {estado.clientes.registros.toLocaleString()}
              </div>
            </div>
            
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
              <Button 
                label="Sincronizar desde Alegra" 
                icon="pi pi-sync" 
                className="p-button-success p-button-sm"
                onClick={sincronizarClientes}
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
              <span className="text-sm">Registros en cache:</span>
              <div className="font-bold">
                {estado.productos.registros.toLocaleString()}
              </div>
            </div>
            
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
    </div>
  );

  const renderLimpiezaDatos = () => (
    <div className="grid">
      {/* Información principal */}
      <div className="col-12">
        <Card className="mb-3 border-orange-200 bg-orange-50">
          <div className="flex align-items-center gap-2">
            <i className="pi pi-exclamation-triangle text-orange-600"></i>
            <div className="flex-1">
              <h4 className="m-0 mb-1 text-orange-800">Limpieza de Datos Antiguos</h4>
              <p className="text-sm text-orange-700 m-0">
                Esta pestaña está diseñada específicamente para eliminar registros antiguos y optimizar la base de datos. 
                <strong>Importante:</strong> Siempre exporta los datos antes de eliminarlos.
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Configuración de limpieza */}
      <div className="col-12 md:col-6">
        <Card title="Configuración de Limpieza" className="mb-3">
          <div className="mb-3">
            <label className="block text-sm font-medium mb-2">Colección:</label>
            <Dropdown
              value={cleanupConfig.coleccion}
              options={coleccionesLimpieza}
              onChange={(e) => setCleanupConfig(prev => ({ 
                ...prev, 
                coleccion: e.value,
                diasModificado: false 
              }))}
              placeholder="Seleccionar colección"
              className="w-full"
            />
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-2">Días de antigüedad:</label>
            <div className="flex align-items-center gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={cleanupConfig.dias}
                onChange={(e) => setCleanupConfig(prev => ({ 
                  ...prev, 
                  dias: parseInt(e.target.value) || 1,
                  diasModificado: true 
                }))}
                className="p-inputtext p-component w-8rem"
                style={{ textAlign: 'center' }}
              />
              <span className="text-lg font-bold text-blue-600">días</span>
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
              label="Exportar Antes de Limpiar" 
              icon="pi pi-download" 
              className="p-button-warning"
              onClick={exportarDatos}
              loading={exporting}
              tooltip="Exporta los datos antes de eliminarlos (recomendado)"
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

  const renderExportacionDatos = () => (
    <div className="grid">
      {/* Información principal */}
      <div className="col-12">
        <Card className="mb-3 border-blue-200 bg-blue-50">
          <div className="flex align-items-center gap-2">
            <i className="pi pi-info-circle text-blue-600"></i>
            <div className="flex-1">
              <h4 className="m-0 mb-1 text-blue-800">Exportación de Datos</h4>
              <p className="text-sm text-blue-700 m-0">
                Esta pestaña te permite exportar datos de cualquier colección con filtros avanzados. 
                Perfecto para análisis, reportes o backup de datos específicos.
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Configuración de exportación */}
      <div className="col-12 md:col-6">
        <Card title="Configuración de Exportación" className="mb-3">
          <div className="mb-3">
            <label className="block text-sm font-medium mb-2">Colección:</label>
            <Dropdown
              value={cleanupConfig.coleccion}
              options={coleccionesLimpieza}
              onChange={(e) => setCleanupConfig(prev => ({ 
                ...prev, 
                coleccion: e.value,
                diasModificado: false 
              }))}
              placeholder="Seleccionar colección"
              className="w-full"
            />
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-2">Filtros de Fecha:</label>
            <div className="grid">
              <div className="col-12 md:col-6">
                <label className="block text-sm mb-1">Desde:</label>
                <Calendar
                  value={filtroFechaDesde}
                  onChange={(e) => setFiltroFechaDesde(e.value)}
                  showIcon
                  dateFormat="dd/mm/yyyy"
                  placeholder="Fecha desde"
                  className="w-full"
                />
              </div>
              <div className="col-12 md:col-6">
                <label className="block text-sm mb-1">Hasta:</label>
                <Calendar
                  value={filtroFechaHasta}
                  onChange={(e) => setFiltroFechaHasta(e.value)}
                  showIcon
                  dateFormat="dd/mm/yyyy"
                  placeholder="Fecha hasta"
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          <div className="mb-3">
            {previewData.length > 0 && (
              <div className="p-2 bg-blue-50 border-round border-1 border-blue-200">
                <span className="text-sm font-medium text-blue-800">
                  📊 {previewData.length} registros listos para exportar
                </span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              label="Vista Previa" 
              icon="pi pi-eye" 
              className="p-button-info"
              onClick={obtenerVistaPrevia}
            />
            <Button 
              label="Exportar Excel" 
              icon="pi pi-download" 
              className="p-button-success"
              onClick={exportarDatos}
              loading={exporting}
            />
            {(filtroFechaDesde || filtroFechaHasta || filtroCliente || filtroEstado !== 'todos') && (
              <Button 
                label="Limpiar Filtros" 
                icon="pi pi-times" 
                className="p-button-secondary"
                onClick={() => {
                  setFiltroFechaDesde(null);
                  setFiltroFechaHasta(null);
                  setFiltroCliente(null);
                  setFiltroEstado('todos');
                  setPreviewData([]); // Limpiar también los datos de preview
                }}
              />
            )}
          </div>
        </Card>
      </div>
      
      {/* Vista previa de datos */}
      <div className="col-12 md:col-6">
        <Card title="Vista Previa de Datos" className="mb-3">
          <div className="mb-3">
            <p className="text-sm text-gray-600">
              <strong>Instrucciones:</strong> Primero selecciona una colección y configura los filtros, 
              luego haz clic en "Vista Previa" para ver los datos antes de exportar.
            </p>
          </div>
          
          {previewData.length > 0 ? (
            <div>
              <div className="mb-3">
                <Tag 
                  value={`${previewData.length} registros encontrados`} 
                  severity="info"
                  className="mb-2"
                />
                <p className="text-sm text-gray-600">
                  Mostrando vista previa de los datos que se exportarán
                </p>
              </div>
              
              <div className="max-h-60 overflow-y-auto border-round border-1 border-gray-200 p-2">
                {previewData.slice(0, 5).map((registro, index) => (
                  <div key={index} className="p-2 border-bottom-1 border-gray-100">
                    <div className="font-medium text-sm">
                      {registro.clienteNombre || registro.clienteId || 'Cliente N/A'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {registro.fecha ? new Date(registro.fecha._seconds * 1000).toLocaleDateString() : 'Fecha N/A'} - 
                      {obtenerNombreVendedorDesdeRegistro(registro)}
                    </div>
                  </div>
                ))}
                {previewData.length > 5 && (
                  <div className="text-center text-sm text-gray-500 p-2">
                    ... y {previewData.length - 5} registros más
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center p-3">
              <i className="pi pi-eye text-gray-400" style={{ fontSize: '2rem' }}></i>
              <p className="text-gray-500 mt-2">Haz clic en "Vista Previa" para ver los datos</p>
            </div>
          )}
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
          <TabPanel header="Exportación de Datos">
            {renderExportacionDatos()}
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
              emptyMessage="No hay registros para mostrar"
            >
                           {/* Columnas para Hojas de Ruta */}
                             <Column 
                 field="fecha" 
                 header="Fecha" 
                 body={(rowData) => {
                   if (rowData.fecha instanceof Date) {
                     return rowData.fecha.toLocaleDateString('es-ES');
                   }
                   if (rowData.fecha && rowData.fecha._seconds) {
                     return new Date(rowData.fecha._seconds * 1000).toLocaleDateString('es-ES');
                   }
                   if (rowData.fechaCreacion && rowData.fechaCreacion._seconds) {
                     return new Date(rowData.fechaCreacion._seconds * 1000).toLocaleDateString('es-ES');
                   }
                   return rowData.fecha || rowData.fechaCreacion || 'N/A';
                 }}
               />
              
                             <Column 
                 field="estado" 
                 header="Estado" 
                 body={(rowData) => rowData.estado || 'N/A'}
               />
              
                             <Column 
                 field="responsable" 
                 header="Responsable" 
                 body={(rowData) => rowData.responsable || 'N/A'}
               />
              
                             <Column 
                 field="total" 
                 header="Total" 
                 body={(rowData) => {
                   const total = rowData.total || 0;
                   return typeof total === 'number' ? `$${total.toLocaleString('es-AR')}` : total;
                 }}
               />
           </DataTable>
        
        <div className="flex justify-content-end gap-2 mt-3">
          <Button 
            label="Cerrar" 
            className="p-button-outlined"
            onClick={() => setShowPreviewDialog(false)}
          />
          <Button 
            label="Exportar Excel" 
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