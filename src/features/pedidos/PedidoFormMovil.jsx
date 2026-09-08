import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { crearPedido, actualizarPedido, getProductos, getClientesAsignados } from './pedidosService';
import { CONDICIONES_PAGO } from './constants';
import { formatearMoneda, calcularTotal, calcularTotalProducto } from './utils';
import ClientePickerMovil, { nombreCliente } from '../../components/ClientePickerMovil';
import { borrarBorradorPedido, guardarBorradorPedido, leerBorradorPedido } from '../../offline/borradores';
import { recordarCliente } from '../../offline/clientesRecientes';
import { fueEncolado, mensajeGuardado } from '../../offline/fueEncolado';

const PedidoFormMovil = ({ visible, onHide, pedido, onSuccess, user }) => {
  const toast = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [cliente, setCliente] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [fechaPedido] = useState(new Date());
  const [condicionPago, setCondicionPago] = useState('contado');
  const [observaciones, setObservaciones] = useState('');
  const [productos, setProductos] = useState([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [descuentoProducto, setDescuentoProducto] = useState(0);
  const [productosAgregados, setProductosAgregados] = useState([]);

  const limpiarFormulario = () => {
    setCliente(null);
    setCondicionPago('contado');
    setObservaciones('');
    setProductosAgregados([]);
    setProductoSeleccionado(null);
    setBusquedaProducto('');
    setCantidad(1);
    setPrecioUnitario(0);
    setDescuentoProducto(0);
    setActiveStep(0);
  };

  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const clientesData = await getClientesAsignados(user);
        setClientes(clientesData);
      } catch (error) {
        console.error('Error cargando clientes:', error);
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar clientes. Si ya los usaste hoy, probá de nuevo con red.'
        });
      }
    };

    if (visible) {
      cargarClientes();
    }
  }, [visible, user]);

  useEffect(() => {
    const cargarProductos = async () => {
      setLoadingProductos(true);
      try {
        const productosData = await getProductos(false);
        setProductos(productosData);
      } catch (error) {
        console.error('Error cargando productos:', error);
        toast.current?.show({
          severity: 'warn',
          summary: 'Productos',
          detail: 'No se pudieron actualizar. Se usan los últimos guardados en el teléfono.'
        });
      } finally {
        setLoadingProductos(false);
      }
    };

    if (visible && activeStep === 1) {
      cargarProductos();
    }
  }, [visible, activeStep]);

  useEffect(() => {
    if (!visible) return;
    if (pedido) {
      setCliente(pedido.cliente);
      setCondicionPago(pedido.condicionPago || 'contado');
      setObservaciones(pedido.observaciones || '');
      setProductosAgregados(pedido.productos || []);
      setActiveStep(0);
      return;
    }
    const draft = leerBorradorPedido();
    if (draft) {
      setCliente(draft.cliente || null);
      setCondicionPago(draft.condicionPago || 'contado');
      setObservaciones(draft.observaciones || '');
      setProductosAgregados(draft.productosAgregados || []);
      setActiveStep(draft.activeStep || 0);
    } else {
      limpiarFormulario();
    }
  }, [pedido, visible]);

  useEffect(() => {
    if (!visible || pedido) return;
    guardarBorradorPedido({
      cliente,
      condicionPago,
      observaciones,
      productosAgregados,
      activeStep
    });
  }, [visible, pedido, cliente, condicionPago, observaciones, productosAgregados, activeStep]);

  useEffect(() => {
    if (productoSeleccionado) {
      setPrecioUnitario(productoSeleccionado.precio || 0);
    }
  }, [productoSeleccionado]);

  const validarDescuento = (valor) => {
    if (valor === null || valor === undefined || valor === '') return 0;
    const num = Number(valor);
    if (Number.isNaN(num)) return 0;
    if (num < 0) return 0;
    if (num > 100) return 100;
    return num;
  };

  const agregarProducto = () => {
    if (!productoSeleccionado) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Elegí un producto'
      });
      return;
    }

    if (cantidad <= 0) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Atención',
        detail: 'La cantidad debe ser mayor a 0'
      });
      return;
    }

    const descuentoValidado = validarDescuento(descuentoProducto);
    const sinStock = (productoSeleccionado.stock || 0) <= 0;
    if (sinStock) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Sin stock',
        detail: 'Producto sin stock. Se agrega igual.',
        life: 3000
      });
    }

    setProductosAgregados([
      ...productosAgregados,
      {
        id: productoSeleccionado.id,
        nombre: productoSeleccionado.nombre,
        codigo: productoSeleccionado.codigo,
        cantidad,
        precioUnitario,
        descuento: descuentoValidado,
        total: calcularTotalProducto(cantidad, precioUnitario, descuentoValidado),
        observaciones: '',
        sinStock
      }
    ]);

    setProductoSeleccionado(null);
    setBusquedaProducto('');
    setCantidad(1);
    setPrecioUnitario(0);
    setDescuentoProducto(0);
  };

  const eliminarProducto = (index) => {
    setProductosAgregados(productosAgregados.filter((_, i) => i !== index));
  };

  const total = calcularTotal(productosAgregados);

  const siguientePaso = () => {
    if (activeStep === 0 && !cliente) {
      toast.current?.show({
        severity: 'error',
        summary: 'Cliente',
        detail: 'Elegí un cliente'
      });
      return;
    }
    if (activeStep < 1) setActiveStep(activeStep + 1);
  };

  const pasoAnterior = () => {
    if (activeStep > 0) setActiveStep(activeStep - 1);
  };

  const cerrarYBorrar = () => {
    borrarBorradorPedido();
    limpiarFormulario();
    onHide();
  };

  const handleCerrar = () => {
    if (loading) return;
    if (pedido) {
      onHide();
      return;
    }
    const hayDatos = Boolean(
      cliente || productosAgregados.length > 0 || observaciones.trim()
    );
    if (!hayDatos) {
      cerrarYBorrar();
      return;
    }
    confirmDialog({
      message: 'Se va a borrar el cliente y los productos de este pedido.',
      header: 'Descartar pedido',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, borrar',
      rejectLabel: 'Seguir',
      acceptClassName: 'p-button-danger',
      accept: cerrarYBorrar
    });
  };

  const handleSubmit = async () => {
    if (!cliente) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Elegí un cliente' });
      return;
    }
    if (productosAgregados.length === 0) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Agregá al menos un producto' });
      return;
    }

    setLoading(true);
    try {
      const pedidoData = {
        cliente: nombreCliente(cliente),
        clienteId: cliente.id || null,
        fechaPedido,
        condicionPago,
        productos: productosAgregados,
        total,
        observaciones,
        origen: 'mobile'
      };

      if (pedido) {
        await actualizarPedido(pedido.id, pedidoData, user);
        toast.current?.show({
          severity: 'success',
          summary: 'Listo',
          detail: 'Pedido actualizado'
        });
      } else {
        const result = await crearPedido(pedidoData, user);
        toast.current?.show({
          severity: fueEncolado(result) ? 'info' : 'success',
          summary: fueEncolado(result) ? 'Sin conexión' : 'Listo',
          detail: mensajeGuardado(
            result,
            'Pedido creado',
            'El pedido quedó en el teléfono y se envía cuando haya red'
          )
        });
      }

      recordarCliente(cliente);
      borrarBorradorPedido();
      onSuccess?.();
      onHide();
      limpiarFormulario();
    } catch (error) {
      console.error('Error guardando pedido:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar el pedido'
      });
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos
    .filter((prod) => {
      const q = busquedaProducto.trim().toLowerCase();
      if (!q) return false;
      return (
        prod.nombre?.toLowerCase().includes(q) ||
        String(prod.codigo || '').toLowerCase().includes(q)
      );
    })
    .slice(0, 20);

  const renderPaso = () => {
    if (activeStep === 0) {
      return (
        <div className="p-3">
          <h3 className="text-xl font-bold mb-2">Cliente</h3>
          <p className="text-sm mb-3" style={{ color: 'var(--dcg-text-muted)' }}>
            Tocá un cliente para seguir
          </p>
          <ClientePickerMovil
            clientes={clientes}
            value={typeof cliente === 'object' ? cliente : null}
            onChange={(elegido) => {
              setCliente(elegido);
              if (elegido) setActiveStep(1);
            }}
            disabled={loading}
          />
        </div>
      );
    }

    return (
      <div className="p-3 pedido-paso-productos">
        <button
          type="button"
          className="pedido-cliente-chip"
          onClick={() => setActiveStep(0)}
        >
          <span>{nombreCliente(cliente)}</span>
          <span>cambiar</span>
        </button>

        <div className="field mb-2">
          <InputText
            id="producto-movil"
            value={busquedaProducto}
            onChange={(e) => setBusquedaProducto(e.target.value)}
            placeholder={loadingProductos ? 'Cargando productos...' : 'Buscar producto o código'}
            className="w-full pedido-busqueda"
            disabled={loadingProductos}
          />
        </div>

        {productosFiltrados.map((prod) => (
          <button
            key={prod.id}
            type="button"
            className={`producto-picker-movil__item ${productoSeleccionado?.id === prod.id ? 'is-active' : ''}`}
            onClick={() => setProductoSeleccionado(prod)}
          >
            <span>{prod.nombre}</span>
            <span className="cliente-picker-movil__id">
              {formatearMoneda(prod.precio || 0)} · {(prod.stock || 0) > 0 ? 'hay stock' : 'sin stock'}
            </span>
          </button>
        ))}

        {productoSeleccionado && (
          <div className="pedido-agregar">
            <p className="pedido-agregar__nombre">{productoSeleccionado.nombre}</p>
            <div className="pedido-agregar__fila">
              <InputNumber
                id="cantidad-movil"
                value={cantidad}
                onValueChange={(e) => setCantidad(e.value || 1)}
                min={1}
                showButtons
                buttonLayout="horizontal"
                decrementButtonClassName="p-button-outlined"
                incrementButtonClassName="p-button-outlined"
                inputMode="numeric"
              />
              <InputNumber
                id="descuento-movil"
                value={descuentoProducto}
                onValueChange={(e) => setDescuentoProducto(validarDescuento(e.value || 0))}
                min={0}
                max={100}
                suffix="%"
                placeholder="Desc."
              />
            </div>
            <Button
              label="Agregar"
              icon="pi pi-plus"
              className="w-full p-button-success"
              onClick={agregarProducto}
            />
          </div>
        )}

        {productosAgregados.map((prod, index) => (
          <div key={`${prod.id}-${index}`} className="pedido-linea">
            <div className="pedido-linea__info">
              <strong>{prod.nombre}</strong>
              <span>
                {prod.cantidad} × {formatearMoneda(prod.precioUnitario)}
                {prod.descuento > 0 ? ` · ${prod.descuento}%` : ''}
              </span>
            </div>
            <span className="pedido-linea__total">{formatearMoneda(prod.total)}</span>
            <Button
              icon="pi pi-trash"
              className="p-button-rounded p-button-danger p-button-text pedido-linea__borrar"
              onClick={() => eliminarProducto(index)}
              aria-label="Quitar producto"
            />
          </div>
        ))}

        <div className="pedido-total">
          <span>Total</span>
          <span>{formatearMoneda(total)}</span>
        </div>

        <div className="field mb-3">
          <label className="block mb-2 font-semibold">Condición de pago</label>
          <div className="cobro-formas">
            {CONDICIONES_PAGO.map((opcion) => (
              <button
                key={opcion.value}
                type="button"
                className={`cobro-forma ${condicionPago === opcion.value ? 'is-active' : ''}`}
                onClick={() => setCondicionPago(opcion.value)}
              >
                {opcion.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field mb-2">
          <label htmlFor="observaciones-movil" className="block mb-2 font-semibold">Observaciones</label>
          <InputTextarea
            id="observaciones-movil"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            className="w-full"
          />
        </div>
      </div>
    );
  };

  const footer = (
    <div className="pedido-form-footer">
      {activeStep > 0 && (
        <Button
          label="Atrás"
          icon="pi pi-arrow-left"
          className="p-button-text"
          onClick={pasoAnterior}
          disabled={loading}
        />
      )}
      {activeStep < 1 ? (
        <Button
          label="Siguiente"
          icon="pi pi-arrow-right"
          iconPos="right"
          onClick={siguientePaso}
          disabled={loading}
        />
      ) : (
        <Button
          label={pedido ? 'Actualizar' : 'Guardar'}
          icon="pi pi-check"
          onClick={handleSubmit}
          loading={loading}
          className="pedido-form-footer__guardar"
        />
      )}
    </div>
  );

  return (
    <>
      <Toast ref={toast} />
      <ConfirmDialog baseZIndex={4000} />
      <Dialog
        visible={visible}
        onHide={handleCerrar}
        header={pedido ? 'Editar pedido' : 'Nuevo pedido'}
        footer={footer}
        style={{ width: '100vw', maxWidth: '100%', height: '100vh', maxHeight: '100%' }}
        modal
        closable={!loading}
        dismissableMask={false}
        className="p-fluid pedido-form-movil"
        contentStyle={{ padding: '0' }}
      >
        <div className="form-movil-scroll">
          {renderPaso()}
        </div>
      </Dialog>
    </>
  );
};

export default PedidoFormMovil;
