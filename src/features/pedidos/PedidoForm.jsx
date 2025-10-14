import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { AutoComplete } from 'primereact/autocomplete';
import { crearPedido, actualizarPedido, getProductos, getClientesAsignados } from './pedidosService';
import { CONDICIONES_PAGO } from './constants';
import { formatearMoneda, calcularSubtotal, calcularTotal, calcularTotalProducto, validarProducto } from './utils';

const PedidoForm = ({ visible, onHide, pedido, onSuccess, user }) => {
  const toast = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  
  // Datos del formulario
  const [cliente, setCliente] = useState(null);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [fechaPedido, setFechaPedido] = useState(new Date());
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
  
  // Sin totales adicionales (IVA ya incluido en precios, descuento por producto)

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
      
      // 🆕 Log para debugging - ver estructura del primer producto
      if (productosData && productosData.length > 0) {
        console.log('📦 Primer producto cargado:', productosData[0]);
        console.log('💰 Precio del primer producto:', productosData[0].precio);
      }
      
      setProductos(productosData);
      
      if (forzarActualizacion) {
        toast.current?.show({
          severity: 'success',
          summary: 'Productos actualizados',
          detail: `${productosData.length} productos cargados desde Alegra`
        });
      }
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
    if (visible) {
      cargarProductos(false);
    }
  }, [visible]);

  // Cargar datos del pedido si es edición
  useEffect(() => {
    if (pedido) {
      setCliente(pedido.cliente);
      setFechaPedido(pedido.fechaPedido?.toDate ? pedido.fechaPedido.toDate() : new Date(pedido.fechaPedido));
      setCondicionPago(pedido.condicionPago || 'contado');
      setObservaciones(pedido.observaciones || '');
      setProductosAgregados(pedido.productos || []);
    } else {
      limpiarFormulario();
    }
  }, [pedido, visible]);

  const limpiarFormulario = () => {
    setCliente(null);
    setFechaPedido(new Date());
    setCondicionPago('contado');
    setObservaciones('');
    setProductosAgregados([]);
    setProductoSeleccionado(null);
    setCantidad(1);
    setPrecioUnitario(0);
    setDescuentoProducto(0);
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
      console.log('🎯 Producto seleccionado:', productoSeleccionado);
      console.log('💰 Precio del producto seleccionado:', productoSeleccionado.precio);
      console.log('💰 Tipo de precio:', typeof productoSeleccionado.precio);
      setPrecioUnitario(productoSeleccionado.precio || 0);
    }
  }, [productoSeleccionado]);

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

    const validacion = validarProducto(productoSeleccionado, cantidad);
    
    // Si hay errores críticos, no permitir agregar
    if (!validacion.valido) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error de validación',
        detail: validacion.errores.join(', ')
      });
      return;
    }

    // Mostrar advertencias si las hay (pero permitir continuar)
    if (validacion.advertencias && validacion.advertencias.length > 0) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Advertencia',
        detail: validacion.advertencias.join(', '),
        life: 5000
      });
    }

    const productoAgregado = {
      id: productoSeleccionado.id,
      nombre: productoSeleccionado.nombre,
      codigo: productoSeleccionado.codigo,
      cantidad,
      precioUnitario,
      descuento: descuentoProducto,
      total: calcularTotalProducto(cantidad, precioUnitario, descuentoProducto),
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
      detail: `${productoAgregado.nombre} agregado al pedido`
    });
  };

  // Eliminar producto de la lista
  const eliminarProducto = (index) => {
    const nuevosProductos = productosAgregados.filter((_, i) => i !== index);
    setProductosAgregados(nuevosProductos);
  };

  // Calcular totales (el total es igual al subtotal porque IVA ya está incluido)
  const total = calcularTotal(productosAgregados);

  // Guardar pedido
  const handleSubmit = async () => {
    // Validaciones
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
        observaciones
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

  const footer = (
    <div className="flex justify-content-end gap-2">
      <Button
        label="Cancelar"
        icon="pi pi-times"
        className="p-button-text"
        onClick={() => {
          onHide();
          limpiarFormulario();
        }}
        disabled={loading}
      />
      <Button
        label={pedido ? 'Actualizar' : 'Crear'}
        icon="pi pi-check"
        onClick={handleSubmit}
        loading={loading}
      />
    </div>
  );

  // Template para columna de acciones en tabla de productos
  const accionesTemplate = (rowData, { rowIndex }) => {
    return (
      <Button
        icon="pi pi-trash"
        className="p-button-rounded p-button-danger p-button-text"
        onClick={() => eliminarProducto(rowIndex)}
        tooltip="Eliminar"
      />
    );
  };

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        visible={visible}
        onHide={onHide}
        header={pedido ? 'Editar Pedido' : 'Nuevo Pedido'}
        footer={footer}
        style={{ width: '90vw', maxWidth: '1000px' }}
        breakpoints={{ '960px': '95vw' }}
        modal
        className="p-fluid"
      >
        <div className="grid">
          {/* Información del cliente */}
          <div className="col-12 md:col-6">
            <div className="field">
              <label htmlFor="cliente">Cliente *</label>
              <AutoComplete
                id="cliente"
                value={cliente}
                suggestions={clientesFiltrados}
                completeMethod={buscarClientes}
                field="name"
                onChange={(e) => setCliente(e.value)}
                placeholder="Buscar cliente..."
                dropdown
              />
            </div>
          </div>

          <div className="col-12 md:col-6">
            <div className="field">
              <label htmlFor="fechaPedido">Fecha del Pedido *</label>
              <Calendar
                id="fechaPedido"
                value={fechaPedido}
                onChange={(e) => setFechaPedido(e.value)}
                dateFormat="dd/mm/yy"
                showIcon
              />
            </div>
          </div>

          <div className="col-12 md:col-6">
            <div className="field">
              <label htmlFor="condicionPago">Condición de Pago *</label>
              <Dropdown
                id="condicionPago"
                value={condicionPago}
                options={CONDICIONES_PAGO}
                onChange={(e) => setCondicionPago(e.value)}
                placeholder="Seleccionar condición"
              />
            </div>
          </div>

          {/* Sección de productos */}
          <div className="col-12">
            <div className="surface-100 p-3 border-round">
              <div className="flex justify-content-between align-items-center mb-3">
                <h4 className="m-0">Agregar Productos</h4>
                {user?.role === 'admin' && (
                  <Button
                    icon="pi pi-refresh"
                    label="Actualizar desde Alegra"
                    className="p-button-sm p-button-outlined"
                    onClick={() => cargarProductos(true)}
                    loading={loadingProductos}
                    tooltip="Obtener productos actualizados directamente desde Alegra"
                  />
                )}
              </div>
              
              {loadingProductos ? (
                <div className="flex justify-content-center p-4">
                  <ProgressSpinner style={{ width: '50px', height: '50px' }} />
                </div>
              ) : (
                <div className="grid">
                  <div className="col-12 md:col-5">
                    <div className="field">
                      <label htmlFor="producto">Producto</label>
                      <AutoComplete
                        id="producto"
                        value={productoSeleccionado}
                        suggestions={productosFiltrados}
                        completeMethod={buscarProductos}
                        field="nombre"
                        onChange={(e) => {
                          console.log('🔄 Cambio en AutoComplete:', e.value);
                          console.log('🔄 Tipo de valor:', typeof e.value);
                          setProductoSeleccionado(e.value);
                        }}
                        placeholder="Buscar producto..."
                        dropdown
                        forceSelection
                      />
                    </div>
                  </div>

                  <div className="col-12 md:col-2">
                    <div className="field">
                      <label htmlFor="cantidad">Cantidad</label>
                      <InputNumber
                        id="cantidad"
                        value={cantidad}
                        onValueChange={(e) => setCantidad(e.value)}
                        min={1}
                        showButtons
                      />
                    </div>
                  </div>

                  <div className="col-12 md:col-2">
                    <div className="field">
                      <label htmlFor="precio">Precio Unitario</label>
                      <InputNumber
                        id="precio"
                        value={precioUnitario}
                        onValueChange={(e) => setPrecioUnitario(e.value)}
                        mode="currency"
                        currency="ARS"
                        locale="es-AR"
                      />
                    </div>
                  </div>

                  <div className="col-12 md:col-2">
                    <div className="field">
                      <label htmlFor="descuentoProducto">Descuento (%)</label>
                      <InputNumber
                        id="descuentoProducto"
                        value={descuentoProducto}
                        onValueChange={(e) => setDescuentoProducto(e.value)}
                        min={0}
                        max={100}
                        suffix="%"
                      />
                    </div>
                  </div>

                  <div className="col-12 md:col-1">
                    <div className="field">
                      <label>&nbsp;</label>
                      <Button
                        label="Agregar"
                        icon="pi pi-plus"
                        onClick={agregarProducto}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabla de productos agregados */}
          {productosAgregados.length > 0 && (
            <div className="col-12">
              <DataTable value={productosAgregados} responsiveLayout="scroll">
                <Column field="nombre" header="Producto" />
                <Column field="codigo" header="Código" />
                <Column field="cantidad" header="Cantidad" />
                <Column 
                  field="precioUnitario" 
                  header="Precio Unit." 
                  body={(rowData) => formatearMoneda(rowData.precioUnitario)}
                />
                <Column 
                  field="descuento" 
                  header="Desc. %" 
                  body={(rowData) => `${rowData.descuento || 0}%`}
                />
                <Column 
                  field="total" 
                  header="Total" 
                  body={(rowData) => formatearMoneda(rowData.total)}
                />
                <Column body={accionesTemplate} style={{ width: '80px' }} />
              </DataTable>

              {/* Total */}
              <div className="mt-3 surface-100 p-3 border-round">
                <div className="flex justify-content-end">
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">
                      Total del Pedido
                    </div>
                    <div className="text-3xl font-bold text-primary">
                      {formatearMoneda(total)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div className="col-12">
            <div className="field">
              <label htmlFor="observaciones">Observaciones</label>
              <InputTextarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                placeholder="Observaciones adicionales del pedido..."
              />
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default PedidoForm;

