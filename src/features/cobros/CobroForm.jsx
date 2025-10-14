import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { crearCobro, actualizarCobro } from './cobrosService';
import { FORMAS_PAGO } from './constants';
import { validarMonto, validarFecha, validarCliente, validarFormaPago } from './utils';

const CobroForm = ({ visible, onHide, cobro, onSuccess, user }) => {
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    if (cobro) {
      // Editar cobro existente
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
  }, [cobro, visible]);

  const resetForm = () => {
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
    
    const montoError = validarMonto(formData.monto);
    if (montoError) newErrors.monto = montoError;
    
    const fechaError = validarFecha(formData.fechaCobro);
    if (fechaError) newErrors.fechaCobro = fechaError;
    
    const clienteError = validarCliente(formData.cliente);
    if (clienteError) newErrors.cliente = clienteError;
    
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
      const cobroData = {
        ...formData,
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
            <InputText
              id="cliente"
              value={formData.cliente}
              onChange={(e) => handleInputChange('cliente', e.target.value)}
              placeholder="Nombre del cliente"
              className={errors.cliente ? 'p-invalid' : ''}
              disabled={loading}
            />
            {errors.cliente && (
              <small className="p-error">{errors.cliente}</small>
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

