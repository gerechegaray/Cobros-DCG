import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "primereact/button";
import { Sidebar } from "primereact/sidebar";
import { Menu } from "primereact/menu";

function Navbar({ user, onLogout, menuItems }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname.replace("/", "") || "dashboard";

  const userMenuItems = [
    {
      label: `Hola, ${user.name}`,
      icon: "pi pi-user",
      disabled: true
    },
    {
      separator: true
    },
    {
      label: "Cerrar Sesión",
      icon: "pi pi-sign-out",
      command: onLogout
    }
  ];

  return (
    <>
      {/* Navbar */}
      <nav
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #2563eb 100%)",
          padding: "1rem 2rem",
          boxShadow: "0 4px 20px rgba(37, 99, 235, 0.3), 0 2px 4px rgba(0,0,0,0.1)",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          width: "100%"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                padding: "0.75rem",
                borderRadius: "12px"
              }}
            >
              <i className="pi pi-dollar" style={{ fontSize: "1.75rem", color: "white" }}></i>
            </div>
            <h1 style={{ color: "white", margin: 0, fontSize: "1.5rem", fontWeight: "700" }}>
              Sistema de Gestión
            </h1>
          </div>

          {/* Desktop Menu */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.1)",
              padding: "0.5rem",
              borderRadius: "16px"
            }}
          >
            {menuItems.map((item) => (
              <Button
                key={item.path}
                label={item.label === "Dashboard" ? "Resumen" : item.label}
                icon={item.icon}
                className={
                  currentPath === item.path.replace("/", "") ? "p-button-raised" : "p-button-text"
                }
                style={{
                  color: "white",
                  backgroundColor:
                    currentPath === item.path.replace("/", "")
                      ? "rgba(255, 255, 255, 0.25)"
                      : "transparent",
                  border:
                    currentPath === item.path.replace("/", "")
                      ? "1px solid rgba(255, 255, 255, 0.3)"
                      : "1px solid transparent",
                  borderRadius: "12px",
                  padding: "0.75rem 1.25rem"
                }}
                onClick={() => navigate(item.path)}
              />
            ))}

            {/* Separador visual */}
            <div
              style={{ width: "1px", height: "32px", background: "rgba(255,255,255,0.2)" }}
            ></div>

            {/* Usuario */}
            <Button
              icon="pi pi-user"
              className="p-button-text"
              style={{
                color: "white",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "0.75rem"
              }}
              onClick={(e) => userMenuRef.current.toggle(e)}
              tooltip="Menú de usuario"
            />
            <Menu model={userMenuItems} popup ref={userMenuRef} />
          </div>

          {/* Botón móvil */}
          <Button
            icon="pi pi-bars"
            className="p-button-text"
            style={{
              color: "white",
              display: "none",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              borderRadius: "12px",
              padding: "0.75rem"
            }}
            onClick={() => setSidebarVisible(true)}
          />
        </div>
      </nav>

      {/* Sidebar Mobile */}
      <Sidebar
        visible={sidebarVisible}
        position="right"
        onHide={() => setSidebarVisible(false)}
        style={{
          width: "280px",
          background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)"
        }}
      >
        <div style={{ padding: "1.5rem" }}>
          <div
            style={{
              marginBottom: "2rem",
              padding: "1.5rem",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              borderRadius: "16px",
              color: "white"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  padding: "0.75rem",
                  borderRadius: "12px"
                }}
              >
                <i className="pi pi-user" style={{ fontSize: "1.25rem", color: "white" }}></i>
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{user.name}</h3>
                <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.8 }}>
                  {user.role === "admin" ? "Administrador" : "Cobrador"}
                </p>
              </div>
            </div>
          </div>

          <h3 style={{ marginBottom: "1rem", color: "#374151" }}>Navegación</h3>

          {menuItems.map((item) => (
            <Button
              key={item.path}
              label={item.label}
              icon={item.icon}
              className="p-button-text"
              style={{
                width: "100%",
                justifyContent: "flex-start",
                backgroundColor:
                  currentPath === item.path.replace("/", "") ? "#dbeafe" : "transparent",
                color: currentPath === item.path.replace("/", "") ? "#1e40af" : "#4b5563",
                borderRadius: "12px",
                padding: "0.875rem 1rem"
              }}
              onClick={() => {
                navigate(item.path);
                setSidebarVisible(false);
              }}
            />
          ))}

          <div style={{ margin: "1.5rem 0", height: "1px", background: "#e5e7eb" }}></div>

          <Button
            label="Cerrar Sesión"
            icon="pi pi-sign-out"
            className="p-button-danger p-button-text"
            style={{
              width: "100%",
              justifyContent: "flex-start",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              color: "#dc2626",
              borderRadius: "12px",
              padding: "0.875rem 1rem"
            }}
            onClick={() => {
              onLogout();
              setSidebarVisible(false);
            }}
          />
        </div>
      </Sidebar>

      {/* Responsive */}
      <style>{`
        @media (max-width: 768px) {
          nav div div:nth-child(2) {
            display: none !important;
          }
          nav div button {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}

export default Navbar;
