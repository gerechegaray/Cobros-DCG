import React, { useState, useRef } from "react";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { Divider } from "primereact/divider";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";

function UserProfile({ user, onUserUpdate }) {
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const toast = useRef(null);
  
  // Estado para datos del perfil
  const [profileData, setProfileData] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    address: user.address || ""
  });

  // Estado para cambio de contraseña
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Validar contraseña actual
  const validateCurrentPassword = (currentPassword) => {
    const users = {
      "admin@empresa.com": { password: "admin123" },
      "guille@empresa.com": { password: "guille123" },
      "santi@empresa.com": { password: "santi123" }
    };
    
    // Obtener contraseñas actualizadas del localStorage
    const updatedPasswords = JSON.parse(localStorage.getItem('updatedPasswords') || '{}');
    const currentPasswordForUser = updatedPasswords[user.email] || users[user.email]?.password;
    
    return currentPasswordForUser === currentPassword;
  };

  // Actualizar datos del perfil
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simular delay de actualización
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Validar que el nombre no esté vacío
      if (!profileData.name.trim()) {
        throw new Error("El nombre es obligatorio");
      }

      // Actualizar datos del usuario
      const updatedUser = {
        ...user,
        ...profileData
      };

      // Guardar en localStorage
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      
      // Llamar a la función de actualización del componente padre
      if (onUserUpdate) {
        onUserUpdate(updatedUser);
      }

      toast.current.show({
        severity: 'success',
        summary: 'Perfil actualizado',
        detail: 'Tus datos se han actualizado correctamente'
      });
    } catch (error) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Error al actualizar el perfil'
      });
    } finally {
      setLoading(false);
    }
  };

  // Cambiar contraseña
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);

    try {
      // Simular delay de actualización
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Validaciones
      if (!validateCurrentPassword(passwordData.currentPassword)) {
        throw new Error("La contraseña actual es incorrecta");
      }

      if (passwordData.newPassword.length < 6) {
        throw new Error("La nueva contraseña debe tener al menos 6 caracteres");
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error("Las contraseñas no coinciden");
      }

      // Guardar la nueva contraseña en localStorage
      const updatedPasswords = JSON.parse(localStorage.getItem('updatedPasswords') || '{}');
      updatedPasswords[user.email] = passwordData.newPassword;
      localStorage.setItem('updatedPasswords', JSON.stringify(updatedPasswords));
      
      toast.current.show({
        severity: 'success',
        summary: 'Contraseña actualizada',
        detail: 'Tu contraseña se ha cambiado correctamente'
      });

      // Limpiar formulario de contraseña
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Error al cambiar la contraseña'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>
      <Toast ref={toast} />
      
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0, color: "#1f2937", fontSize: "2rem" }}>
          Mi Perfil
        </h1>
        <p style={{ margin: "0.5rem 0 0 0", color: "#6b7280" }}>
          Gestiona tu información personal y seguridad
        </p>
      </div>

      <div style={{ display: "grid", gap: "2rem" }}>
        {/* Información del perfil */}
        <Card>
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ margin: 0, color: "#1f2937", fontSize: "1.5rem" }}>
              Información Personal
            </h2>
            <p style={{ margin: "0.5rem 0 0 0", color: "#6b7280" }}>
              Actualiza tus datos personales
            </p>
          </div>

          <form onSubmit={handleProfileUpdate}>
            <div style={{ display: "grid", gap: "1.5rem" }}>
              {/* Nombre */}
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151" }}>
                  Nombre completo *
                </label>
                <InputText 
                  value={profileData.name} 
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  style={{ width: "100%" }}
                  placeholder="Tu nombre completo"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151" }}>
                  Email
                </label>
                <InputText 
                  value={profileData.email} 
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  style={{ width: "100%" }}
                  placeholder="tu@email.com"
                  type="email"
                  disabled
                />
                <small style={{ color: "#6b7280" }}>
                  El email no se puede modificar por seguridad
                </small>
              </div>

              {/* Teléfono */}
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151" }}>
                  Teléfono
                </label>
                <InputText 
                  value={profileData.phone} 
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  style={{ width: "100%" }}
                  placeholder="+54 9 11 1234-5678"
                />
              </div>

              {/* Dirección */}
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151" }}>
                  Dirección
                </label>
                <InputText 
                  value={profileData.address} 
                  onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                  style={{ width: "100%" }}
                  placeholder="Tu dirección"
                />
              </div>

              {/* Botón actualizar */}
              <Button 
                type="submit" 
                label={loading ? "Actualizando..." : "Actualizar Perfil"} 
                icon={loading ? "pi pi-spin pi-spinner" : "pi pi-save"}
                style={{ width: "100%", height: "3rem" }}
                disabled={loading}
              />
            </div>
          </form>
        </Card>

        <Divider />

        {/* Cambio de contraseña */}
        <Card>
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ margin: 0, color: "#1f2937", fontSize: "1.5rem" }}>
              Cambiar Contraseña
            </h2>
            <p style={{ margin: "0.5rem 0 0 0", color: "#6b7280" }}>
              Actualiza tu contraseña de acceso
            </p>
          </div>

          <form onSubmit={handlePasswordChange}>
            <div style={{ display: "grid", gap: "1.5rem" }}>
              {/* Contraseña actual */}
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151" }}>
                  Contraseña actual *
                </label>
                <Password 
                  value={passwordData.currentPassword} 
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  style={{ width: "100%" }}
                  placeholder="Tu contraseña actual"
                  required
                  feedback={false}
                  toggleMask
                />
              </div>

              {/* Nueva contraseña */}
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151" }}>
                  Nueva contraseña *
                </label>
                <Password 
                  value={passwordData.newPassword} 
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  style={{ width: "100%" }}
                  placeholder="Nueva contraseña (mín. 6 caracteres)"
                  required
                  feedback={true}
                  toggleMask
                />
              </div>

              {/* Confirmar nueva contraseña */}
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151" }}>
                  Confirmar nueva contraseña *
                </label>
                <Password 
                  value={passwordData.confirmPassword} 
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  style={{ width: "100%" }}
                  placeholder="Confirma tu nueva contraseña"
                  required
                  feedback={false}
                  toggleMask
                />
              </div>

              {/* Botón cambiar contraseña */}
              <Button 
                type="submit" 
                label={passwordLoading ? "Cambiando contraseña..." : "Cambiar Contraseña"} 
                icon={passwordLoading ? "pi pi-spin pi-spinner" : "pi pi-lock"}
                style={{ width: "100%", height: "3rem" }}
                disabled={passwordLoading}
              />
            </div>
          </form>
        </Card>

        {/* Información adicional */}
        <Card>
          <div style={{ marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, color: "#1f2937", fontSize: "1.25rem" }}>
              Información de la cuenta
            </h3>
          </div>
          
          <div style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "500", color: "#374151" }}>Rol:</span>
              <Tag 
                value={user.role === "admin" ? "Administrador" : "Cobrador"} 
                severity={user.role === "admin" ? "danger" : "info"}
              />
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "500", color: "#374151" }}>Email:</span>
              <span style={{ color: "#6b7280" }}>{user.email}</span>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "500", color: "#374151" }}>Último acceso:</span>
              <span style={{ color: "#6b7280" }}>
                {new Date().toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "500", color: "#374151" }}>Estado:</span>
              <Tag 
                value="Activo" 
                severity="success"
              />
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "500", color: "#374151" }}>Permisos:</span>
              <span style={{ color: "#6b7280" }}>
                {user.role === "admin" ? "Acceso completo" : "Acceso limitado"}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default UserProfile; 