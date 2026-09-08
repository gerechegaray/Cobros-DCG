import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { crearCobro } from './cobrosService';
import { FORMAS_PAGO } from './constants';
import { getClientesCatalogo } from '../../services/firebase';
import ClientePickerMovil, { nombreCliente } from '../../components/ClientePickerMovil';
import { borrarBorradorCobro, guardarBorradorCobro, leerBorradorCobro } from '../../offline/borradores';
import { recordarCliente } from '../../offline/clientesRecientes';
import { fueEncolado, mensajeGuardado } from '../../offline/fueEncolado';

const CobroFormMovil = ({ visible, onHide, onSuccess, user }) => {
  const toast = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [cliente, setCliente] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [monto, setMonto] = useState(0);
  const [formaPago, setFormaPago] = useState('efectivo');
  const [observaciones, setObservaciones] = useState('');

  const getSellerId = () => {
    if (user?.role === 'Guille') return 1;
    if (user?.role === 'Santi') return 2;
    if (user?.role === 'admin') return null;
    return null;
  };

  const limpiarFormulario = () => {
    setCliente(null);
    setMonto(0);
    setFormaPago('efectivo');
    setObservaciones('');
  };

  useEffect(() => {
    const cargarClientes = async () => {
      setLoadingClientes(true);
      try {
        const data = await getClientesCatalogo();
        const sellerId = getSellerId();
        let lista = data;

        if (sellerId !== null) {
          lista = data.filter((item) => item.seller?.id === sellerId.toString());
        } else if (user?.role !== 'admin') {
          lista = [];
        }

        lista = [...lista].sort((a, b) => nombreCliente(a).localeCompare(nombreCliente(b), 'es', { sensitivity: 'base' }));
        setClientes(lista);
      } catch (error) {
        console.error('Error cargando clientes:', error);
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar clientes'
        });
      } finally {
        setLoadingClientes(false);
      }
    };

    if (!visible) return;
    cargarClientes();
    const draft = leerBorradorCobro();
    if (draft) {
      setCliente(draft.cliente || null);
      setMonto(draft.monto || 0);
      setFormaPago(draft.formaPago || 'efectivo');
      setObservaciones(draft.observaciones || '');
    } else {
      limpiarFormulario();
    }
  }, [visible, user]);

  useEffect(() => {
    if (!visible) return;
    guardarBorradorCobro({ cliente, monto, formaPago, observaciones });
  }, [visible, cliente, monto, formaPago, observaciones]);

  const validarFormulario = () => {
    if (!cliente?.id) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Elegí un cliente de la lista'
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

  const handleSubmit = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      const cobroData = {
        cliente: nombreCliente(cliente),
        clienteId: cliente.id,
        monto: Number(monto),
        fechaCobro: new Date(),
        formaPago,
        notas: observaciones,
        estado: 'pendiente',
        origen: 'mobile'
      };

      const result = await crearCobro(cobroData, user);
      toast.current?.show({
        severity: fueEncolado(result) ? 'info' : 'success',
        summary: fueEncolado(result) ? 'Sin conexión' : 'Listo',
        detail: mensajeGuardado(
          result,
          'Cobro registrado',
          'El cobro quedó en el teléfono y se envía cuando haya red'
        ),
        life: 2500
      });

      recordarCliente(cliente);
      borrarBorradorCobro();
      limpiarFormulario();
      onSuccess?.();
      setTimeout(() => onHide(), 400);
    } catch (error) {
      console.error('Error guardando cobro:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo registrar el cobro'
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
        header="Nuevo cobro"
        footer={footer}
        style={{ width: '100vw', maxWidth: '100%', height: '100vh', maxHeight: '100%' }}
        modal
        className="p-fluid cobro-form-movil"
        contentStyle={{ padding: '0' }}
        dismissableMask={!loading}
      >
        <div className="p-4 form-movil-scroll cobro-form-campos">
          <div className="field mb-3">
            <label className="block mb-2 font-semibold">Cliente <span className="text-red-500">*</span></label>
            <ClientePickerMovil
              clientes={clientes}
              value={cliente}
              onChange={setCliente}
              loading={loadingClientes}
              disabled={loading}
            />
          </div>

          {cliente && (
            <>
          <div className="field mb-3">
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
              className="w-full"
              inputMode="decimal"
              inputStyle={{ fontSize: '18px', padding: '14px' }}
              autoFocus
            />
          </div>

          <div className="field mb-3">
            <label className="block mb-2 font-semibold">Forma de pago</label>
            <div className="cobro-formas">
              {FORMAS_PAGO.map((opcion) => (
                <button
                  key={opcion.value}
                  type="button"
                  className={`cobro-forma ${formaPago === opcion.value ? 'is-active' : ''}`}
                  onClick={() => setFormaPago(opcion.value)}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field mb-3">
            <label htmlFor="obs-cobro-movil" className="block mb-2 font-semibold">Observaciones</label>
            <InputTextarea
              id="obs-cobro-movil"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full"
              style={{ fontSize: '16px', padding: '12px' }}
            />
          </div>
            </>
          )}
        </div>
      </Dialog>
    </>
  );
};

export default CobroFormMovil;
