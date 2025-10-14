import React, { useEffect, useState } from "react";
import { Card } from "primereact/card";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import BackendStatus from "../../components/BackendStatus";
import { ALEGRA_CONFIG } from "../../config/alegra.js";
import { getCobros, getCobrosByVendedor } from "../../features/cobros/cobrosService";

function Dashboard({ user }) {
  const navigate = useNavigate();
  // Eliminamos las estadísticas de cobros y pedidos que ya no se usan
  
  // Nuevo estado para estadísticas de visitas
  const [visitasStats, setVisitasStats] = useState({
    total: 0,
    pendientes: 0,
    realizadas: 0,
    noRealizadas: 0,
    visitasHoy: 0
  });
  
  // Nuevo estado para estadísticas de facturas/envíos
  const [facturasStats, setFacturasStats] = useState({
    total: 0,
    pendientes: 0,
    enReparto: 0,
    entregadas: 0
  });

  // Estado para estadísticas de cobros
  const [cobrosStats, setCobrosStats] = useState({
    totalMes: 0,
    totalMonto: 0,
    pendientesPorCargar: 0,
    cargadosEnSistema: 0
  });

  // Eliminamos las funciones de cobros que ya no se usan

  // Eliminamos las funciones de cobros que ya no se usan

  // Obtener el sellerId según el rol del usuario
  const getSellerId = () => {
    if (user?.role === 'Guille') return 1;
    if (user?.role === 'Santi') return 2;
    if (user?.role === 'admin') return null; // Admin ve todos
    return null;
  };

  // Cargar estadísticas de visitas
  useEffect(() => {
    const fetchVisitas = async () => {
      try {
        const sellerId = getSellerId();
        // 🆕 Usar endpoint con caché
        const visitas = sellerId ? await api.getVisitasCache(sellerId) : await api.getVisitasCache();
        
        const hoy = new Date().toISOString().split('T')[0];
        
        // Filtrar solo visitas del día de hoy
        const visitasHoy = visitas.filter(v => v.fecha === hoy);
        
        setVisitasStats({
          total: visitasHoy.length, // Total de visitas del día
          pendientes: visitasHoy.filter(v => v.estado === 'pendiente').length,
          realizadas: visitasHoy.filter(v => v.estado === 'realizada').length,
          noRealizadas: visitasHoy.filter(v => v.estado === 'no_realizada').length,
          visitasHoy: visitasHoy.length // Visitas del día (mismo que total)
        });
      } catch (error) {
        console.error('Error cargando visitas:', error);
        setVisitasStats({
          total: 0,
          pendientes: 0,
          realizadas: 0,
          noRealizadas: 0,
          visitasHoy: 0
        });
      }
    };
    
    fetchVisitas();
  }, [user]);

  // 🆕 Obtener facturas de Alegra para mostrar en el dashboard
  const cargarFacturasAlegra = async () => {
    try {
      setLoadingFacturas(true);
      // 🆕 Obtener facturas usando configuración de Alegra con paginación múltiple
      const facturas = await api.getAlegraInvoices(
        ALEGRA_CONFIG.INVOICES.DEFAULT_DAYS,
        ALEGRA_CONFIG.INVOICES.MAX_PER_REQUEST,
        ALEGRA_CONFIG.INVOICES.DEFAULT_TOTAL
      );
      setFacturasAlegra(facturas);
      console.log(`✅ Facturas de Alegra cargadas: ${facturas.length} (configuración: ${ALEGRA_CONFIG.INVOICES.DEFAULT_TOTAL} total, ${ALEGRA_CONFIG.INVOICES.MAX_PER_REQUEST} por petición)`);
    } catch (error) {
      console.error('❌ Error cargando facturas de Alegra:', error);
      setFacturasAlegra([]);
    } finally {
      setLoadingFacturas(false);
    }
  };

  // Cargar estadísticas de facturas/envíos (solo para admin)
  useEffect(() => {
    const fetchFacturas = async () => {
      if (user.role !== 'admin') return;
      
      try {
        // 🆕 Obtener facturas usando configuración de Alegra con paginación múltiple
        const facturas = await api.getAlegraInvoices(
          ALEGRA_CONFIG.INVOICES.DEFAULT_DAYS,
          ALEGRA_CONFIG.INVOICES.MAX_PER_REQUEST,
          ALEGRA_CONFIG.INVOICES.DEFAULT_TOTAL
        );
        
        // 🆕 Obtener hojas de ruta para calcular estados
        const hojasDeRuta = await api.getHojasDeRuta();
        
        // 🆕 Calcular estados según la lógica de la pantalla de Envíos
        let pendientes = 0;
        let enReparto = 0;
        let entregadas = 0;
        
        facturas.forEach(factura => {
          // Buscar si la factura está en alguna hoja de ruta
          let estado = 'pendiente'; // Por defecto
          
          for (const hoja of hojasDeRuta) {
            const pedido = hoja.pedidos?.find(p => p.id === factura.id);
            if (pedido) {
              if (pedido.entregado) {
                estado = 'entregado';
              } else {
                estado = 'en_reparto';
              }
              break;
            }
          }
          
          // Contar según el estado
          switch (estado) {
            case 'pendiente':
              pendientes++;
              break;
            case 'en_reparto':
              enReparto++;
              break;
            case 'entregado':
              entregadas++;
              break;
          }
        });
        
        setFacturasStats({
          total: facturas.length,
          pendientes,
          enReparto,
          entregadas
        });
      } catch (error) {
        console.error('Error cargando facturas:', error);
        setFacturasStats({
          total: 0,
          pendientes: 0,
          enReparto: 0,
          entregadas: 0
        });
      }
    };
    
    fetchFacturas();
  }, [user]);

  // Cargar estadísticas de cobros
  useEffect(() => {
    const fetchCobros = async () => {
      try {
        // Obtener cobros del mes actual
        const mesActual = new Date();
        const primerDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
        const ultimoDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);
        
        // Determinar si es admin o vendedor
        const esAdmin = user.role === 'admin';
        const vendedorEmail = esAdmin ? null : user.email;
        
        // Obtener cobros según el rol
        const cobros = esAdmin 
          ? await getCobros() 
          : await getCobrosByVendedor(vendedorEmail);
        
        // Filtrar cobros del mes actual
        const cobrosDelMes = cobros.filter(cobro => {
          const fechaCobro = cobro.fechaCobro?.toDate ? cobro.fechaCobro.toDate() : new Date(cobro.fechaCobro);
          return fechaCobro >= primerDiaMes && fechaCobro <= ultimoDiaMes;
        });
        
        // Calcular estadísticas
        const totalMes = cobrosDelMes.length;
        const totalMonto = cobrosDelMes.reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
        const pendientesPorCargar = cobrosDelMes.filter(cobro => cobro.estado === 'pendiente').length;
        const cargadosEnSistema = cobrosDelMes.filter(cobro => cobro.estado === 'cargado').length;
        
        setCobrosStats({
          totalMes,
          totalMonto,
          pendientesPorCargar,
          cargadosEnSistema
        });
      } catch (error) {
        console.error('Error cargando estadísticas de cobros:', error);
        setCobrosStats({
          totalMes: 0,
          totalMonto: 0,
          pendientesPorCargar: 0,
          cargadosEnSistema: 0
        });
      }
    };
    
    fetchCobros();
  }, [user]);

  // Eliminamos las funciones de presupuestos y pedidos que ya no se usan

  // Eliminamos las funciones de filtrado que ya no se usan

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const getDashboardTitle = () => {
    if (user.role === "admin") {
      return "Dashboard General";
    } else if (user.role === "Santi" || user.role === "Guille") {
      return `Dashboard de ${user.name}`;
    } else {
      return "Dashboard";
    }
  };

  return (
    <div className="p-p-1 p-p-md-2 p-p-lg-3 dashboard-main-container" style={{ maxWidth: "100%", margin: "0 auto", overflow: "hidden" }}>
      <div className="p-text-center p-mb-2">
        <h2 className="p-text-md p-text-lg" style={{ color: "#1f2937", wordWrap: "break-word", marginBottom: "0.5rem" }}>
          {getDashboardTitle()}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: '#10b981', 
            animation: 'pulse 2s infinite' 
          }}></div>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Actualización en tiempo real
          </span>
        </div>
      </div>

      {/* Estado del Backend */}
      <div className="dashboard-backend-status" style={{ maxWidth: 480, margin: '0 auto', marginBottom: 16, width: '100%' }}>
        <BackendStatus />
      

      </div>

      {/* Eliminamos la sección de cobranzas que ya no se usa */}

      {/* Grupo de Visitas (solo para vendedores) */}
      {(user.role === "Santi" || user.role === "Guille") && (
        <div className="dashboard-visitas-container" style={{ maxWidth: 480, margin: '0 auto', marginTop: 24, width: '100%' }}>
          <h3 className="p-text-center p-mb-2 p-text-sm" style={{ color: '#1f2937', fontWeight: 600, marginTop: 24 }}>Mis Visitas de Hoy</h3>
          <Card className="p-p-3 p-mb-4" style={{ borderRadius: 12, width: '100%', boxSizing: 'border-box' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li className="p-d-flex p-ai-center p-jc-between p-mb-2" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                <span className="p-d-flex p-ai-center"><i className="pi pi-calendar p-mr-2" style={{ color: '#8b5cf6', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Total Visitas Hoy</span></span>
                <span style={{ color: '#8b5cf6', fontWeight: 600, marginLeft: 12 }}>{visitasStats.total}</span>
              </li>
              <li className="p-d-flex p-ai-center p-jc-between p-mb-2" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                <span className="p-d-flex p-ai-center"><i className="pi pi-clock p-mr-2" style={{ color: '#f59e0b', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Pendientes Hoy</span></span>
                <span style={{ color: '#f59e0b', fontWeight: 600, marginLeft: 12 }}>{visitasStats.pendientes}</span>
              </li>
              <li className="p-d-flex p-ai-center p-jc-between p-mb-2" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                <span className="p-d-flex p-ai-center"><i className="pi pi-check-circle p-mr-2" style={{ color: '#22c55e', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Realizadas Hoy</span></span>
                <span style={{ color: '#22c55e', fontWeight: 600, marginLeft: 12 }}>{visitasStats.realizadas}</span>
              </li>
              <li className="p-d-flex p-ai-center p-jc-between" style={{ paddingBottom: 0 }}>
                <span className="p-d-flex p-ai-center"><i className="pi pi-times-circle p-mr-2" style={{ color: '#ef4444', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>No Realizadas Hoy</span></span>
                <span style={{ color: '#ef4444', fontWeight: 600, marginLeft: 12 }}>{visitasStats.noRealizadas}</span>
              </li>
            </ul>
          </Card>
        </div>
      )}

      {/* Grupo de Cobros */}
      {(user.role === "Santi" || user.role === "Guille" || user.role === "admin") && (
        <div className="dashboard-cobros-container" style={{ maxWidth: 480, margin: '0 auto', marginTop: 24, width: '100%' }}>
          <h3 className="p-text-center p-mb-2 p-text-sm" style={{ color: '#1f2937', fontWeight: 600, marginTop: 24 }}>
            {user.role === 'admin' ? 'Cobros del Mes' : 'Mis Cobros del Mes'}
          </h3>
          <Card className="p-p-3 p-mb-4" style={{ borderRadius: 12, width: '100%', boxSizing: 'border-box' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li className="p-d-flex p-ai-center p-jc-between p-mb-2" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                <span className="p-d-flex p-ai-center"><i className="pi pi-dollar p-mr-2" style={{ color: '#10b981', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Total Cobros del Mes</span></span>
                <span style={{ color: '#10b981', fontWeight: 600, marginLeft: 12 }}>{cobrosStats.totalMes}</span>
              </li>
              <li className="p-d-flex p-ai-center p-jc-between p-mb-2" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                <span className="p-d-flex p-ai-center"><i className="pi pi-money-bill p-mr-2" style={{ color: '#3b82f6', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Total Monto</span></span>
                <span style={{ color: '#3b82f6', fontWeight: 600, marginLeft: 12 }}>{formatCurrency(cobrosStats.totalMonto)}</span>
              </li>
              <li className="p-d-flex p-ai-center p-jc-between p-mb-2" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                <span className="p-d-flex p-ai-center"><i className="pi pi-clock p-mr-2" style={{ color: '#f59e0b', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Pendientes por Cargar</span></span>
                <span style={{ color: '#f59e0b', fontWeight: 600, marginLeft: 12 }}>{cobrosStats.pendientesPorCargar}</span>
              </li>
              <li className="p-d-flex p-ai-center p-jc-between" style={{ paddingBottom: 0 }}>
                <span className="p-d-flex p-ai-center"><i className="pi pi-check-circle p-mr-2" style={{ color: '#22c55e', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Cargados en Sistema</span></span>
                <span style={{ color: '#22c55e', fontWeight: 600, marginLeft: 12 }}>{cobrosStats.cargadosEnSistema}</span>
              </li>
            </ul>
          </Card>
        </div>
      )}

      {/* Grupo de Envíos (solo para admin) */}
      {user.role === "admin" && (
        <div className="dashboard-envios-container" style={{ maxWidth: 480, margin: '0 auto', marginTop: 24, width: '100%' }}>
          <h3 className="p-text-center p-mb-2 p-text-sm" style={{ color: '#1f2937', fontWeight: 600, marginTop: 24 }}>Envíos</h3>
          <Card className="p-p-3 p-mb-4" style={{ borderRadius: 12, width: '100%', boxSizing: 'border-box' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li className="p-d-flex p-ai-center p-jc-between p-mb-2" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                <span className="p-d-flex p-ai-center"><i className="pi pi-truck p-mr-2" style={{ color: '#0ea5e9', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Total Facturas</span></span>
                <span style={{ color: '#0ea5e9', fontWeight: 600, marginLeft: 12 }}>{facturasStats.total}</span>
              </li>
              <li className="p-d-flex p-ai-center p-jc-between p-mb-2" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                <span className="p-d-flex p-ai-center"><i className="pi pi-clock p-mr-2" style={{ color: '#f59e0b', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Pendientes</span></span>
                <span style={{ color: '#f59e0b', fontWeight: 600, marginLeft: 12 }}>{facturasStats.pendientes}</span>
              </li>
              <li className="p-d-flex p-ai-center p-jc-between p-mb-2" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                <span className="p-d-flex p-ai-center"><i className="pi pi-map-marker p-mr-2" style={{ color: '#8b5cf6', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>En Reparto</span></span>
                <span style={{ color: '#8b5cf6', fontWeight: 600, marginLeft: 12 }}>{facturasStats.enReparto}</span>
              </li>
              <li className="p-d-flex p-ai-center p-jc-between" style={{ paddingBottom: 0 }}>
                <span className="p-d-flex p-ai-center"><i className="pi pi-check-circle p-mr-2" style={{ color: '#22c55e', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Entregadas</span></span>
                <span style={{ color: '#22c55e', fontWeight: 600, marginLeft: 12 }}>{facturasStats.entregadas}</span>
              </li>
            </ul>
          </Card>
        </div>
      )}

      {/* Eliminamos el botón de actualizar que ya no se usa */}

      {/* Estilos responsive específicos para el dashboard */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        @media (max-width: 768px) {
          .dashboard-main-container {
            padding: 0.5rem !important;
          }
          .dashboard-alerts-container,
          .dashboard-cobros-container,
          .dashboard-visitas-container,
          .dashboard-envios-container {
            max-width: 100% !important;
            padding: 0.25rem !important;
          }
          .p-card {
            padding: 0.5rem !important;
          }
          h2, h3 {
            font-size: 1.1rem !important;
            word-break: break-word !important;
          }
        }
        @media (max-width: 480px) {
          .dashboard-main-container {
            padding: 0.25rem !important;
          }
          .dashboard-alerts-container,
          .dashboard-cobros-container,
          .dashboard-visitas-container,
          .dashboard-envios-container {
            padding: 0.1rem !important;
          }
          h2, h3 {
            font-size: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard; 