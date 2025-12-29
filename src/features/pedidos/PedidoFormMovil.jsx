import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { AutoComplete } from 'primereact/autocomplete';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Steps } from 'primereact/steps';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';
import { crearPedido, actualizarPedido, getProductos, getClientesAsignados } from './pedidosService';
import { CONDICIONES_PAGO } from './constants';
import { formatearMoneda, calcularTotal, calcularTotalProducto } from './utils';

const PedidoFormMovil = ({ visible, onHide, pedido, onSuccess, user }) => {
  const toast = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  
  // Datos del formulario
  const [cliente, setCliente] = useState(null);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [fechaPedido] = useState(new Date()); // Fecha actual, no editable en móvil
  const [condicionPago, setCondicionPago] = useState('contado');
  const [observaciones, setObservaciones] = useState('');
  
  // Productos
  const [productos, setProductos] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [descuentoProducto, setDescuentoProducto] = useState(0);
  const [productosAgregados, setProductosAgregados] = useState([]);
  
  // Definir pasos
  const steps = [
    { label: 'Cliente' },
    { label: 'Productos' },
    { label: 'Resumen' },
    { label: 'Confirmar' }
  ];

  // Cargar clientes asignados al vendedor
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
          detail: 'Error al cargar clientes'
        });
      }
    };
    
    if (visible) {
      cargarClientes();
    }
  }, [visible, user]);

  // Cargar productos
  const cargarProductos = async (forzarActualizacion = false) => {
    setLoadingProductos(true);
    try {
      const productosData = await getProductos(forzarActualizacion);
      setProductos(productosData);
    } catch (error) {
      console.error('Error cargando productos:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar productos'
      });
    } finally {
      setLoadingProductos(false);
    }
  };

  useEffect(() => {
    if (visible && activeStep === 1) {
      cargarProductos(false);
    }
  }, [visible, activeStep]);

  // Cargar datos del pedido si es edición
  useEffect(() => {
    if (pedido) {
      setCliente(pedido.cliente);
      setCondicionPago(pedido.condicionPago || 'contado');
      setObservaciones(pedido.observaciones || '');
      setProductosAgregados(pedido.productos || []);
    } else {
      limpiarFormulario();
    }
  }, [pedido, visible]);

  const limpiarFormulario = () => {
    setCliente(null);
    setCondicionPago('contado');
    setObservaciones('');
    setProductosAgregados([]);
    setProductoSeleccionado(null);
    setCantidad(1);
    setPrecioUnitario(0);
    setDescuentoProducto(0);
    setActiveStep(0);
  };

  // Autocompletado de clientes
  const buscarClientes = (event) => {
    const query = event.query.toLowerCase();
    const filtered = clientes.filter(c => 
      c.name?.toLowerCase().includes(query) || 
      c.identification?.includes(query)
    );
    setClientesFiltrados(filtered);
  };

  // Autocompletado de productos
  const buscarProductos = (event) => {
    const query = event.query.toLowerCase();
    const filtered = productos.filter(p => 
      p.nombre?.toLowerCase().includes(query) || 
      p.codigo?.toLowerCase().includes(query)
    );
    setProductosFiltrados(filtered);
  };

  // Cuando se selecciona un producto, cargar su precio
  useEffect(() => {
    if (productoSeleccionado) {
      setPrecioUnitario(productoSeleccionado.precio || 0);
    }
  }, [productoSeleccionado]);

  // Validar descuento (0-100)
  const validarDescuento = (valor) => {
    if (valor === null || valor === undefined || valor === '') return 0;
    const num = Number(valor);
    if (isNaN(num)) return 0;
    if (num < 0) return 0;
    if (num > 100) return 100;
    return num;
  };

  // Agregar producto a la lista
  const agregarProducto = () => {
    if (!productoSeleccionado) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Debe seleccionar un producto'
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

    const productoAgregado = {
      id: productoSeleccionado.id,
      nombre: productoSeleccionado.nombre,
      codigo: productoSeleccionado.codigo,
      cantidad,
      precioUnitario,
      descuento: descuentoValidado,
      total: calcularTotalProducto(cantidad, precioUnitario, descuentoValidado),
      observaciones: ''
    };

    setProductosAgregados([...productosAgregados, productoAgregado]);
    
    // Limpiar selección
    setProductoSeleccionado(null);
    setCantidad(1);
    setPrecioUnitario(0);
    setDescuentoProducto(0);

    toast.current?.show({
      severity: 'success',
      summary: 'Producto agregado',
      detail: `${productoAgregado.nombre} agregado al pedido`,
      life: 2000
    });
  };

  // Eliminar producto de la lista
  const eliminarProducto = (index) => {
    const nuevosProductos = productosAgregados.filter((_, i) => i !== index);
    setProductosAgregados(nuevosProductos);
    toast.current?.show({
      severity: 'info',
      summary: 'Producto eliminado',
      detail: 'El producto fue eliminado del pedido',
      life: 2000
    });
  };

  // Calcular total
  const total = calcularTotal(productosAgregados);

  // Navegación entre pasos
  const siguientePaso = () => {
    // Validaciones por paso
    if (activeStep === 0 && !cliente) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Debe seleccionar un cliente'
      });
      return;
    }

    if (activeStep === 1 && productosAgregados.length === 0) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Debe agregar al menos un producto'
      });
      return;
    }

    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const pasoAnterior = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  // Guardar pedido
  const handleSubmit = async () => {
    if (!cliente) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Debe seleccionar un cliente'
      });
      return;
    }

    if (productosAgregados.length === 0) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Debe agregar al menos un producto'
      });
      return;
    }

    setLoading(true);
    try {
      const pedidoData = {
        cliente: cliente.name || cliente,
        clienteId: cliente.id || null,
        fechaPedido,
        condicionPago,
        productos: productosAgregados,
        total,
        observaciones,
        origen: 'mobile' // 🆕 Marcar origen móvil
      };

      if (pedido) {
        await actualizarPedido(pedido.id, pedidoData, user);
        toast.current?.show({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Pedido actualizado correctamente'
        });
      } else {
        await crearPedido(pedidoData, user);
        toast.current?.show({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Pedido creado correctamente'
        });
      }

      onSuccess?.();
      onHide();
      limpiarFormulario();
    } catch (error) {
      console.error('Error guardando pedido:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al guardar el pedido'
      });
    } finally {
      setLoading(false);
    }
  };

  // Renderizar contenido según paso activo
  const renderPaso = () => {
    switch (activeStep) {
      case 0: // Paso 1: Cliente
        return (
          <div className="p-3">
            <h3 className="text-xl font-bold mb-4">Seleccionar Cliente</h3>
            <div className="field mb-4">
              <label htmlFor="cliente-movil" className="block mb-2 font-semibold">
                Cliente *
              </label>
              <AutoComplete
                id="cliente-movil"
                value={cliente}
                suggestions={clientesFiltrados}
                completeMethod={buscarClientes}
                field="name"
                onChange={(e) => setCliente(e.value)}
                placeholder="Buscar cliente..."
                className="w-full"
                inputStyle={{ fontSize: '16px', padding: '12px' }}
                panelStyle={{ fontSize: '16px' }}
              />
            </div>
            {cliente && (
              <Card className="mt-3">
                <div className="p-2">
                  <p className="font-semibold mb-1">{cliente.name || cliente}</p>
                  {cliente.identification && (
                    <p className="text-sm text-gray-600">ID: {cliente.identification}</p>
                  )}
                </div>
              </Card>
            )}
          </div>
        );

      case 1: // Paso 2: Agregar productos
        return (
          <div className="p-3">
            <h3 className="text-xl font-bold mb-4">Agregar Productos</h3>
            
            {/* Buscador de producto */}
            <div className="field mb-4">
              <label htmlFor="producto-movil" className="block mb-2 font-semibold">
                Buscar Producto
              </label>
              <AutoComplete
                id="producto-movil"
                value={productoSeleccionado}
                suggestions={productosFiltrados}
                completeMethod={buscarProductos}
                field="nombre"
                onChange={(e) => setProductoSeleccionado(e.value)}
                placeholder="Buscar producto..."
                className="w-full"
                inputStyle={{ fontSize: '16px', padding: '12px' }}
                panelStyle={{ fontSize: '16px' }}
                disabled={loadingProductos}
              />
            </div>

            {productoSeleccionado && (
              <Card className="mb-4">
                <div className="p-3">
                  <p className="font-semibold mb-2">{productoSeleccionado.nombre}</p>
                  <p className="text-sm text-gray-600 mb-3">
                    Precio: {formatearMoneda(precioUnitario)}
                  </p>

                  <div className="field mb-3">
                    <label htmlFor="cantidad-movil" className="block mb-2">
                      Cantidad *
                    </label>
                    <InputNumber
                      id="cantidad-movil"
                      value={cantidad}
                      onValueChange={(e) => setCantidad(e.value || 1)}
                      min={1}
                      className="w-full"
                      inputStyle={{ fontSize: '16px', padding: '12px' }}
                    />
                  </div>

                  <div className="field mb-3">
                    <label htmlFor="descuento-movil" className="block mb-2">
                      % Descuento (0-100)
                    </label>
                    <InputNumber
                      id="descuento-movil"
                      value={descuentoProducto}
                      onValueChange={(e) => {
                        const valor = e.value || 0;
                        setDescuentoProducto(validarDescuento(valor));
                      }}
                      min={0}
                      max={100}
                      suffix="%"
                      className="w-full"
                      inputStyle={{ fontSize: '16px', padding: '12px' }}
                    />
                  </div>

                  <Button
                    label="Agregar Producto"
                    icon="pi pi-plus"
                    className="w-full p-button-success"
                    onClick={agregarProducto}
                    style={{ padding: '12px', fontSize: '16px' }}
                  />
                </div>
              </Card>
            )}

            {/* Lista resumida de productos agregados */}
            {productosAgregados.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Productos Agregados ({productosAgregados.length})</h4>
                <div className="flex flex-column gap-2">
                  {productosAgregados.map((prod, index) => (
                    <Card key={index} className="p-2">
                      <div className="flex justify-content-between align-items-center">
                        <div className="flex-1">
                          <p className="font-semibold mb-1">{prod.nombre}</p>
                          <p className="text-sm text-gray-600">
                            {prod.cantidad} x {formatearMoneda(prod.precioUnitario)}
                            {prod.descuento > 0 && ` - ${prod.descuento}%`}
                          </p>
                          <p className="text-sm font-semibold text-primary">
                            {formatearMoneda(prod.total)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 2: // Paso 3: Resumen
        return (
          <div className="p-3">
            <h3 className="text-xl font-bold mb-4">Resumen del Pedido</h3>
            
            {/* Información del cliente */}
            <Card className="mb-3">
              <div className="p-3">
                <h4 className="font-semibold mb-2">Cliente</h4>
                <p>{cliente?.name || cliente}</p>
              </div>
            </Card>

            {/* Lista de productos con opción de eliminar */}
            <div className="mb-3">
              <h4 className="font-semibold mb-2">Productos ({productosAgregados.length})</h4>
              <div className="flex flex-column gap-2">
                {productosAgregados.map((prod, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex justify-content-between align-items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold mb-1">{prod.nombre}</p>
                        <p className="text-sm text-gray-600 mb-1">
                          Cantidad: {prod.cantidad}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          Precio unitario: {formatearMoneda(prod.precioUnitario)}
                        </p>
                        {prod.descuento > 0 && (
                          <p className="text-sm text-gray-600 mb-1">
                            Descuento: {prod.descuento}%
                          </p>
                        )}
                        <p className="text-sm font-semibold text-primary">
                          Subtotal: {formatearMoneda(prod.total)}
                        </p>
                      </div>
                      <Button
                        icon="pi pi-trash"
                        className="p-button-rounded p-button-danger p-button-text"
                        onClick={() => eliminarProducto(index)}
                        tooltip="Eliminar"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Total */}
            <Card className="p-3" style={{ backgroundColor: '#f0f9ff' }}>
              <div className="flex justify-content-between align-items-center">
                <span className="text-xl font-bold">Total:</span>
                <span className="text-xl font-bold text-primary">
                  {formatearMoneda(total)}
                </span>
              </div>
            </Card>
          </div>
        );

      case 3: // Paso 4: Confirmar
        return (
          <div className="p-3">
            <h3 className="text-xl font-bold mb-4">Confirmar Pedido</h3>
            
            {/* Resumen rápido */}
            <Card className="mb-3">
              <div className="p-3">
                <p className="mb-2"><strong>Cliente:</strong> {cliente?.name || cliente}</p>
                <p className="mb-2"><strong>Productos:</strong> {productosAgregados.length}</p>
                <p className="mb-2"><strong>Total:</strong> {formatearMoneda(total)}</p>
              </div>
            </Card>

            {/* Condición de pago */}
            <div className="field mb-4">
              <label htmlFor="condicion-movil" className="block mb-2 font-semibold">
                Condición de Pago
              </label>
              <Dropdown
                id="condicion-movil"
                value={condicionPago}
                options={CONDICIONES_PAGO}
                onChange={(e) => setCondicionPago(e.value)}
                className="w-full"
                style={{ fontSize: '16px', padding: '12px' }}
              />
            </div>

            {/* Observaciones */}
            <div className="field mb-4">
              <label htmlFor="observaciones-movil" className="block mb-2 font-semibold">
                Observaciones (opcional)
              </label>
              <InputTextarea
                id="observaciones-movil"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={4}
                className="w-full"
                placeholder="Agregar notas o comentarios..."
                style={{ fontSize: '16px', padding: '12px' }}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const footer = (
    <div className="flex justify-content-between gap-2 p-3" style={{ borderTop: '1px solid #e5e7eb' }}>
      {activeStep > 0 && (
        <Button
          label="Atrás"
          icon="pi pi-arrow-left"
          className="p-button-text"
          onClick={pasoAnterior}
          disabled={loading}
          style={{ padding: '12px', fontSize: '16px' }}
        />
      )}
      <div className="flex-1"></div>
      {activeStep < steps.length - 1 ? (
        <Button
          label="Siguiente"
          icon="pi pi-arrow-right"
          iconPos="right"
          onClick={siguientePaso}
          disabled={loading}
          style={{ padding: '12px', fontSize: '16px' }}
        />
      ) : (
        <Button
          label={pedido ? 'Actualizar' : 'Guardar Pedido'}
          icon="pi pi-check"
          onClick={handleSubmit}
          loading={loading}
          style={{ padding: '12px', fontSize: '16px' }}
        />
      )}
    </div>
  );

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        visible={visible}
        onHide={onHide}
        header={pedido ? 'Editar Pedido' : 'Nuevo Pedido'}
        footer={footer}
        style={{ width: '100vw', maxWidth: '100%', height: '100vh', maxHeight: '100%' }}
        breakpoints={{ '960px': '95vw' }}
        modal
        className="p-fluid"
        contentStyle={{ padding: '0' }}
      >
        <div style={{ padding: '1rem' }}>
          <Steps model={steps} activeIndex={activeStep} />
        </div>
        <div style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
          {renderPaso()}
        </div>
      </Dialog>
    </>
  );
};

export default PedidoFormMovil;

