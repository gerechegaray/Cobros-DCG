import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./services/firebase";
import { doc, getDoc } from "firebase/firestore";
import Navbar from "./components/layout/Navbar";
import Login from "./features/auth/Login";
import Dashboard from "./features/dashboard/Dashboard";
import PresupuestosList from "./features/presupuestos/PresupuestosList";
import PresupuestoForm from "./features/presupuestos/PresupuestoForm";
import CobrosList from "./features/cobros/CobrosList";
import CobroForm from "./features/cobros/CobroForm";
import EstadoCuenta from "./features/clientes/EstadoCuenta";
import SelectorCliente from "./features/pedidos/SelectorCliente";
import FacturasAlegra from "./features/facturas/FacturasAlegra";
import UserProfile from "./features/auth/UserProfile";
import CacheMonitor from "./components/CacheMonitor";
import VisitasDashboard from "./features/visitas/VisitasDashboard";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Buscar usuario en Firestore para obtener el rol
          const userDoc = await getDoc(doc(db, "usuarios", firebaseUser.email));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const validRoles = ["admin", "Santi", "Guille"];
            
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

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const getMenuItems = () => {
    const baseItems = [
      { label: "Dashboard", icon: "pi pi-chart-bar", path: "/dashboard" },
      { label: "Pedidos", icon: "pi pi-file", path: "/presupuestos" },
      { label: "Lista de Cobranzas", icon: "pi pi-list", path: "/list" },
      { label: "Clientes", icon: "pi pi-users", path: "/clientes" },
      { label: "Envios", icon: "pi pi-file-o", path: "/facturas" },
      { label: "Visitas", icon: "pi pi-calendar", path: "/visitas" },
      { label: "Mi Perfil", icon: "pi pi-user", path: "/profile" }
    ];

    // 🆕 Agregar Monitor de Cache solo para admin
    if (user && user.role === 'admin') {
      baseItems.push({ label: "Monitor de Cache", icon: "pi pi-database", path: "/cache-monitor" });
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
      <div className="App">
        <Navbar user={user} menuItems={getMenuItems()} />
        <div className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/presupuestos" element={<PresupuestosList user={user} />} />
            <Route path="/presupuestos/new" element={<PresupuestoForm user={user} />} />
            <Route path="/list" element={<CobrosList user={user} />} />
            <Route path="/list/new" element={<CobroForm user={user} />} />
            <Route path="/clientes" element={<SelectorCliente user={user} />} />
            <Route path="/estado-cuenta" element={<EstadoCuenta user={user} />} />
            <Route path="/facturas" element={<FacturasAlegra user={user} />} />
            <Route path="/visitas" element={<VisitasDashboard user={user} />} />
            <Route path="/profile" element={<UserProfile user={user} />} />
            <Route path="/cache-monitor" element={
              user && user.role === 'admin' ? 
              <CacheMonitor user={user} /> : 
              <Navigate to="/dashboard" replace />
            } />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
