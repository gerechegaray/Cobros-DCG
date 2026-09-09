import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./services/firebase";
import { doc, getDoc } from "firebase/firestore";
import Navbar from "./components/layout/Navbar";
import BottomNav from "./components/layout/BottomNav";
import OfflineBanner from "./components/OfflineBanner";
import Login from "./features/auth/Login";
import Dashboard from "./features/dashboard/Dashboard";
import EstadoCuenta from "./features/clientes/EstadoCuenta";
import FacturasAlegra from "./features/facturas/FacturasAlegra";
import UserProfile from "./features/auth/UserProfile";
import GestionDatos from "./components/GestionDatos";
import MenuClientes from "./components/MenuClientes";
import CobrosMain from "./features/cobros/CobrosMain";
import PedidosMain from "./features/pedidos/PedidosMain";
import ComisionesMain from "./features/comisiones/ComisionesMain";
import { useEsMovil } from "./hooks/useEsMovil";
import { procesarCola } from "./offline/colaSync";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const esMovil = useEsMovil();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Buscar usuario en Firestore para obtener el rol
          const userDoc = await getDoc(doc(db, "usuarios", firebaseUser.email));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const validRoles = ["admin", "Santi", "Guille", "Victor"];
            
            if (userData.role && validRoles.includes(userData.role)) {
              setUser(userData);
            } else {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error("Error obteniendo datos del usuario:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const sync = () => {
      procesarCola().catch((error) => {
        console.error('Error procesando cola offline:', error);
      });
    };
    sync();
    window.addEventListener('online', sync);
    const timer = window.setInterval(sync, 30000);
    return () => {
      window.removeEventListener('online', sync);
      window.clearInterval(timer);
    };
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const getMenuItems = () => {
    const baseItems = [
      { label: "Dashboard", icon: "pi pi-chart-bar", path: "/dashboard" },
      { label: "Clientes", icon: "pi pi-users", path: "/menu-clientes" },
      { label: "Estado de Cuenta", icon: "pi pi-credit-card", path: "/estado-cuenta" },
      { label: "Pedidos", icon: "pi pi-shopping-cart", path: "/pedidos" },
      { label: "Cobros", icon: "pi pi-dollar", path: "/cobros" },
      { label: "Comisiones", icon: "pi pi-percentage", path: "/comisiones" },
      { label: "Mi Perfil", icon: "pi pi-user", path: "/profile" }
    ];

    if (user && user.role === 'admin') {
      baseItems.splice(3, 0, { label: "Envíos", icon: "pi pi-file-o", path: "/facturas" });
      baseItems.push({ label: "Gestión de Datos", icon: "pi pi-database", path: "/gestion-datos" });
    }

    return baseItems;
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className={`App ${esMovil ? 'has-bottom-nav' : ''}`}>
        <Navbar user={user} menuItems={getMenuItems()} />
        <OfflineBanner />
        <div className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/estado-cuenta" element={<EstadoCuenta user={user} />} />
            <Route path="/facturas" element={
              user && user.role === 'admin' ?
              <FacturasAlegra user={user} /> :
              <Navigate to="/dashboard" replace />
            } />
            <Route path="/pedidos" element={<PedidosMain user={user} />} />
            <Route path="/cobros" element={<CobrosMain user={user} />} />
            <Route path="/profile" element={<UserProfile user={user} />} />
            <Route path="/gestion-datos" element={
              user && user.role === 'admin' ?
              <GestionDatos user={user} /> :
              <Navigate to="/dashboard" replace />
            } />
            <Route path="/productos" element={<Navigate to="/dashboard" replace />} />
            <Route path="/comisiones" element={<ComisionesMain user={user} />} />
            <Route path="/visitas" element={<Navigate to="/dashboard" replace />} />
            <Route path="/gastos" element={<Navigate to="/dashboard" replace />} />
            <Route path="/menu-clientes" element={<MenuClientes user={user} />} />
          </Routes>
        </div>
        {esMovil && <BottomNav />}
      </div>
    </Router>
  );
}

export default App;
