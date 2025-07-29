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
    <div className="p-p-3 p-p-md-4 p-p-lg-5" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <Toast ref={toast} />
      
      <div className="p-mb-4">
        <h1 className="p-m-0 p-text-2xl p-text-md-3xl" style={{ color: "#1f2937" }}>
          Mi Perfil
        </h1>
        <p className="p-mt-2 p-mb-0 p-text-sm" style={{ color: "#6b7280" }}>
          Gestiona tu información personal y seguridad
        </p>
      </div>

      <div className="p-grid p-fluid">
        {/* Información del perfil */}
        <div className="p-col-12">
          <Card>
            <div className="p-mb-4">
              <h2 className="p-m-0 p-text-xl p-text-md-2xl" style={{ color: "#1f2937" }}>
                Información Personal
              </h2>
              <p className="p-mt-2 p-mb-0 p-text-sm" style={{ color: "#6b7280" }}>
                Actualiza tus datos personales
              </p>
            </div>

            <form onSubmit={handleProfileUpdate}>
              <div className="p-grid p-fluid">
                {/* Nombre */}
                <div className="p-col-12">
                  <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                    Nombre completo *
                  </label>
                  <InputText 
                    value={profileData.name} 
                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                    className="p-fluid"
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>

                {/* Email */}
                <div className="p-col-12">
                  <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                    Email
                  </label>
                  <InputText 
                    value={profileData.email} 
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    className="p-fluid"
                    placeholder="tu@email.com"
                    type="email"
                    disabled
                  />
                  <small className="p-text-xs" style={{ color: "#6b7280" }}>
                    El email no se puede modificar por seguridad
                  </small>
                </div>

                {/* Teléfono */}
                <div className="p-col-12 p-md-6">
                  <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                    Teléfono
                  </label>
                  <InputText 
                    value={profileData.phone} 
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    className="p-fluid"
                    placeholder="+54 9 11 1234-5678"
                  />
                </div>

                {/* Dirección */}
                <div className="p-col-12 p-md-6">
                  <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                    Dirección
                  </label>
                  <InputText 
                    value={profileData.address} 
                    onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                    className="p-fluid"
                    placeholder="Tu dirección"
                  />
                </div>

                {/* Botón actualizar */}
                <div className="p-col-12">
                  <Button 
                    type="submit" 
                    label={loading ? "Actualizando..." : "Actualizar Perfil"} 
                    icon={loading ? "pi pi-spin pi-spinner" : "pi pi-save"}
                    className="p-fluid"
                    style={{ height: "3rem" }}
                    disabled={loading}
                  />
                </div>
              </div>
            </form>
          </Card>
        </div>

        <div className="p-col-12">
          <Divider />
        </div>

        {/* Cambio de contraseña */}
        <div className="p-col-12">
          <Card>
            <div className="p-mb-4">
              <h2 className="p-m-0 p-text-xl p-text-md-2xl" style={{ color: "#1f2937" }}>
                Cambiar Contraseña
              </h2>
              <p className="p-mt-2 p-mb-0 p-text-sm" style={{ color: "#6b7280" }}>
                Actualiza tu contraseña de acceso
              </p>
            </div>

            <form onSubmit={handlePasswordChange}>
              <div className="p-grid p-fluid">
                {/* Contraseña actual */}
                <div className="p-col-12">
                  <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                    Contraseña actual *
                  </label>
                  <Password 
                    value={passwordData.currentPassword} 
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="p-fluid"
                    placeholder="Tu contraseña actual"
                    required
                    feedback={false}
                    toggleMask
                  />
                </div>

                {/* Nueva contraseña */}
                <div className="p-col-12 p-md-6">
                  <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                    Nueva contraseña *
                  </label>
                  <Password 
                    value={passwordData.newPassword} 
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="p-fluid"
                    placeholder="Nueva contraseña (mín. 6 caracteres)"
                    required
                    feedback={true}
                    toggleMask
                  />
                </div>

                {/* Confirmar nueva contraseña */}
                <div className="p-col-12 p-md-6">
                  <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                    Confirmar nueva contraseña *
                  </label>
                  <Password 
                    value={passwordData.confirmPassword} 
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="p-fluid"
                    placeholder="Confirma tu nueva contraseña"
                    required
                    feedback={false}
                    toggleMask
                  />
                </div>

                {/* Botón cambiar contraseña */}
                <div className="p-col-12">
                  <Button 
                    type="submit" 
                    label={passwordLoading ? "Cambiando contraseña..." : "Cambiar Contraseña"} 
                    icon={passwordLoading ? "pi pi-spin pi-spinner" : "pi pi-lock"}
                    className="p-fluid"
                    style={{ height: "3rem" }}
                    disabled={passwordLoading}
                  />
                </div>
              </div>
            </form>
          </Card>
        </div>

        {/* Información adicional */}
        <div className="p-col-12">
          <Card>
            <div className="p-mb-3">
              <h3 className="p-m-0 p-text-lg p-text-md-xl" style={{ color: "#1f2937" }}>
                Información de la cuenta
              </h3>
            </div>
            
            <div className="p-grid p-fluid">
              <div className="p-col-12 p-md-6">
                <div className="p-d-flex p-jc-between p-ai-center p-p-3 p-surface-100 p-border-round">
                  <span className="p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>Usuario:</span>
                  <span className="p-text-sm" style={{ color: "#6b7280" }}>{user.email}</span>
                </div>
              </div>
              <div className="p-col-12 p-md-6">
                <div className="flex justify-content-between align-items-center mb-3">
                  <span className="text-600">Rol:</span>
                  <Tag 
                    value={user.role === "admin" ? "Administrador" : user.role === "Santi" ? "Vendedor Santi" : user.role === "Guille" ? "Vendedor Guille" : "Usuario"}
                    severity={user.role === "admin" ? "danger" : "info"}
                  />
                </div>
              </div>
              <div className="p-col-12 p-md-6">
                <div className="flex justify-content-between align-items-center mb-3">
                  <span className="text-600">Permisos:</span>
                  <span className="text-900 font-medium">
                    {user.role === "admin" ? "Acceso completo" : "Acceso limitado"}
                  </span>
                </div>
              </div>
              <div className="p-col-12 p-md-6">
                <div className="flex justify-content-between align-items-center">
                  <span className="text-600">Funcionalidades:</span>
                  <span className="text-900 font-medium">
                    {user.role === "admin" ? "Todas las funciones" : "Funciones de vendedor"}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default UserProfile; 