import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { AutoComplete } from 'primereact/autocomplete';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';
import { crearCobro, actualizarCobro } from './cobrosService';
import { FORMAS_PAGO } from './constants';
import { validarMonto, validarFecha, validarFormaPago } from './utils';
import { api } from '../../services/api';

const CobroForm = ({ visible, onHide, cobro, onSuccess, user }) => {
  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [formData, setFormData] = useState({
    cliente: '',
    clienteId: '',
    monto: 0,
    fechaCobro: new Date(),
    formaPago: '',
    notas: ''
  });
  const [errors, setErrors] = useState({});
  const toast = useRef(null);

  // Obtener el sellerId según el rol del usuario
  const getSellerId = () => {
    if (user?.role === 'Guille') return 1;
    if (user?.role === 'Santi') return 2;
    if (user?.role === 'admin') return null; // Admin ve todos
    return null;
  };

  // Cargar clientes asignados al vendedor
  useEffect(() => {
    const cargarClientes = async () => {
      setLoadingClientes(true);
      try {
        const data = await api.getClientesFirebase();
        
        // Filtrar clientes según el rol del usuario
        const sellerId = getSellerId();
        let clientesFiltrados = data;
        
        if (sellerId !== null) {
          // Filtrar por sellerId específico - el seller es un objeto con id
          clientesFiltrados = data.filter(cliente => {
            if (cliente.seller && cliente.seller.id) {
              return cliente.seller.id === sellerId.toString();
            }
            return false;
          });
        } else if (user?.role === 'admin') {
          // Admin ve todos los clientes
          clientesFiltrados = data;
        } else {
          // Usuario sin rol válido - no mostrar clientes
          clientesFiltrados = [];
        }
        
        // Ordenar clientes alfabéticamente
        const clientesOrdenados = clientesFiltrados.sort((a, b) => {
          const nombreA = a.name || a.nombre || a['Razón Social'] || '';
          const nombreB = b.name || b.nombre || b['Razón Social'] || '';
          return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
        });
        
        setClientes(clientesOrdenados);
      } catch (error) {
        console.error('Error cargando clientes:', error);
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar clientes'
        });
      } finally {
        setLoadingClientes(false);
      }
    };
    
    if (visible) {
      cargarClientes();
    }
  }, [visible, user]);

  useEffect(() => {
    if (cobro) {
      // Editar cobro existente
      // Buscar el cliente en la lista de clientes cargados
      const clienteEncontrado = clientes.find(c => 
        c.id === cobro.clienteId || 
        (c.name || c.nombre || c['Razón Social']) === cobro.cliente
      );
      
      setClienteSeleccionado(clienteEncontrado || null);
      setFormData({
        cliente: cobro.cliente || '',
        clienteId: cobro.clienteId || '',
        monto: cobro.monto || 0,
        fechaCobro: cobro.fechaCobro?.toDate ? cobro.fechaCobro.toDate() : new Date(cobro.fechaCobro),
        formaPago: cobro.formaPago || '',
        notas: cobro.notas || ''
      });
    } else {
      // Nuevo cobro
      resetForm();
    }
  }, [cobro, visible, clientes]);

  const resetForm = () => {
    setClienteSeleccionado(null);
    setFormData({
      cliente: '',
      clienteId: '',
      monto: 0,
      fechaCobro: new Date(),
      formaPago: '',
      notas: ''
    });
    setErrors({});
  };

  // Autocompletado de clientes
  const buscarClientes = (event) => {
    const query = event.query.toLowerCase();
    const filtered = clientes.filter(c => {
      const nombre = (c.name || c.nombre || c['Razón Social'] || '').toLowerCase();
      const identificacion = (c.identification || c.id || '').toString().toLowerCase();
      return nombre.includes(query) || identificacion.includes(query);
    });
    setClientesFiltrados(filtered);
  };

  // Manejar cambio de cliente
  const handleClienteChange = (cliente) => {
    setClienteSeleccionado(cliente);
    if (cliente) {
      const clienteNombre = cliente.name || cliente.nombre || cliente['Razón Social'] || '';
      const clienteId = cliente.id || null;
      setFormData(prev => ({
        ...prev,
        cliente: clienteNombre,
        clienteId: clienteId
      }));
      // Limpiar error del campo cuando se selecciona un cliente
      if (errors.cliente) {
        setErrors(prev => ({
          ...prev,
          cliente: null
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        cliente: '',
        clienteId: ''
      }));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validar cliente: debe estar seleccionado y tener id
    if (!clienteSeleccionado || !clienteSeleccionado.id) {
      newErrors.cliente = 'Debe seleccionar un cliente de la lista';
    }
    
    const montoError = validarMonto(formData.monto);
    if (montoError) newErrors.monto = montoError;
    
    const fechaError = validarFecha(formData.fechaCobro);
    if (fechaError) newErrors.fechaCobro = fechaError;
    
    const formaPagoError = validarFormaPago(formData.formaPago);
    if (formaPagoError) newErrors.formaPago = formaPagoError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Validación',
        detail: 'Por favor completa todos los campos requeridos',
        life: 3000
      });
      return;
    }

    setLoading(true);
    try {
      // Asegurar que clienteId siempre esté presente y sea válido
      const clienteId = clienteSeleccionado?.id || formData.clienteId;
      const clienteNombre = clienteSeleccionado 
        ? (clienteSeleccionado.name || clienteSeleccionado.nombre || clienteSeleccionado['Razón Social'] || '')
        : formData.cliente;

      const cobroData = {
        ...formData,
        cliente: clienteNombre,
        clienteId: clienteId, // 🆕 Siempre válido gracias a la validación previa
        monto: Number(formData.monto)
      };

      if (cobro?.id) {
        // Actualizar cobro existente
        await actualizarCobro(cobro.id, cobroData, user);
        toast.current?.show({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Cobro actualizado correctamente',
          life: 3000
        });
      } else {
        // Crear nuevo cobro
        await crearCobro(cobroData, user);
        toast.current?.show({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Cobro creado correctamente',
          life: 3000
        });
      }

      resetForm();
      onSuccess?.();
      onHide();
    } catch (error) {
      console.error('Error guardando cobro:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al guardar el cobro',
        life: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onHide();
  };

  const footer = (
    <div className="flex gap-2 justify-content-end">
      <Button 
        label="Cancelar" 
        icon="pi pi-times" 
        onClick={handleCancel} 
        className="p-button-text flex-1 md:flex-none"
        disabled={loading}
      />
      <Button 
        label={cobro ? "Actualizar" : "Guardar"} 
        icon="pi pi-check" 
        onClick={handleSubmit} 
        loading={loading}
        className="flex-1 md:flex-none"
        autoFocus
      />
    </div>
  );

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        header={cobro ? "Editar Cobro" : "Nuevo Cobro"}
        visible={visible}
        style={{ width: '600px' }}
        footer={footer}
        onHide={handleCancel}
        modal
        dismissableMask={!loading}
        breakpoints={{ '960px': '90vw', '640px': '100vw' }}
        contentStyle={{ maxHeight: '70vh', overflow: 'auto' }}
      >
        <form onSubmit={handleSubmit} className="p-fluid">
          {/* Cliente */}
          <div className="field mb-4">
            <label htmlFor="cliente" className="block mb-2 font-semibold">
              Cliente <span className="text-red-500">*</span>
            </label>
            <AutoComplete
              id="cliente"
              value={clienteSeleccionado}
              suggestions={clientesFiltrados}
              completeMethod={buscarClientes}
              onChange={(e) => handleClienteChange(e.value)}
              placeholder="Buscar cliente..."
              className={errors.cliente ? 'p-invalid' : ''}
              disabled={loading || loadingClientes}
              itemTemplate={(cliente) => {
                const nombre = cliente.name || cliente.nombre || cliente['Razón Social'] || cliente.id || 'Sin nombre';
                const identificacion = cliente.identification ? ` - ${cliente.identification}` : '';
                return (
                  <div className="p-2">
                    <div className="font-semibold">{nombre}</div>
                    {identificacion && <div className="text-sm text-gray-600">{identificacion}</div>}
                  </div>
                );
              }}
              selectedItemTemplate={(cliente) => {
                if (!cliente) return '';
                return cliente.name || cliente.nombre || cliente['Razón Social'] || cliente.id || 'Sin nombre';
              }}
            />
            {errors.cliente && (
              <small className="p-error">{errors.cliente}</small>
            )}
            {clienteSeleccionado && (
              <Card className="mt-3">
                <div className="p-2">
                  <p className="font-semibold mb-1">
                    {clienteSeleccionado.name || clienteSeleccionado.nombre || clienteSeleccionado['Razón Social'] || clienteSeleccionado}
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* Monto */}
          <div className="field mb-4">
            <label htmlFor="monto" className="block mb-2 font-semibold">
              Monto <span className="text-red-500">*</span>
            </label>
            <InputNumber
              id="monto"
              value={formData.monto}
              onValueChange={(e) => handleInputChange('monto', e.value)}
              mode="currency"
              currency="ARS"
              locale="es-AR"
              placeholder="$0"
              className={errors.monto ? 'p-invalid' : ''}
              disabled={loading}
            />
            {errors.monto && (
              <small className="p-error">{errors.monto}</small>
            )}
          </div>

          {/* Fecha del Cobro */}
          <div className="field mb-4">
            <label htmlFor="fechaCobro" className="block mb-2 font-semibold">
              Fecha del Cobro <span className="text-red-500">*</span>
            </label>
            <Calendar
              id="fechaCobro"
              value={formData.fechaCobro}
              onChange={(e) => handleInputChange('fechaCobro', e.value)}
              dateFormat="dd/mm/yy"
              showIcon
              placeholder="Selecciona una fecha"
              className={errors.fechaCobro ? 'p-invalid' : ''}
              disabled={loading}
              touchUI
            />
            {errors.fechaCobro && (
              <small className="p-error">{errors.fechaCobro}</small>
            )}
          </div>

          {/* Forma de Pago */}
          <div className="field mb-4">
            <label htmlFor="formaPago" className="block mb-2 font-semibold">
              Forma de Pago <span className="text-red-500">*</span>
            </label>
            <Dropdown
              id="formaPago"
              value={formData.formaPago}
              options={FORMAS_PAGO}
              onChange={(e) => handleInputChange('formaPago', e.value)}
              placeholder="Selecciona forma de pago"
              className={errors.formaPago ? 'p-invalid' : ''}
              disabled={loading}
            />
            {errors.formaPago && (
              <small className="p-error">{errors.formaPago}</small>
            )}
          </div>

          {/* Notas */}
          <div className="field mb-4">
            <label htmlFor="notas" className="block mb-2 font-semibold">
              Notas Adicionales
            </label>
            <InputTextarea
              id="notas"
              value={formData.notas}
              onChange={(e) => handleInputChange('notas', e.target.value)}
              rows={3}
              placeholder="Información adicional sobre el cobro..."
              disabled={loading}
            />
          </div>

          {/* Información del vendedor (solo mostrar, no editable) */}
          {cobro && (
            <div className="field mb-4 p-3 bg-gray-100 border-round">
              <div className="flex justify-content-between">
                <div>
                  <small className="text-gray-600">Vendedor:</small>
                  <p className="mt-1 mb-0 font-semibold">{cobro.vendedor}</p>
                </div>
                <div>
                  <small className="text-gray-600">Estado:</small>
                  <p className="mt-1 mb-0">
                    <span className={`p-badge ${cobro.estado === 'cargado' ? 'p-badge-success' : 'p-badge-warning'}`}>
                      {cobro.estado === 'cargado' ? 'Cargado' : 'Pendiente'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      </Dialog>
    </>
  );
};

export default CobroForm;

