import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { AutoComplete } from 'primereact/autocomplete';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';
import { crearCobro } from './cobrosService';
import { FORMAS_PAGO } from './constants';
import { api } from '../../services/api';

const CobroFormMovil = ({ visible, onHide, onSuccess, user }) => {
  const toast = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  
  // Datos del formulario
  const [cliente, setCliente] = useState(null);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [monto, setMonto] = useState(0);
  const [formaPago, setFormaPago] = useState('efectivo');
  const [observaciones, setObservaciones] = useState('');

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
      // Resetear formulario al abrir
      limpiarFormulario();
    }
  }, [visible, user]);

  const limpiarFormulario = () => {
    setCliente(null);
    setMonto(0);
    setFormaPago('efectivo');
    setObservaciones('');
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

  // Validar formulario
  const validarFormulario = () => {
    if (!cliente) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Debe seleccionar un cliente'
      });
      return false;
    }

    // 🆕 Validar que el cliente seleccionado tenga id
    if (!cliente.id) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Cliente inválido. Seleccioná un cliente de la lista.'
      });
      return false;
    }

    if (!monto || monto <= 0) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'El monto debe ser mayor a 0'
      });
      return false;
    }

    return true;
  };

  // Guardar cobro
  const handleSubmit = async () => {
    if (!validarFormulario()) {
      return;
    }

    setLoading(true);
    try {
      // 🆕 clienteId ya está validado en validarFormulario(), no puede ser null aquí
      const clienteId = cliente.id;
      const clienteNombre = cliente?.name || cliente?.nombre || cliente?.['Razón Social'] || cliente || '';

      const cobroData = {
        cliente: clienteNombre,
        clienteId: clienteId, // 🆕 Siempre válido gracias a la validación previa
        monto: Number(monto),
        fechaCobro: new Date(), // 🆕 Usar mismo nombre que desktop
        formaPago,
        notas: observaciones,
        estado: 'pendiente', // Default: pendiente
        origen: 'mobile' // 🆕 Marcar origen móvil
      };

      await crearCobro(cobroData, user);
      
      toast.current?.show({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Cobro registrado correctamente',
        life: 2000
      });

      limpiarFormulario();
      onSuccess?.();
      
      // Cerrar después de un breve delay para que se vea el mensaje
      setTimeout(() => {
        onHide();
      }, 500);
    } catch (error) {
      console.error('Error guardando cobro:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al registrar el cobro'
      });
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex gap-2 p-3" style={{ borderTop: '1px solid #e5e7eb' }}>
      <Button
        label="Cancelar"
        icon="pi pi-times"
        className="p-button-text flex-1"
        onClick={onHide}
        disabled={loading}
        style={{ padding: '12px', fontSize: '16px' }}
      />
      <Button
        label="Registrar cobro"
        icon="pi pi-check"
        onClick={handleSubmit}
        loading={loading}
        className="flex-1"
        style={{ padding: '12px', fontSize: '16px' }}
      />
    </div>
  );

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        visible={visible}
        onHide={onHide}
        header="Nuevo Cobro"
        footer={footer}
        style={{ width: '100vw', maxWidth: '100%', height: '100vh', maxHeight: '100%' }}
        breakpoints={{ '960px': '95vw' }}
        modal
        className="p-fluid"
        contentStyle={{ padding: '0' }}
        dismissableMask={!loading}
      >
        <div className="p-4" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          {/* Cliente */}
          <div className="field mb-4">
            <label htmlFor="cliente-cobro-movil" className="block mb-2 font-semibold">
              Cliente <span className="text-red-500">*</span>
            </label>
            <AutoComplete
              id="cliente-cobro-movil"
              value={cliente}
              suggestions={clientesFiltrados}
              completeMethod={buscarClientes}
              onChange={(e) => setCliente(e.value)}
              placeholder="Buscar cliente..."
              className="w-full"
              inputStyle={{ fontSize: '16px', padding: '12px' }}
              panelStyle={{ fontSize: '16px' }}
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
            {cliente && (
              <Card className="mt-3">
                <div className="p-2">
                  <p className="font-semibold mb-1">
                    {cliente.name || cliente.nombre || cliente['Razón Social'] || cliente}
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* Monto */}
          <div className="field mb-4">
            <label htmlFor="monto-cobro-movil" className="block mb-2 font-semibold">
              Monto <span className="text-red-500">*</span>
            </label>
            <InputNumber
              id="monto-cobro-movil"
              value={monto}
              onValueChange={(e) => setMonto(e.value || 0)}
              mode="currency"
              currency="ARS"
              locale="es-AR"
              placeholder="$0"
              className="w-full"
              inputStyle={{ fontSize: '16px', padding: '12px' }}
              disabled={loading}
              min={0}
            />
          </div>

          {/* Forma de Pago */}
          <div className="field mb-4">
            <label htmlFor="forma-pago-cobro-movil" className="block mb-2 font-semibold">
              Forma de Pago
            </label>
            <Dropdown
              id="forma-pago-cobro-movil"
              value={formaPago}
              options={FORMAS_PAGO}
              onChange={(e) => setFormaPago(e.value)}
              className="w-full"
              style={{ fontSize: '16px', padding: '12px' }}
              disabled={loading}
            />
          </div>

          {/* Observaciones */}
          <div className="field mb-4">
            <label htmlFor="observaciones-cobro-movil" className="block mb-2 font-semibold">
              Observaciones (opcional)
            </label>
            <InputTextarea
              id="observaciones-cobro-movil"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={4}
              className="w-full"
              placeholder="Agregar notas o comentarios..."
              style={{ fontSize: '16px', padding: '12px' }}
              disabled={loading}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default CobroFormMovil;

