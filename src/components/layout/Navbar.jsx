import { useState } from "react";
import { Button } from "primereact/button";
import { Sidebar } from "primereact/sidebar";
import { Menu } from "primereact/menu";
import { useRef } from "react";

function Navbar({ activeTab, setActiveTab, user, onLogout, menuItems }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const userMenuRef = useRef(null);

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
      {/* Navbar principal */}
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
          width: "100%" // <-- AGREGÁ ESTO
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: "100%", // <-- CAMBIÁ ESTO
            margin: "0 auto",
            flexWrap: "wrap" // <-- AGREGÁ ESTO para evitar desbordes en mobile
          }}
        >
          {/* Logo y título */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              transition: "transform 0.2s ease"
            }}
          >
            <div
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                padding: "0.75rem",
                borderRadius: "12px",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.2)"
              }}
            >
              <i
                className="pi pi-dollar"
                style={{
                  fontSize: "1.75rem",
                  color: "white",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                }}
              ></i>
            </div>
            <h1
              style={{
                color: "white",
                margin: 0,
                fontSize: "1.5rem",
                fontWeight: "700",
                letterSpacing: "-0.025em",
                textShadow: "0 2px 4px rgba(0,0,0,0.2)"
              }}
            >
              Sistema de Gestión
            </h1>
          </div>

          {/* Menú desktop */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.1)",
              padding: "0.5rem",
              borderRadius: "16px",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.15)"
            }}
          >
            {menuItems.map((item) => (
              <Button
                key={item.value}
                label={item.label === "Dashboard" ? "Resumen" : item.label}
                icon={item.icon}
                className={activeTab === item.value ? "p-button-raised" : "p-button-text"}
                style={{
                  color: "white",
                  backgroundColor:
                    activeTab === item.value ? "rgba(255, 255, 255, 0.25)" : "transparent",
                  border:
                    activeTab === item.value
                      ? "1px solid rgba(255, 255, 255, 0.3)"
                      : "1px solid transparent",
                  borderRadius: "12px",
                  padding: "0.75rem 1.25rem",
                  fontWeight: activeTab === item.value ? "600" : "500",
                  fontSize: "0.875rem",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  backdropFilter: activeTab === item.value ? "blur(10px)" : "none",
                  boxShadow:
                    activeTab === item.value
                      ? "0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                      : "none",
                  textShadow: "0 1px 2px rgba(0,0,0,0.2)"
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== item.value) {
                    e.target.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== item.value) {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "none";
                  }
                }}
                onClick={() => setActiveTab(item.value)}
              />
            ))}

            {/* Separador visual */}
            <div
              style={{
                width: "1px",
                height: "32px",
                background: "rgba(255, 255, 255, 0.2)",
                margin: "0 0.5rem"
              }}
            ></div>

            {/* Menú de usuario */}
            <Button
              icon="pi pi-user"
              className="p-button-text"
              style={{
                color: "white",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "12px",
                padding: "0.75rem",
                transition: "all 0.3s ease",
                backdropFilter: "blur(10px)"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
                e.target.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                e.target.style.transform = "scale(1)";
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
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "12px",
              padding: "0.75rem",
              backdropFilter: "blur(10px)",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
              e.target.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
              e.target.style.transform = "scale(1)";
            }}
            onClick={() => setSidebarVisible(true)}
          />
        </div>
      </nav>

      {/* Sidebar móvil */}
      <Sidebar
        visible={sidebarVisible}
        position="right"
        onHide={() => setSidebarVisible(false)}
        style={{
          width: "280px",
          background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
          boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.15)"
        }}
      >
        <div style={{ padding: "1.5rem" }}>
          {/* Header del usuario mejorado */}
          <div
            style={{
              marginBottom: "2rem",
              padding: "1.5rem",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              borderRadius: "16px",
              color: "white",
              boxShadow: "0 8px 25px rgba(37, 99, 235, 0.3)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Efecto de brillo */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "1px",
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)"
              }}
            ></div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "0.75rem"
              }}
            >
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  padding: "0.75rem",
                  borderRadius: "12px",
                  backdropFilter: "blur(10px)"
                }}
              >
                <i className="pi pi-user" style={{ fontSize: "1.25rem", color: "white" }}></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "600" }}>{user.name}</h3>
                <p
                  style={{
                    margin: "0.25rem 0 0 0",
                    fontSize: "0.875rem",
                    color: "rgba(255, 255, 255, 0.8)",
                    fontWeight: "400"
                  }}
                >
                  {user.role === "admin" ? "Administrador" : "Cobrador"}
                </p>
              </div>
            </div>
          </div>

          <h3
            style={{
              marginBottom: "1rem",
              color: "#374151",
              fontSize: "1rem",
              fontWeight: "600",
              letterSpacing: "0.025em"
            }}
          >
            Navegación
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {menuItems.map((item) => (
              <Button
                key={item.value}
                label={item.label}
                icon={item.icon}
                className="p-button-text"
                style={{
                  width: "100%",
                  justifyContent: "flex-start",
                  backgroundColor:
                    activeTab === item.value
                      ? "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)"
                      : "transparent",
                  color: activeTab === item.value ? "#1e40af" : "#4b5563",
                  border: activeTab === item.value ? "1px solid #93c5fd" : "1px solid transparent",
                  borderRadius: "12px",
                  padding: "0.875rem 1rem",
                  fontWeight: activeTab === item.value ? "600" : "500",
                  fontSize: "0.875rem",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow:
                    activeTab === item.value ? "0 2px 8px rgba(59, 130, 246, 0.15)" : "none"
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== item.value) {
                    e.target.style.backgroundColor = "#f3f4f6";
                    e.target.style.transform = "translateX(4px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== item.value) {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.transform = "translateX(0)";
                  }
                }}
                onClick={() => {
                  setActiveTab(item.value);
                  setSidebarVisible(false);
                }}
              />
            ))}
          </div>

          {/* Separador */}
          <div
            style={{
              height: "1px",
              background: "linear-gradient(90deg, transparent, #e5e7eb, transparent)",
              margin: "1.5rem 0"
            }}
          ></div>

          <Button
            label="Cerrar Sesión"
            icon="pi pi-sign-out"
            className="p-button-danger p-button-text"
            style={{
              width: "100%",
              justifyContent: "flex-start",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              color: "#dc2626",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "12px",
              padding: "0.875rem 1rem",
              fontWeight: "500",
              fontSize: "0.875rem",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(239, 68, 68, 0.15)";
              e.target.style.transform = "translateX(4px)";
              e.target.style.boxShadow = "0 2px 8px rgba(239, 68, 68, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
              e.target.style.transform = "translateX(0)";
              e.target.style.boxShadow = "none";
            }}
            onClick={() => {
              onLogout();
              setSidebarVisible(false);
            }}
          />
        </div>
      </Sidebar>

      {/* Estilos responsive mejorados */}
      <style>{`
        @media (max-width: 768px) {
          nav div div:nth-child(2) {
            display: none !important;
          }
          nav div button {
            display: block !important;
          }
        }
        
        /* Animaciones adicionales */
        .p-sidebar {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        .p-menu .p-menuitem-link:hover {
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%) !important;
          transform: translateX(4px);
          transition: all 0.2s ease;
        }
        
        /* Mejoras en el scroll del sidebar */
        .p-sidebar-content {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        
        .p-sidebar-content::-webkit-scrollbar {
          width: 6px;
        }
        
        .p-sidebar-content::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .p-sidebar-content::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        
        .p-sidebar-content::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </>
  );
}

export default Navbar;
