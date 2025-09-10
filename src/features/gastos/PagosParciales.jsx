import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  Button, 
  InputNumber, 
  Calendar, 
  Dropdown, 
  InputText, 
  DataTable, 
  Column, 
  Tag, 
  Toast, 
  ProgressSpinner,
  Divider,
  Card
} from 'primereact';
import { 
  calcularSaldoPendiente, 
  obtenerResumenPagos, 
  formatearResumenPagos,
  permitePagosParciales
} from './pagosUtils';
import { 
  agregarPagoParcial as agregarPagoParcialService,
  editarPagoParcial as editarPagoParcialService,
  eliminarPagoParcial as eliminarPagoParcialService
} from './gastosService';
import { tiposPago, getSubcategoriasByTipoPago } from './constants';
import { formatMonto, formatFecha } from './utils';

const PagosParciales = ({ visible, onHide, gasto, onActualizar, user }) => {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [pagoEditando, setPagoEditando] = useState(null);
  const [subcategoriasTipoPago, setSubcategoriasTipoPago] = useState([]);
  
  const [formData, setFormData] = useState({
    monto: 0,
    fecha: new Date(),
    tipoPago: 'efectivo',
    subcategoriaTipoPago: '',
    nota: ''
  });

  const resumen = obtenerResumenPagos(gasto);
  const saldoPendiente = calcularSaldoPendiente(gasto);
  const permitePagos = permitePagosParciales(gasto);

  useEffect(() => {
    if (gasto) {
      setFormData({
        monto: 0,
        fecha: new Date(),
        tipoPago: 'efectivo',
        subcategoriaTipoPago: '',
        nota: ''
      });
    }
  }, [gasto]);

  // Actualizar subcategorías de tipo de pago
  useEffect(() => {
    const subcategorias = getSubcategoriasByTipoPago(formData.tipoPago);
    setSubcategoriasTipoPago(subcategorias);
    if (subcategorias.length === 0) {
      setFormData(prev => ({ ...prev, subcategoriaTipoPago: '' }));
    }
  }, [formData.tipoPago]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.monto <= 0) {
      setToast({ severity: 'error', summary: 'Error', detail: 'El monto debe ser mayor a 0' });
      return;
    }
    
    if (formData.monto > saldoPendiente) {
      setToast({ severity: 'error', summary: 'Error', detail: 'El monto no puede ser mayor al saldo pendiente' });
      return;
    }

    setLoading(true);
    try {
      const pagoData = {
        monto: formData.monto,
        fecha: formData.fecha.toISOString(),
        tipoPago: formData.tipoPago,
        subcategoriaTipoPago: formData.subcategoriaTipoPago,
        nota: formData.nota
      };

      if (pagoEditando) {
        await editarPagoParcialService(gasto.id, pagoEditando.id, pagoData, user);
      } else {
        await agregarPagoParcialService(gasto.id, pagoData, user);
      }

      // Recargar el gasto actualizado
      await onActualizar();
      
      setToast({ 
        severity: 'success', 
        summary: 'Éxito', 
        detail: pagoEditando ? 'Pago actualizado correctamente' : 'Pago agregado correctamente' 
      });
      
      setMostrarFormulario(false);
      setPagoEditando(null);
      setFormData({
        monto: 0,
        fecha: new Date(),
        tipoPago: 'efectivo',
        subcategoriaTipoPago: '',
        nota: ''
      });
    } catch (error) {
      console.error('Error al guardar pago:', error);
      setToast({ severity: 'error', summary: 'Error', detail: 'Error al guardar el pago' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditarPago = (pago) => {
    setPagoEditando(pago);
    setFormData({
      monto: pago.monto,
      fecha: new Date(pago.fecha),
      tipoPago: pago.tipoPago,
      subcategoriaTipoPago: pago.subcategoriaTipoPago || '',
      nota: pago.nota || ''
    });
    setMostrarFormulario(true);
  };

  const handleEliminarPago = async (pagoId) => {
    try {
      await eliminarPagoParcialService(gasto.id, pagoId, user);
      await onActualizar();
      setToast({ severity: 'success', summary: 'Éxito', detail: 'Pago eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar pago:', error);
      setToast({ severity: 'error', summary: 'Error', detail: 'Error al eliminar el pago' });
    }
  };

  const montoTemplate = (rowData) => {
    return formatMonto(rowData.monto);
  };

  const fechaTemplate = (rowData) => {
    return formatFecha(rowData.fecha);
  };

  const tipoPagoTemplate = (rowData) => {
    const tipo = tiposPago.find(t => t.id === rowData.tipoPago);
    return tipo ? tipo.nombre : rowData.tipoPago;
  };

  const accionesTemplate = (rowData) => {
    return (
      <div className="flex gap-1">
        <Button
          icon="pi pi-pencil"
          className="p-button-text p-button-sm"
          onClick={() => handleEditarPago(rowData)}
          tooltip="Editar pago"
        />
        <Button
          icon="pi pi-trash"
          className="p-button-text p-button-sm p-button-danger"
          onClick={() => handleEliminarPago(rowData.id)}
          tooltip="Eliminar pago"
        />
      </div>
    );
  };

  if (!gasto || !permitePagos) {
    return null;
  }

  return (
    <>
      <Toast ref={setToast} />
      
      <Dialog
        header={`Pagos Parciales - ${gasto.titulo}`}
        visible={visible}
        onHide={onHide}
        style={{ width: '90vw', maxWidth: '1000px' }}
        modal
      >
        <div className="grid">
          {/* Resumen del gasto */}
          <div className="col-12">
            <Card>
              <div className="grid">
                <div className="col-12 md:col-3">
                  <div className="text-center">
                    <h5 className="mt-0 mb-1">Monto Total</h5>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatMonto(resumen.montoTotal)}
                    </p>
                  </div>
                </div>
                <div className="col-12 md:col-3">
                  <div className="text-center">
                    <h5 className="mt-0 mb-1">Total Pagado</h5>
                    <p className="text-2xl font-bold text-green-600">
                      {formatMonto(resumen.totalPagado)}
                    </p>
                  </div>
                </div>
                <div className="col-12 md:col-3">
                  <div className="text-center">
                    <h5 className="mt-0 mb-1">Saldo Pendiente</h5>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatMonto(resumen.saldoPendiente)}
                    </p>
                  </div>
                </div>
                <div className="col-12 md:col-3">
                  <div className="text-center">
                    <h5 className="mt-0 mb-1">Progreso</h5>
                    <p className="text-2xl font-bold text-purple-600">
                      {resumen.porcentajePagado}%
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Barra de progreso */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(resumen.porcentajePagado, 100)}%` }}
                  ></div>
                </div>
              </div>
            </Card>
          </div>

          {/* Botón para agregar pago */}
          <div className="col-12">
            <div className="flex justify-content-between align-items-center">
              <h4 className="mt-0 mb-0">Pagos Realizados</h4>
              <Button
                label="Agregar Pago"
                icon="pi pi-plus"
                onClick={() => setMostrarFormulario(true)}
                className="p-button-success"
                disabled={saldoPendiente <= 0}
              />
            </div>
            <Divider />
          </div>

          {/* Lista de pagos */}
          <div className="col-12">
            <DataTable
              value={gasto.pagosParciales || []}
              emptyMessage="No hay pagos registrados"
              paginator
              rows={5}
              responsiveLayout="scroll"
            >
              <Column field="fecha" header="Fecha" body={fechaTemplate} />
              <Column field="monto" header="Monto" body={montoTemplate} />
              <Column field="tipoPago" header="Tipo de Pago" body={tipoPagoTemplate} />
              <Column field="nota" header="Nota" />
              <Column field="usuario" header="Usuario" body={(rowData) => rowData.usuario?.email || 'N/A'} />
              <Column header="Acciones" body={accionesTemplate} style={{ width: '120px' }} />
            </DataTable>
          </div>

          {/* Formulario de pago */}
          {mostrarFormulario && (
            <div className="col-12">
              <Card>
                <h5 className="mt-0 mb-3">
                  {pagoEditando ? 'Editar Pago' : 'Nuevo Pago'}
                </h5>
                
                <form onSubmit={handleSubmit}>
                  <div className="grid">
                    <div className="col-12 md:col-6">
                      <label htmlFor="monto" className="block mb-2">
                        Monto <span className="text-red-500">*</span>
                      </label>
                      <InputNumber
                        id="monto"
                        value={formData.monto}
                        onValueChange={(e) => setFormData(prev => ({ ...prev, monto: e.value }))}
                        mode="currency"
                        currency="ARS"
                        locale="es-AR"
                        min={0}
                        max={saldoPendiente}
                        className="w-full"
                      />
                      <small className="text-gray-600">
                        Máximo: {formatMonto(saldoPendiente)}
                      </small>
                    </div>

                    <div className="col-12 md:col-6">
                      <label htmlFor="fecha" className="block mb-2">
                        Fecha <span className="text-red-500">*</span>
                      </label>
                      <Calendar
                        id="fecha"
                        value={formData.fecha}
                        onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.value }))}
                        dateFormat="dd/mm/yy"
                        showIcon
                        className="w-full"
                      />
                    </div>

                    <div className="col-12 md:col-6">
                      <label htmlFor="tipoPago" className="block mb-2">
                        Tipo de Pago
                      </label>
                      <Dropdown
                        id="tipoPago"
                        value={formData.tipoPago}
                        onChange={(e) => setFormData(prev => ({ ...prev, tipoPago: e.value }))}
                        options={tiposPago}
                        optionLabel="nombre"
                        optionValue="id"
                        className="w-full"
                      />
                    </div>

                    {subcategoriasTipoPago.length > 0 && (
                      <div className="col-12 md:col-6">
                        <label htmlFor="subcategoriaTipoPago" className="block mb-2">
                          Subcategoría de Pago
                        </label>
                        <Dropdown
                          id="subcategoriaTipoPago"
                          value={formData.subcategoriaTipoPago}
                          onChange={(e) => setFormData(prev => ({ ...prev, subcategoriaTipoPago: e.value }))}
                          options={subcategoriasTipoPago}
                          optionLabel="nombre"
                          optionValue="id"
                          className="w-full"
                        />
                      </div>
                    )}

                    <div className="col-12">
                      <label htmlFor="nota" className="block mb-2">
                        Nota
                      </label>
                      <InputText
                        id="nota"
                        value={formData.nota}
                        onChange={(e) => setFormData(prev => ({ ...prev, nota: e.target.value }))}
                        placeholder="Nota sobre el pago..."
                        className="w-full"
                      />
                    </div>

                    <div className="col-12 flex justify-content-end gap-2">
                      <Button
                        type="button"
                        label="Cancelar"
                        icon="pi pi-times"
                        className="p-button-text"
                        onClick={() => {
                          setMostrarFormulario(false);
                          setPagoEditando(null);
                        }}
                      />
                      <Button
                        type="submit"
                        label={pagoEditando ? 'Actualizar' : 'Agregar'}
                        icon="pi pi-check"
                        loading={loading}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
};

export default PagosParciales;
