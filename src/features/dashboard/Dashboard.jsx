import React, { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { Card } from "primereact/card";
import { ProgressBar } from "primereact/progressbar";
import { Button } from "primereact/button";
import Alerts from "./Alerts";

function Dashboard({ user, onNavigateToCobros, onNavigateToMyCobros }) {
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

  useEffect(() => {
    const q = query(collection(db, "cobranzas"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      let filteredData = data;
      if (user.role === "Santi" || user.role === "Guille") {
        filteredData = data.filter(cobro => cobro.cobrador === user.role);
      } else if (user.role === "admin") {
        filteredData = data;
      }

      setUserCobros(filteredData);

      // ... cálculos de stats ...
      const totalCobranzas = filteredData.length;
      const totalMonto = filteredData.reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
      const cargadasEnSistema = filteredData.filter(cobro => cobro.cargado).length;
      const pendientesDeCarga = totalCobranzas - cargadasEnSistema;

      // Calcular monto del mes actual
      const ahora = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const montoMes = filteredData
        .filter(cobro => {
          const fechaCobro = cobro.fecha.toDate ? cobro.fecha.toDate() : new Date(cobro.fecha.seconds * 1000);
          return fechaCobro >= inicioMes;
        })
        .reduce((sum, cobro) => sum + (cobro.monto || 0), 0);

      // Calcular monto de la semana actual
      const inicioSemana = new Date(ahora);
      inicioSemana.setDate(ahora.getDate() - ahora.getDay()); // Domingo
      inicioSemana.setHours(0, 0, 0, 0);
      const montoSemana = filteredData
        .filter(cobro => {
          const fechaCobro = cobro.fecha.toDate ? cobro.fecha.toDate() : new Date(cobro.fecha.seconds * 1000);
          return fechaCobro >= inicioSemana;
        })
        .reduce((sum, cobro) => sum + (cobro.monto || 0), 0);

      setStats({
        totalCobranzas,
        totalMonto,
        cargadasEnSistema,
        pendientesDeCarga,
        montoMes,
        montoSemana
      });
    });

    // Pedidos de clientes
    const pedidosQ = query(collection(db, "pedidosClientes"));
    const unsubPedidos = onSnapshot(pedidosQ, (querySnapshot) => {
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
    });

    return () => {
      unsubscribe();
      unsubPedidos();
    };
  }, [user]);

  // Calcular clientes únicos y pendientes fuera del useEffect
  const clientesUnicos = new Set(userCobros.map(cobro => cobro.cliente)).size;
  const pendientes = userCobros.filter(cobro => !cobro.cargado).length;

  // Calcular cobranzas pendientes (no cargadas)
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

  return (
    <div className="p-p-2 p-p-md-3 p-p-lg-4" style={{ maxWidth: "100%", margin: "0 auto", overflow: "hidden" }}>
      <h2 className="p-text-center p-mb-3 p-text-lg p-text-md-xl p-text-lg-2xl" style={{ color: "#1f2937", wordWrap: "break-word" }}>
        {getDashboardTitle()}
      </h2>

      {/* Alertas de cobros pendientes */}
      <Alerts user={user} onNavigateToMyCobros={onNavigateToMyCobros} />

      {/* Vista para admin */}
      {user.role === "admin" && (
        <div className="p-grid p-fluid">
          {/* Monto Total */}
          <div className="p-col-12 p-md-6 p-lg-3">
            <Card className="p-text-center">
              <div className="p-d-flex p-ai-center p-jc-center p-mb-2">
                <i className="pi pi-dollar p-text-xl p-text-md-2xl p-mr-1 p-mr-md-2" style={{ color: "#059669" }}></i>
                <h3 className="p-m-0 p-text-sm p-text-md-lg" style={{ color: "#1f2937" }}>
                  Monto Total
                </h3>
              </div>
              <h2 className="p-m-0 p-text-xl p-text-md-2xl p-text-lg-3xl" style={{ color: "#059669" }}>{formatCurrency(stats.totalMonto)}</h2>
            </Card>
          </div>

          {/* Cobrado este Mes */}
          <div className="p-col-12 p-md-6 p-lg-3">
            <Card className="p-text-center">
              <div className="p-d-flex p-ai-center p-jc-center p-mb-2">
                <i className="pi pi-calendar p-text-xl p-text-md-2xl p-mr-1 p-mr-md-2" style={{ color: "#7c3aed" }}></i>
                <h3 className="p-m-0 p-text-sm p-text-md-lg" style={{ color: "#1f2937" }}>
                  Cobrado este Mes
                </h3>
              </div>
              <h2 className="p-m-0 p-text-xl p-text-md-2xl p-text-lg-3xl" style={{ color: "#7c3aed" }}>{formatCurrency(stats.montoMes)}</h2>
            </Card>
          </div>

          {/* Cobrado esta Semana */}
          <div className="p-col-12 p-md-6 p-lg-3">
            <Card className="p-text-center">
              <div className="p-d-flex p-ai-center p-jc-center p-mb-2">
                <i className="pi pi-clock p-text-xl p-text-md-2xl p-mr-1 p-mr-md-2" style={{ color: "#f59e0b" }}></i>
                <h3 className="p-m-0 p-text-sm p-text-md-lg" style={{ color: "#1f2937" }}>
                  Cobrado esta Semana
                </h3>
              </div>
              <h2 className="p-m-0 p-text-xl p-text-md-2xl p-text-lg-3xl" style={{ color: "#f59e0b" }}>{formatCurrency(stats.montoSemana)}</h2>
            </Card>
          </div>

          {/* Pendientes solo si hay */}
          {pendientesAdmin > 0 && (
            <div className="p-col-12 p-md-6 p-lg-3">
              <Card className="p-text-center">
                <div className="p-d-flex p-ai-center p-jc-center p-mb-2">
                  <i className="pi pi-exclamation-triangle p-text-xl p-text-md-2xl p-mr-1 p-mr-md-2" style={{ color: "#ef4444" }}></i>
                  <h3 className="p-m-0 p-text-sm p-text-md-lg" style={{ color: "#1f2937" }}>
                    Cobro no cargado en Flexxus
                  </h3>
                </div>
                <h2 className="p-m-0 p-text-2xl p-text-md-3xl p-text-lg-4xl" style={{ color: "#ef4444" }}>{pendientesAdmin}</h2>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Vista para Santi y Guille */}
      {(user.role === "Santi" || user.role === "Guille") ? (
        <div className="p-grid p-fluid">
          {/* Total cobrado en el mes */}
          <div className="p-col-12 p-md-6 p-lg-3">
            <Card className="p-text-center">
              <div className="p-d-flex p-ai-center p-jc-center p-mb-2">
                <i className="pi pi-calendar p-text-xl p-text-md-2xl p-mr-1 p-mr-md-2" style={{ color: "#7c3aed" }}></i>
                <h3 className="p-m-0 p-text-sm p-text-md-lg" style={{ color: "#1f2937" }}>
                  Total cobrado en el mes
                </h3>
              </div>
              <h2 className="p-m-0 p-text-xl p-text-md-2xl p-text-lg-3xl" style={{ color: "#7c3aed" }}>{formatCurrency(stats.montoMes)}</h2>
            </Card>
          </div>

          {/* Total cobrado en la semana */}
          <div className="p-col-12 p-md-6 p-lg-3">
            <Card className="p-text-center">
              <div className="p-d-flex p-ai-center p-jc-center p-mb-2">
                <i className="pi pi-clock p-text-xl p-text-md-2xl p-mr-1 p-mr-md-2" style={{ color: "#f59e0b" }}></i>
                <h3 className="p-m-0 p-text-sm p-text-md-lg" style={{ color: "#1f2937" }}>
                  Total cobrado en la semana
                </h3>
              </div>
              <h2 className="p-m-0 p-text-xl p-text-md-2xl p-text-lg-3xl" style={{ color: "#f59e0b" }}>{formatCurrency(stats.montoSemana)}</h2>
            </Card>
          </div>

          {/* Pendientes de carga */}
          <div className="p-col-12 p-md-6 p-lg-3">
            <Card className="p-text-center">
              <div className="p-d-flex p-ai-center p-jc-center p-mb-2">
                <i className="pi pi-exclamation-triangle p-text-xl p-text-md-2xl p-mr-1 p-mr-md-2" style={{ color: "#ef4444" }}></i>
                <h3 className="p-m-0 p-text-sm p-text-md-lg" style={{ color: "#1f2937" }}>
                  Cobro no cargado en Flexxus
                </h3>
              </div>
              <h2 className="p-m-0 p-text-2xl p-text-md-3xl p-text-lg-4xl" style={{ color: "#ef4444" }}>{pendientes}</h2>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Bloques de resumen de pedidos de clientes */}
      <div className="p-grid p-fluid p-mt-2">
        <div className="p-col-12 p-md-4">
          <Card className="p-text-center">
            <div className="p-d-flex p-ai-center p-jc-center p-mb-2">
              <i className="pi pi-shopping-cart p-text-xl p-text-md-2xl p-mr-1 p-mr-md-2" style={{ color: "#0ea5e9" }}></i>
              <h3 className="p-m-0 p-text-sm p-text-md-lg" style={{ color: "#1f2937" }}>
                Pedidos de Clientes
              </h3>
            </div>
            <h2 className="p-m-0 p-text-xl p-text-md-2xl p-text-lg-3xl" style={{ color: "#0ea5e9" }}>{pedidosStats.total}</h2>
          </Card>
        </div>
        <div className="p-col-12 p-md-4">
          <Card className="p-text-center">
            <div className="p-d-flex p-ai-center p-jc-center p-mb-2">
              <i className="pi pi-clock p-text-xl p-text-md-2xl p-mr-1 p-mr-md-2" style={{ color: "#f59e0b" }}></i>
              <h3 className="p-m-0 p-text-sm p-text-md-lg" style={{ color: "#1f2937" }}>
                Pedidos Pendientes
              </h3>
            </div>
            <h2 className="p-m-0 p-text-xl p-text-md-2xl p-text-lg-3xl" style={{ color: "#f59e0b" }}>{pedidosStats.pendientes}</h2>
          </Card>
        </div>
        <div className="p-col-12 p-md-4">
          <Card className="p-text-center">
            <div className="p-d-flex p-ai-center p-jc-center p-mb-2">
              <i className="pi pi-check-circle p-text-xl p-text-md-2xl p-mr-1 p-mr-md-2" style={{ color: "#22c55e" }}></i>
              <h3 className="p-m-0 p-text-sm p-text-md-lg" style={{ color: "#1f2937" }}>
                Pedidos Recibidos
              </h3>
            </div>
            <h2 className="p-m-0 p-text-xl p-text-md-2xl p-text-lg-3xl" style={{ color: "#22c55e" }}>{pedidosStats.recibidos}</h2>
          </Card>
        </div>
      </div>

      {/* Progreso de carga en sistema */}
      {user.role === "cobrador" && (
        <Card className="p-mt-3">
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

      {/* Botón para ver cobros (solo para cobradores) */}
      {user.role === "cobrador" && (
        <Card className="p-mt-4 p-surface-100" style={{ borderColor: "#0ea5e9" }}>
          <div className="p-text-center">
            <h3 className="p-m-0 p-mb-3 p-text-lg" style={{ color: "#0c4a6e" }}>
              Ver Mis Cobranzas
            </h3>
            <p className="p-m-0 p-mb-4 p-text-sm" style={{ color: "#0369a1" }}>
              Revisa todos los cobros que has realizado y su estado actual
            </p>
            <Button 
              label="Ver Mis Cobranzas" 
              icon="pi pi-list" 
              className="p-button-primary p-button-lg"
              onClick={() => onNavigateToCobros && onNavigateToCobros()}
              style={{ 
                padding: "1rem 2rem", 
                fontSize: "1.1rem",
                backgroundColor: "#0ea5e9",
                borderColor: "#0ea5e9"
              }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

export default Dashboard; 