import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

function MenuClientes({ user }) {
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mostrarEditar, setMostrarEditar] = useState(false);
  const [nuevaUbicacion, setNuevaUbicacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const navigate = useNavigate();
  const toast = useRef(null);

  // Obtener sellerId según rol
  const getSellerId = () => {
    if (user?.role === 'Guille') return 1;
    if (user?.role === 'Santi') return 2;
    if (user?.role === 'admin') return null;
    return null;
  };

  // Cargar clientes
  useEffect(() => {
    const fetchClientes = async () => {
      setLoading(true);
      try {
        const data = await api.getClientesFirebase();
        const sellerId = getSellerId();
        
        let clientesFiltrados = data;
        if (sellerId !== null) {
          clientesFiltrados = data.filter(cliente => 
            cliente.seller && cliente.seller.id === sellerId.toString()
          );
        }
        
        setClientes(clientesFiltrados.sort((a, b) => {
          const nombreA = a.name || a.nombre || a['Razón Social'] || '';
          const nombreB = b.name || b.nombre || b['Razón Social'] || '';
          return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
        }));
      } catch (error) {
        console.error('Error cargando clientes:', error);
        if (toast.current) {
          toast.current.show({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar los clientes'
          });
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchClientes();
  }, [user]);

  // Formatear opciones para dropdown
  const opcionesClientes = clientes.map(cliente => ({
    label: cliente.name || cliente.nombre || cliente['Razón Social'] || cliente.id,
    value: cliente
  }));

  // Manejar selección de cliente
  const handleClienteChange = (e) => {
    setClienteSeleccionado(e.value);
    setNuevaUbicacion(e.value?.ubicacion || '');
  };

  // Navegar a estado de cuenta
  const irAEstadoCuenta = () => {
    if (clienteSeleccionado) {
      // Usar el ID del cliente como identificador principal
      const clienteId = clienteSeleccionado.id || clienteSeleccionado.name || clienteSeleccionado.nombre || clienteSeleccionado['Razón Social'];
      // console.log('[MenuClientes] Navegando a estado de cuenta con cliente:', clienteSeleccionado);
      // console.log('[MenuClientes] Cliente ID a pasar:', clienteId);
      navigate(`/estado-cuenta?cliente=${encodeURIComponent(clienteId)}`);
    }
  };

  // Abrir Google Maps
  const verUbicacion = () => {
    if (clienteSeleccionado?.ubicacion) {
      let url;
      
      // Si es un link de Google Maps, abrirlo directamente
      if (clienteSeleccionado.ubicacion.startsWith('https://maps.app.goo.gl/') || 
          clienteSeleccionado.ubicacion.startsWith('https://www.google.com/maps/') ||
          clienteSeleccionado.ubicacion.startsWith('https://goo.gl/maps/')) {
        url = clienteSeleccionado.ubicacion;
      } else {
        // Si es una dirección real, buscar en Google Maps
        url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clienteSeleccionado.ubicacion)}`;
      }
      
      window.open(url, '_blank');
    }
  };

  // Guardar nueva ubicación
  const guardarUbicacion = async () => {
    if (!clienteSeleccionado || !nuevaUbicacion.trim()) {
      toast.current.show({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor ingresa una ubicación válida'
      });
      return;
    }

    setGuardando(true);
    try {
      // Actualizar usando el endpoint del backend
      const response = await api.updateClienteUbicacion(clienteSeleccionado.id, nuevaUbicacion.trim());
      
      if (response.success) {
        // Actualizar estado local
        setClienteSeleccionado({
          ...clienteSeleccionado,
          ubicacion: nuevaUbicacion.trim()
        });

        toast.current.show({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Ubicación actualizada correctamente'
        });

        setMostrarEditar(false);
      } else {
        throw new Error(response.message || 'Error al actualizar ubicación');
      }
    } catch (error) {
      console.error('Error guardando ubicación:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Error al guardar la ubicación'
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-4">
      <Toast ref={toast} />
      
      <Card title="Gestión de Clientes" className="w-full">
        <div className="grid">
          {/* Dropdown de selección */}
          <div className="col-12 md:col-6">
            <label htmlFor="cliente-select" className="font-semibold mb-2 block">
              Seleccionar Cliente:
            </label>
            <Dropdown
              id="cliente-select"
              value={clienteSeleccionado}
              options={opcionesClientes}
              onChange={handleClienteChange}
              optionLabel="label"
              placeholder="Selecciona un cliente"
              loading={loading}
              filter
              filterPlaceholder="Buscar cliente..."
              showClear
              className="w-full"
            />
          </div>

          {/* Información del cliente */}
          {clienteSeleccionado && (
            <div className="col-12 md:col-6">
              <div className="surface-50 p-3 border-round">
                <h4 className="mt-0 mb-2">Información del Cliente</h4>
                <div className="grid">
                  <div className="col-12">
                    <strong>Nombre:</strong> {clienteSeleccionado.name || clienteSeleccionado.nombre || clienteSeleccionado['Razón Social']}
                  </div>
                  <div className="col-12">
                    <strong>Vendedor:</strong> {
                      (() => {
                        if (typeof clienteSeleccionado.seller === 'object' && clienteSeleccionado.seller) {
                          return clienteSeleccionado.seller.name || 'Sin asignar';
                        }
                        if (clienteSeleccionado.seller === 1 || clienteSeleccionado.seller === '1') return 'Guille';
                        if (clienteSeleccionado.seller === 2 || clienteSeleccionado.seller === '2') return 'Santi';
                        return clienteSeleccionado.seller || 'Sin asignar';
                      })()
                    }
                  </div>
                  {clienteSeleccionado.phonePrimary && (
                    <div className="col-12">
                      <strong>Teléfono:</strong> {clienteSeleccionado.phonePrimary}
                    </div>
                  )}
                  {clienteSeleccionado.address && (
                    <div className="col-12">
                      <strong>Domicilio:</strong> {
                        typeof clienteSeleccionado.address === 'string' ? 
                          clienteSeleccionado.address : 
                          clienteSeleccionado.address.address || 
                          JSON.stringify(clienteSeleccionado.address)
                      }
                    </div>
                  )}
                  <div className="col-12">
                    <strong>Ubicación:</strong> {clienteSeleccionado.ubicacion ? 'Sí' : 'No'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          {clienteSeleccionado && (
            <div className="col-12">
              <div className="flex gap-2 flex-wrap mt-3">
                <Button
                  label="Estado de Cuenta"
                  icon="pi pi-credit-card"
                  onClick={irAEstadoCuenta}
                  className="p-button-primary"
                />
                
                <Button
                  label="Ver Ubicación"
                  icon="pi pi-map-marker"
                  onClick={verUbicacion}
                  disabled={!clienteSeleccionado.ubicacion}
                  className="p-button-info"
                  tooltip={!clienteSeleccionado.ubicacion ? "No hay ubicación registrada" : ""}
                />
                
                {user?.role === 'admin' && (
                  <Button
                    label="Editar Cliente"
                    icon="pi pi-pencil"
                    onClick={() => setMostrarEditar(true)}
                    className="p-button-warning"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Modal para editar ubicación */}
      <Dialog
        header="Editar Ubicación del Cliente"
        visible={mostrarEditar}
        onHide={() => setMostrarEditar(false)}
        style={{ width: '400px' }}
        modal
      >
        <div className="p-fluid">
          <div className="field">
            <label htmlFor="ubicacion">Ubicación:</label>
            <InputText
              id="ubicacion"
              value={nuevaUbicacion}
              onChange={(e) => setNuevaUbicacion(e.target.value)}
              placeholder="Ingresa la dirección completa"
            />
            <small className="text-600">
              Ejemplo: Calle 123 #45-67, Ciudad, País
            </small>
          </div>
          <div className="flex justify-content-end gap-2 mt-3">
            <Button
              label="Cancelar"
              icon="pi pi-times"
              onClick={() => setMostrarEditar(false)}
              className="p-button-secondary"
              disabled={guardando}
            />
            <Button
              label="Guardar"
              icon="pi pi-check"
              onClick={guardarUbicacion}
              className="p-button-primary"
              loading={guardando}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default MenuClientes;
