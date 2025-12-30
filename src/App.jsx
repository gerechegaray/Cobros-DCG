import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./services/firebase";
import { doc, getDoc } from "firebase/firestore";
import Navbar from "./components/layout/Navbar";
import Login from "./features/auth/Login";
import Dashboard from "./features/dashboard/Dashboard";
import EstadoCuenta from "./features/clientes/EstadoCuenta";
import FacturasAlegra from "./features/facturas/FacturasAlegra";
import UserProfile from "./features/auth/UserProfile";
import GestionDatos from "./components/GestionDatos";
import VisitasDashboard from "./features/visitas/VisitasDashboard";
import GastosMain from "./features/gastos/GastosMain";
import MenuClientes from "./components/MenuClientes";
import CobrosMain from "./features/cobros/CobrosMain";
import PedidosMain from "./features/pedidos/PedidosMain";
import ProductosConsulta from "./features/productos/ProductosConsulta";
import ComisionesMain from "./features/comisiones/ComisionesMain";

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
      { label: "Clientes", icon: "pi pi-users", path: "/menu-clientes" },
      { label: "Estado de Cuenta", icon: "pi pi-credit-card", path: "/estado-cuenta" },
      { label: "Envíos", icon: "pi pi-file-o", path: "/facturas" },
      { label: "Pedidos", icon: "pi pi-shopping-cart", path: "/pedidos" },
      { label: "Productos", icon: "pi pi-box", path: "/productos" },
      { label: "Cobros", icon: "pi pi-dollar", path: "/cobros" },
      { label: "Comisiones", icon: "pi pi-percentage", path: "/comisiones" },
      { label: "Visitas", icon: "pi pi-calendar", path: "/visitas" },
      { label: "Mi Perfil", icon: "pi pi-user", path: "/profile" }
    ];

    // Agregar opciones solo para admin
    if (user && user.role === 'admin') {
      baseItems.push({ label: "Gestión de Datos", icon: "pi pi-database", path: "/gestion-datos" });
      baseItems.push({ label: "Gastos", icon: "pi pi-money-bill", path: "/gastos" });
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
            <Route path="/estado-cuenta" element={<EstadoCuenta user={user} />} />
            <Route path="/facturas" element={<FacturasAlegra user={user} />} />
            <Route path="/pedidos" element={<PedidosMain user={user} />} />
            <Route path="/productos" element={<ProductosConsulta user={user} />} />
            <Route path="/cobros" element={<CobrosMain user={user} />} />
            <Route path="/comisiones" element={<ComisionesMain user={user} />} />
            <Route path="/visitas" element={<VisitasDashboard user={user} />} />
            <Route path="/profile" element={<UserProfile user={user} />} />
            <Route path="/gestion-datos" element={
              user && user.role === 'admin' ? 
              <GestionDatos user={user} /> : 
              <Navigate to="/dashboard" replace />
            } />
            <Route path="/gastos" element={
              user && user.role === 'admin' ? 
              <GastosMain user={user} /> : 
              <Navigate to="/dashboard" replace />
            } />
            <Route path="/menu-clientes" element={<MenuClientes user={user} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
