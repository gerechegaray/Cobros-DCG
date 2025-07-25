import React, { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import { Card } from "primereact/card";
import { ProgressBar } from "primereact/progressbar";
import { Button } from "primereact/button";
import Alerts from "./Alerts";
import { useNavigate } from "react-router-dom";

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
  const [pedidosStats, setPedidosStats] = useState({
    total: 0,
    pendientes: 0,
    recibidos: 0
  });

  const fetchCobranzas = async (force = false) => {
    let data = [];
    if (!force) {
      const cache = localStorage.getItem("cobranzas_dashboard");
      if (cache) {
        data = JSON.parse(cache);
        setUserCobros(data);
        // También actualiza stats
        const totalCobranzas = data.length;
        const totalMonto = data.reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
        setStats(prev => ({ ...prev, totalCobranzas, totalMonto }));
        return;
      }
    }
    const q = query(collection(db, "cobranzas"));
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
    setStats(prev => ({ ...prev, totalCobranzas, totalMonto }));
  };

  useEffect(() => {
    fetchCobranzas();
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

  // Calcular clientes únicos y pendientes dentro del componente
  const clientesUnicos = new Set(userCobros.map(cobro => cobro.cliente)).size;
  const pendientes = userCobros.filter(cobro => !cobro.cargado).length;
  const pendientesAdmin = userCobros.filter(cobro => !cobro.cargado).length;

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

  // Función para navegar a la lista de pedidos de clientes
  const handleNavigateToPedidos = () => {
    navigate("/lista-pedidos");
  };

  // Función para navegar a la lista de cobranzas
  const handleNavigateToCobros = () => {
    navigate("/list");
  };

  return (
    <div className="p-p-1 p-p-md-2 p-p-lg-3 dashboard-main-container" style={{ maxWidth: "100%", margin: "0 auto", overflow: "hidden" }}>
      <h2 className="p-text-center p-mb-2 p-text-md p-text-lg" style={{ color: "#1f2937", wordWrap: "break-word" }}>
        {getDashboardTitle()}
      </h2>
      <Button label="Actualizar" icon="pi pi-refresh" onClick={() => fetchCobranzas(true)} style={{ marginBottom: 16 }} />

      {/* Alertas de cobros pendientes */}
      <div className="dashboard-alerts-container" style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>
        <Alerts user={user} onNavigateToMyCobros={onNavigateToMyCobros} />
        {/* Alerta de pedidos pendientes, justo debajo de la de cobros */}
        {pedidosStats.pendientes > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ backgroundColor: '#fef9c3', border: '1px solid #f59e0b', borderRadius: 10, padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
              <i className="pi pi-exclamation-triangle" style={{ fontSize: '1.3rem', color: '#f59e0b' }}></i>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ margin: 0, color: '#b45309', fontWeight: 600, fontSize: '1rem', wordBreak: 'break-word' }}>Pedidos Pendientes de Recepción</h4>
                <p style={{ margin: 0, color: '#b45309', fontSize: '0.88rem', wordBreak: 'break-word' }}>Tienes <b>{pedidosStats.pendientes}</b> pedidos de clientes marcados como "pendiente".</p>
              </div>
              <button
                className="p-button p-button-warning p-button-sm"
                style={{ marginLeft: 'auto', fontWeight: 600, background: '#f59e0b', borderColor: '#f59e0b', color: '#fff', borderRadius: 5, padding: '0.35rem 0.8rem', fontSize: '0.92rem', cursor: 'pointer', minWidth: 120 }}
                onClick={handleNavigateToPedidos}
              >
                Ir a lista de pedidos
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grupo de Cobranzas */}
      <div className="dashboard-cobros-container" style={{ maxWidth: 480, margin: '0 auto', marginTop: 24, width: '100%' }}>
        <h3 className="p-text-center p-mb-2 p-text-sm" style={{ color: '#1f2937', fontWeight: 600, marginTop: 24 }}>Cobranzas</h3>
        <Card className="p-p-3 p-mb-4" style={{ borderRadius: 12, width: '100%', boxSizing: 'border-box' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li className="p-d-flex p-ai-center p-jc-between p-mb-2" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
              <span className="p-d-flex p-ai-center"><i className="pi pi-dollar p-mr-2" style={{ color: '#059669', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Monto Total</span></span>
              <span style={{ color: '#059669', fontWeight: 600, marginLeft: 12 }}>{formatCurrency(stats.totalMonto)}</span>
            </li>
            <li className="p-d-flex p-ai-center p-jc-between p-mb-2" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
              <span className="p-d-flex p-ai-center"><i className="pi pi-calendar p-mr-2" style={{ color: '#7c3aed', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Cobrado este Mes</span></span>
              <span style={{ color: '#7c3aed', fontWeight: 600, marginLeft: 12 }}>{formatCurrency(stats.montoMes)}</span>
            </li>
            <li className="p-d-flex p-ai-center p-jc-between p-mb-2" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
              <span className="p-d-flex p-ai-center"><i className="pi pi-clock p-mr-2" style={{ color: '#f59e0b', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Cobrado esta Semana</span></span>
              <span style={{ color: '#f59e0b', fontWeight: 600, marginLeft: 12 }}>{formatCurrency(stats.montoSemana)}</span>
            </li>
            {pendientesAdmin > 0 && (
              <li className="p-d-flex p-ai-center p-jc-between" style={{ paddingBottom: 0 }}>
                <span className="p-d-flex p-ai-center"><i className="pi pi-exclamation-triangle p-mr-2" style={{ color: '#ef4444', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Cobro no cargado en Flexxus</span></span>
                <span style={{ color: '#ef4444', fontWeight: 600, marginLeft: 12 }}>{pendientesAdmin}</span>
              </li>
            )}
          </ul>
        </Card>
      </div>

      {/* Grupo de Pedidos */}
      <div className="dashboard-pedidos-container" style={{ maxWidth: 480, margin: '0 auto', marginTop: 24, width: '100%' }}>
        <h3 className="p-text-center p-mb-2 p-text-sm" style={{ color: '#1f2937', fontWeight: 600, marginTop: 24 }}>Pedidos</h3>
        <Card className="p-p-3 p-mb-4" style={{ borderRadius: 12, width: '100%', boxSizing: 'border-box' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li className="p-d-flex p-ai-center p-jc-between p-mb-2" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
              <span className="p-d-flex p-ai-center"><i className="pi pi-shopping-cart p-mr-2" style={{ color: '#0ea5e9', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Pedidos de Clientes</span></span>
              <span style={{ color: '#0ea5e9', fontWeight: 600, marginLeft: 12 }}>{pedidosStats.total}</span>
            </li>
            <li className="p-d-flex p-ai-center p-jc-between p-mb-2" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
              <span className="p-d-flex p-ai-center"><i className="pi pi-clock p-mr-2" style={{ color: '#f59e0b', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Pedidos Pendientes</span></span>
              <span style={{ color: '#f59e0b', fontWeight: 600, marginLeft: 12 }}>{pedidosStats.pendientes}</span>
            </li>
            <li className="p-d-flex p-ai-center p-jc-between" style={{ paddingBottom: 0 }}>
              <span className="p-d-flex p-ai-center"><i className="pi pi-check-circle p-mr-2" style={{ color: '#22c55e', fontSize: '1.1rem' }}></i> <span style={{ fontWeight: 500 }}>Pedidos Recibidos</span></span>
              <span style={{ color: '#22c55e', fontWeight: 600, marginLeft: 12 }}>{pedidosStats.recibidos}</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Progreso de carga en sistema */}
      {user.role === "cobrador" && (
        <Card className="p-mt-3" style={{ width: '100%', boxSizing: 'border-box' }}>
          <h3 className="p-mb-2 p-text-sm p-text-md-lg" style={{ color: "#1f2937" }}>
            {user.role === "admin" ? "Progreso de Carga en Sistema" : "Mi Progreso de Carga"}
          </h3>
          <div className="p-mb-2">
            <div className="p-d-flex p-jc-between p-mb-1 p-text-xs p-text-md-sm">
              <span>Cargadas: {stats.cargadasEnSistema}</span>
              <span>Pendientes: {stats.pendientesDeCarga}</span>
            </div>
            <ProgressBar 
              value={porcentajeCargadas} 
              style={{ height: "0.75rem" }}
              color={porcentajeCargadas === 100 ? "#059669" : porcentajeCargadas > 50 ? "#f59e0b" : "#dc2626"}
            />
          </div>
          <p className="p-m-0 p-text-xs p-text-md-sm" style={{ color: "#6b7280" }}>
            {porcentajeCargadas.toFixed(1)}% de las cobranzas están cargadas en el sistema
          </p>
        </Card>
      )}

      {/* Estilos responsive específicos para el dashboard */}
      <style>{`
        @media (max-width: 768px) {
          .dashboard-main-container {
            padding: 0.5rem !important;
          }
          .dashboard-alerts-container,
          .dashboard-cobros-container,
          .dashboard-pedidos-container {
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
          .dashboard-pedidos-container {
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