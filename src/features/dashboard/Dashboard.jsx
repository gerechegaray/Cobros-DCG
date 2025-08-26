import React, { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import { collection, query, getDocs, onSnapshot, orderBy } from "firebase/firestore";
import { Card } from "primereact/card";
import { ProgressBar } from "primereact/progressbar";
import { Button } from "primereact/button";
import Alerts from "./Alerts";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import BackendStatus from "../../components/BackendStatus";

function Dashboard({ user, onNavigateToCobros, onNavigateToMyCobros }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCobranzas: 0,
    totalMonto: 0,
    cargadasEnSistema: 0,
    pendientesDeCarga: 0,
    montoMes: 0,
    montoSemana: 0
  });
  const [userCobros, setUserCobros] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [pedidosStats, setPedidosStats] = useState({
    total: 0,
    pendientes: 0,
    recibidos: 0
  });
  
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

  const fetchCobranzas = async (force = false) => {
    let data = [];
    if (!force) {
      const cache = localStorage.getItem("cobranzas_dashboard");
      if (cache) {
        data = JSON.parse(cache);
        // Aplicar filtrado por rol también al cache
        let filteredData = data;
        if (user.role === "Santi" || user.role === "Guille") {
          filteredData = data.filter(cobro => cobro.cobrador === user.role);
        } else if (user.role === "admin") {
          filteredData = data;
        }
        setUserCobros(filteredData);
        
        // Calcular stats con datos filtrados
        const totalCobranzas = filteredData.length;
        const totalMonto = filteredData.reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
        
        // Calcular montos por período
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay());
        
        const montoMes = filteredData
          .filter(cobro => {
            let fechaCobro;
            if (cobro.fecha?.toDate) {
              fechaCobro = cobro.fecha.toDate();
            } else if (cobro.fecha instanceof Date) {
              fechaCobro = cobro.fecha;
            } else {
              fechaCobro = new Date(cobro.fecha);
            }
            return fechaCobro >= inicioMes;
          })
          .reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
        
        const montoSemana = filteredData
          .filter(cobro => {
            let fechaCobro;
            if (cobro.fecha?.toDate) {
              fechaCobro = cobro.fecha.toDate();
            } else if (cobro.fecha instanceof Date) {
              fechaCobro = cobro.fecha;
            } else {
              fechaCobro = new Date(cobro.fecha);
            }
            return fechaCobro >= inicioSemana;
          })
          .reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
        
        setStats(prev => ({ 
          ...prev, 
          totalCobranzas, 
          totalMonto,
          montoMes,
          montoSemana
        }));
        return;
      }
    }
    const q = query(collection(db, "cobros"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    localStorage.setItem("cobranzas_dashboard", JSON.stringify(data));
    let filteredData = data;
    if (user.role === "Santi" || user.role === "Guille") {
      filteredData = data.filter(cobro => cobro.cobrador === user.role);
    } else if (user.role === "admin") {
      filteredData = data;
    }
    setUserCobros(filteredData);
    const totalCobranzas = filteredData.length;
    const totalMonto = filteredData.reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
    
    // Calcular montos por período
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    
    const montoMes = filteredData
      .filter(cobro => {
        let fechaCobro;
        if (cobro.fecha?.toDate) {
          fechaCobro = cobro.fecha.toDate();
        } else if (cobro.fecha instanceof Date) {
          fechaCobro = cobro.fecha;
        } else {
          fechaCobro = new Date(cobro.fecha);
        }
        return fechaCobro >= inicioMes;
      })
      .reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
    
    const montoSemana = filteredData
      .filter(cobro => {
        let fechaCobro;
        if (cobro.fecha?.toDate) {
          fechaCobro = cobro.fecha.toDate();
        } else if (cobro.fecha instanceof Date) {
          fechaCobro = cobro.fecha;
        } else {
          fechaCobro = new Date(cobro.fecha);
        }
        return fechaCobro >= inicioSemana;
      })
      .reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
    
    setStats(prev => ({ 
      ...prev, 
      totalCobranzas, 
      totalMonto,
      montoMes,
      montoSemana
    }));
  };

  // Función para limpiar cache y recargar datos
  const limpiarCacheYRecargar = () => {
    localStorage.removeItem("cobranzas_dashboard");
    localStorage.removeItem("cobranzas_list");
    fetchCobranzas(true);
  };

  // 🆕 Real-time listener para actualización automática
  useEffect(() => {
    // Configurar listener en tiempo real
    const q = query(collection(db, "cobros"), orderBy("fecha", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      // Actualizar cache local
      localStorage.setItem("cobranzas_dashboard", JSON.stringify(data));
      
      // Aplicar filtrado por rol
      let filteredData = data;
      if (user.role === "Santi" || user.role === "Guille") {
        filteredData = data.filter(cobro => cobro.cobrador === user.role);
      } else if (user.role === "admin") {
        filteredData = data;
      }
      
      setUserCobros(filteredData);
      
      // Calcular stats con datos filtrados
      const totalCobranzas = filteredData.length;
      const totalMonto = filteredData.reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
      
      // Calcular montos por período
      const hoy = new Date();
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay());
      
      const montoMes = filteredData
        .filter(cobro => {
          let fechaCobro;
          if (cobro.fecha?.toDate) {
            fechaCobro = cobro.fecha.toDate();
          } else if (cobro.fecha instanceof Date) {
            fechaCobro = cobro.fecha;
          } else {
            fechaCobro = new Date(cobro.fecha);
          }
          return fechaCobro >= inicioMes;
        })
        .reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
      
      const montoSemana = filteredData
        .filter(cobro => {
          let fechaCobro;
          if (cobro.fecha?.toDate) {
            fechaCobro = cobro.fecha.toDate();
          } else if (cobro.fecha instanceof Date) {
            fechaCobro = cobro.fecha;
          } else {
            fechaCobro = new Date(cobro.fecha);
          }
          return fechaCobro >= inicioSemana;
        })
        .reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
      
      setStats(prev => ({ 
        ...prev, 
        totalCobranzas, 
        totalMonto,
        montoMes,
        montoSemana
      }));
    }, (error) => {
      console.error("Error en real-time listener:", error);
    });
    
    // Cleanup: desuscribirse cuando el componente se desmonte
    return () => unsubscribe();
  }, [user.role]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchCobranzas();
  }, [user]);

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

  // Cargar estadísticas de facturas/envíos (solo para admin)
  useEffect(() => {
    const fetchFacturas = async () => {
      if (user.role !== 'admin') return;
      
      try {
        // 🆕 Obtener 60 facturas en lugar de 5 para mejor cobertura
        const facturas = await api.getAlegraInvoices(5, 60);
        
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

  useEffect(() => {
    const fetchPresupuestos = async () => {
      try {
        const presupuestosQ = query(collection(db, "presupuestos"));
        const querySnapshot = await getDocs(presupuestosQ);
        let data = [];
        querySnapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setPresupuestos(data);
      } catch (error) {
        console.error("Error cargando presupuestos:", error);
        setPresupuestos([]);
      }
    };
    fetchPresupuestos();
  }, [user]);

  useEffect(() => {
    const fetchPedidos = async () => {
      const pedidosQ = query(collection(db, "pedidosClientes"));
      const querySnapshot = await getDocs(pedidosQ);
      let data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      // Filtrar por rol
      let filtered = data;
      if (user.role === "Santi" || user.role === "Guille") {
        filtered = data.filter(p => p.cobrador === user.role);
      } else if (user.role === "admin") {
        filtered = data;
      } else {
        filtered = [];
      }
      setPedidosStats({
        total: filtered.length,
        pendientes: filtered.filter(p => p.estadoRecepcion === "pendiente").length,
        recibidos: filtered.filter(p => p.estadoRecepcion === "recibido").length
      });
    };
    fetchPedidos();
  }, [user]);

  // Filtrar datos según el rol del usuario
  const getFilteredData = (data) => {
    if (user.role === "Santi" || user.role === "Guille") {
      return data.filter(cobro => cobro.cobrador === user.role);
    } else if (user.role === "admin") {
      return data;
    }
    return data;
  };

  // Filtrar presupuestos según el rol del usuario
  const getFilteredPresupuestos = (data) => {
    if (user.role === "Santi" || user.role === "Guille") {
      return data.filter(p => p.cobrador === user.role);
    } else if (user.role === "admin") {
      return data;
    }
    return data;
  };

  // Calcular clientes únicos y pendientes dentro del componente
  const clientesUnicos = [...new Set(userCobros.map(cobro => cobro.cliente))];
  const clientesPendientes = clientesUnicos.filter(cliente => {
    const cobrosCliente = getFilteredData(userCobros).filter(cobro => cobro.cliente === cliente);
    return cobrosCliente.some(cobro => cobro.estado === "pendiente");
  });

  // Calcular totales según el rol
  const totalCobros = getFilteredData(userCobros).length;
  const totalPendiente = getFilteredData(userCobros).filter(cobro => cobro.estado === "pendiente").length;
  const totalCobrado = getFilteredData(userCobros).filter(cobro => cobro.estado === "cobrado").length;
  const totalPresupuestos = getFilteredPresupuestos(presupuestos).length;

  // Calcular pendientes de carga según el rol
  const pendientesAdmin = user.role === "admin" ? userCobros.filter(cobro => !cobro.cargado).length : 0;
  const pendientesVendedor = (user.role === "Santi" || user.role === "Guille") ? 
    userCobros.filter(cobro => !cobro.cargado && cobro.cobrador === user.role).length : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const porcentajeCargadas = stats.totalCobranzas > 0 
    ? (stats.cargadasEnSistema / stats.totalCobranzas) * 100 
    : 0;

  const getDashboardTitle = () => {
    if (user.role === "admin") {
      return "Dashboard General de Cobranzas";
    } else if (user.role === "Santi" || user.role === "Guille") {
      return `Dashboard de ${user.name}`;
    } else {
      return "Dashboard";
    }
  };

  // Función para navegar a la lista de cobranzas
  const handleNavigateToCobros = () => {
    navigate("/list");
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

      {/* Alertas de cobros pendientes */}
      <div className="dashboard-alerts-container" style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>
        <Alerts user={user} onNavigateToMyCobros={onNavigateToMyCobros} />
      </div>

      {/* Grupo de Cobranzas */}
      <div className="dashboard-cobros-container" style={{ maxWidth: 480, margin: '0 auto', marginTop: 24, width: '100%' }}>
        <h3 className="p-text-center p-mb-2 p-text-sm" style={{ color: '#1f2937', fontWeight: 600, marginTop: 24 }}>Cobranzas</h3>
        <Card className="p-p-3 p-mb-4" style={{ borderRadius: 12, width: '100%', boxSizing: 'border-box' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li className="p-d-flex p-ai-center p-jc-between p-mb-2" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
              <span className="p-d-flex p-ai-center"><i className="pi pi-calendar p-mr-2" style={{ color: '#7c3aed', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Cobrado este Mes</span></span>
              <span style={{ color: '#7c3aed', fontWeight: 600, marginLeft: 12 }}>{formatCurrency(stats.montoMes)}</span>
            </li>
            <li className="p-d-flex p-ai-center p-jc-between p-mb-2" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
              <span className="p-d-flex p-ai-center"><i className="pi pi-clock p-mr-2" style={{ color: '#f59e0b', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Cobrado esta Semana</span></span>
              <span style={{ color: '#f59e0b', fontWeight: 600, marginLeft: 12 }}>{formatCurrency(stats.montoSemana)}</span>
            </li>
            {user.role === "admin" && pendientesAdmin > 0 && (
              <li className="p-d-flex p-ai-center p-jc-between" style={{ paddingBottom: 0 }}>
                <span className="p-d-flex p-ai-center"><i className="pi pi-exclamation-triangle p-mr-2" style={{ color: '#ef4444', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Cobros no cargados en Flexxus</span></span>
                <span style={{ color: '#ef4444', fontWeight: 600, marginLeft: 12 }}>{pendientesAdmin}</span>
              </li>
            )}
            {(user.role === "Santi" || user.role === "Guille") && pendientesVendedor > 0 && (
              <li className="p-d-flex p-ai-center p-jc-between" style={{ paddingBottom: 0 }}>
                <span className="p-d-flex p-ai-center"><i className="pi pi-exclamation-triangle p-mr-2" style={{ color: '#ef4444', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Mis cobros no cargados</span></span>
                <span style={{ color: '#ef4444', fontWeight: 600, marginLeft: 12 }}>{pendientesVendedor}</span>
              </li>
            )}
          </ul>
        </Card>
      </div>

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

      {/* 🆕 Sección eliminada: "Progreso de Carga en Sistema" - No se muestra para ningún rol */}

      {/* Botón Actualizar solo para admin - al final de la pantalla */}
      {user.role === "admin" && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, marginBottom: 16 }}>
          <Button 
            label="Actualizar Datos" 
            icon="pi pi-refresh" 
            onClick={() => fetchCobranzas(true)}
            className="p-button-outlined"
            style={{ minWidth: '200px' }}
          />
        </div>
      )}

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