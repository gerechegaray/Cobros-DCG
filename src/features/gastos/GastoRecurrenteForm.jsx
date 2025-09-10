import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Card, 
  Button, 
  InputText, 
  InputNumber, 
  Dropdown, 
  Calendar, 
  DataTable, 
  Column, 
  Dialog, 
  Toast,
  ProgressSpinner,
  Divider
} from 'primereact';
import { crearGasto, actualizarGasto } from './gastosService';
import { 
  categoriasGastos, 
  getSubcategoriasByCategoria,
  tiposProyeccion, 
  tiposPago, 
  getSubcategoriasByTipoPago,
  recordatorios 
} from './constants';
import { generarCuotas, formatMonto } from './utils';

const GastoRecurrenteForm = ({ visible, onHide, gasto, onSuccess, user }) => {
  const [loading, setLoading] = useState(false);
  const [cuotasPreview, setCuotasPreview] = useState([]);
  const [toast, setToast] = useState(null);
  const [subcategorias, setSubcategorias] = useState([]);
  const [subcategoriasTipoPago, setSubcategoriasTipoPago] = useState([]);
  const [estadoPago, setEstadoPago] = useState('por_pagar');
  const [mostrarValorRecibido, setMostrarValorRecibido] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm({
    defaultValues: {
      categoria: '',
      subcategoria: '',
      montoTotal: 0,
      valorRecibido: 0,
      fechaInicio: '',
      fechaVencimiento: '',
      fechaPago: '',
      nota: '',
      tipoPago: 'efectivo',
      subcategoriaTipoPago: '',
      frecuencia: 'mensual',
      cuotas: 12,
      recordatorio: 7
    }
  });

  const watchedValues = watch();

  useEffect(() => {
    if (gasto) {
      const esPagado = gasto.estado === 'pagado';
      reset({
        categoria: gasto.categoria || '',
        subcategoria: gasto.subcategoria || '',
        montoTotal: gasto.montoTotal || 0,
        valorRecibido: gasto.valorRecibido || 0,
        fechaInicio: gasto.fechaInicio || '',
        fechaVencimiento: gasto.fechaVencimiento || '',
        fechaPago: gasto.fechaPago || '',
        nota: gasto.nota || '',
        tipoPago: gasto.tipoPago || 'efectivo',
        subcategoriaTipoPago: gasto.subcategoriaTipoPago || '',
        frecuencia: gasto.frecuencia || 'mensual',
        cuotas: gasto.cuotas || 12,
        recordatorio: gasto.recordatorio || 7
      });
      setEstadoPago(esPagado ? 'pagado' : 'por_pagar');
    } else {
      reset();
      setEstadoPago('por_pagar');
    }
  }, [gasto, reset]);

  // Actualizar subcategorías cuando cambie la categoría
  useEffect(() => {
    const categoriaSeleccionada = watchedValues.categoria;
    if (categoriaSeleccionada) {
      const subcategoriasDisponibles = getSubcategoriasByCategoria(categoriaSeleccionada);
      setSubcategorias(subcategoriasDisponibles);
      setValue('subcategoria', '');
    } else {
      setSubcategorias([]);
      setValue('subcategoria', '');
    }
  }, [watchedValues.categoria, setValue]);

  // Actualizar subcategorías de tipo de pago
  useEffect(() => {
    const tipoPagoSeleccionado = watchedValues.tipoPago;
    if (tipoPagoSeleccionado) {
      const subcategoriasDisponibles = getSubcategoriasByTipoPago(tipoPagoSeleccionado);
      setSubcategoriasTipoPago(subcategoriasDisponibles);
      setValue('subcategoriaTipoPago', '');
    } else {
      setSubcategoriasTipoPago([]);
      setValue('subcategoriaTipoPago', '');
    }
  }, [watchedValues.tipoPago, setValue]);

  // Mostrar campo valorRecibido cuando sea Echeqs > Descontados
  useEffect(() => {
    const esEcheqsDescontados = watchedValues.categoria === 'echeqs' && watchedValues.subcategoria === 'descontados';
    setMostrarValorRecibido(esEcheqsDescontados);
    
    if (!esEcheqsDescontados) {
      setValue('valorRecibido', 0);
    }
  }, [watchedValues.categoria, watchedValues.subcategoria, setValue]);

  // Generar vista previa de cuotas
  useEffect(() => {
    if (watchedValues.montoTotal && watchedValues.cuotas && watchedValues.fechaInicio) {
      const categoria = categoriasGastos.find(c => c.id === watchedValues.categoria);
      const subcategorias = getSubcategoriasByCategoria(watchedValues.categoria);
      const subcategoria = subcategorias.find(s => s.id === watchedValues.subcategoria);
      
      let tituloAutomatico = categoria?.nombre || 'Gasto Recurrente';
      if (subcategoria) {
        tituloAutomatico += ` - ${subcategoria.nombre}`;
      }
      
      const gastoPreview = {
        id: 'preview',
        titulo: tituloAutomatico,
        montoTotal: watchedValues.montoTotal,
        cuotas: watchedValues.cuotas,
        frecuencia: watchedValues.frecuencia,
        fechaInicio: watchedValues.fechaInicio
      };
      
      const cuotas = generarCuotas(gastoPreview);
      setCuotasPreview(cuotas);
    } else {
      setCuotasPreview([]);
    }
  }, [watchedValues.montoTotal, watchedValues.cuotas, watchedValues.fechaInicio, watchedValues.categoria, watchedValues.subcategoria]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Generar título automático
      const categoria = categoriasGastos.find(c => c.id === data.categoria);
      const subcategorias = getSubcategoriasByCategoria(data.categoria);
      const subcategoria = subcategorias.find(s => s.id === data.subcategoria);
      
      let tituloAutomatico = categoria?.nombre || 'Gasto Recurrente';
      if (subcategoria) {
        tituloAutomatico += ` - ${subcategoria.nombre}`;
      }
      
      const gastoData = {
        ...data,
        titulo: tituloAutomatico,
        monto: data.montoTotal,
        proyeccion: true,
        tipo: 'recurrente', // Marcar como recordatorio
        estado: estadoPago === 'pagado' ? 'pagado' : 'pendiente',
        cuotasPagadas: 0,
        fechaPago: estadoPago === 'pagado' ? data.fechaPago : null
      };

      if (gasto) {
        await actualizarGasto(gasto.id, gastoData, user);
        setToast({ severity: 'success', summary: 'Éxito', detail: 'Gasto recurrente actualizado correctamente' });
      } else {
        await crearGasto(gastoData, user);
        setToast({ severity: 'success', summary: 'Éxito', detail: 'Gasto recurrente creado correctamente' });
      }
      
      onSuccess();
      onHide();
    } catch (error) {
      console.error('Error guardando gasto recurrente:', error);
      setToast({ severity: 'error', summary: 'Error', detail: 'Error al guardar el gasto recurrente' });
    } finally {
      setLoading(false);
    }
  };

  const handleFrecuenciaChange = (e) => {
    const frecuencia = e.value;
    const tipoProyeccion = tiposProyeccion.find(t => t.id === frecuencia);
    if (tipoProyeccion && tipoProyeccion.cuotas !== 'variable') {
      setValue('cuotas', tipoProyeccion.cuotas);
    }
  };

  const montoTemplate = (rowData) => {
    return formatMonto(rowData.monto);
  };

  const fechaTemplate = (rowData) => {
    return new Date(rowData.fecha).toLocaleDateString('es-AR');
  };

  const estadoTemplate = (rowData) => {
    const estado = rowData.estado === 'pagado' ? 'Pagado' : 'Pendiente';
    const color = rowData.estado === 'pagado' ? '#10b981' : '#f59e0b';
    return <span style={{ color }}>{estado}</span>;
  };

  return (
    <>
      <Toast ref={setToast} />
      <Dialog
        header={gasto ? 'Editar Gasto Recurrente' : 'Nuevo Gasto Recurrente'}
        visible={visible}
        onHide={onHide}
        style={{ width: '90vw', maxWidth: '900px' }}
        modal
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid">
            {/* Información Básica */}
            <div className="col-12">
              <h4>Información del Gasto Recurrente</h4>
              <Divider />
            </div>
            
            <div className="col-12 md:col-6">
              <label htmlFor="categoria" className="block mb-2">
                Categoría <span className="text-red-500">*</span>
              </label>
              <Dropdown
                id="categoria"
                value={watchedValues.categoria}
                onChange={(e) => setValue('categoria', e.value)}
                options={categoriasGastos}
                optionLabel="nombre"
                optionValue="id"
                className={errors.categoria ? 'p-invalid' : ''}
                placeholder="Seleccionar categoría"
              />
              {errors.categoria && <small className="text-red-500">{errors.categoria.message}</small>}
            </div>

            {subcategorias.length > 0 && (
              <div className="col-12 md:col-6">
                <label htmlFor="subcategoria" className="block mb-2">
                  Subcategoría <span className="text-red-500">*</span>
                </label>
                <Dropdown
                  id="subcategoria"
                  value={watchedValues.subcategoria}
                  onChange={(e) => setValue('subcategoria', e.value)}
                  options={subcategorias}
                  optionLabel="nombre"
                  optionValue="id"
                  className={errors.subcategoria ? 'p-invalid' : ''}
                  placeholder="Seleccionar subcategoría"
                />
                {errors.subcategoria && <small className="text-red-500">{errors.subcategoria.message}</small>}
              </div>
            )}

            <div className="col-12 md:col-6">
              <label htmlFor="montoTotal" className="block mb-2">
                Monto Total <span className="text-red-500">*</span>
              </label>
              <InputNumber
                id="montoTotal"
                {...register('montoTotal', { 
                  required: 'El monto es requerido',
                  min: { value: 1, message: 'El monto debe ser mayor a 0' }
                })}
                mode="currency"
                currency="ARS"
                locale="es-AR"
                className={errors.montoTotal ? 'p-invalid' : ''}
              />
              {errors.montoTotal && <small className="text-red-500">{errors.montoTotal.message}</small>}
            </div>

            {mostrarValorRecibido && (
              <div className="col-12 md:col-6">
                <label htmlFor="valorRecibido" className="block mb-2">
                  Valor Recibido <span className="text-red-500">*</span>
                </label>
                <InputNumber
                  id="valorRecibido"
                  {...register('valorRecibido', { 
                    required: 'El valor recibido es requerido',
                    min: { value: 0, message: 'El valor debe ser mayor o igual a 0' }
                  })}
                  mode="currency"
                  currency="ARS"
                  locale="es-AR"
                  className={errors.valorRecibido ? 'p-invalid' : ''}
                />
                {errors.valorRecibido && <small className="text-red-500">{errors.valorRecibido.message}</small>}
              </div>
            )}

            <div className="col-12 md:col-6">
              <label className="block mb-2">
                Estado de Pago <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <Button
                  label="Por Pagar"
                  icon="pi pi-clock"
                  className={estadoPago === 'por_pagar' ? 'p-button-success' : 'p-button-outlined'}
                  onClick={() => setEstadoPago('por_pagar')}
                />
                <Button
                  label="Pagado"
                  icon="pi pi-check"
                  className={estadoPago === 'pagado' ? 'p-button-success' : 'p-button-outlined'}
                  onClick={() => setEstadoPago('pagado')}
                />
              </div>
            </div>

            <div className="col-12 md:col-6">
              <label htmlFor="fechaInicio" className="block mb-2">
                Fecha de Inicio <span className="text-red-500">*</span>
              </label>
              <Calendar
                id="fechaInicio"
                {...register('fechaInicio', { required: 'La fecha de inicio es requerida' })}
                dateFormat="dd/mm/yy"
                className={errors.fechaInicio ? 'p-invalid' : ''}
                showIcon
              />
              {errors.fechaInicio && <small className="text-red-500">{errors.fechaInicio.message}</small>}
            </div>

            {estadoPago === 'por_pagar' && (
              <div className="col-12 md:col-6">
                <label htmlFor="fechaVencimiento" className="block mb-2">
                  Fecha de Vencimiento <span className="text-red-500">*</span>
                </label>
                <Calendar
                  id="fechaVencimiento"
                  {...register('fechaVencimiento', { required: 'La fecha de vencimiento es requerida' })}
                  dateFormat="dd/mm/yy"
                  className={errors.fechaVencimiento ? 'p-invalid' : ''}
                  showIcon
                />
                {errors.fechaVencimiento && <small className="text-red-500">{errors.fechaVencimiento.message}</small>}
              </div>
            )}

            {estadoPago === 'pagado' && (
              <div className="col-12 md:col-6">
                <label htmlFor="fechaPago" className="block mb-2">
                  Fecha de Pago <span className="text-red-500">*</span>
                </label>
                <Calendar
                  id="fechaPago"
                  {...register('fechaPago', { required: 'La fecha de pago es requerida' })}
                  dateFormat="dd/mm/yy"
                  className={errors.fechaPago ? 'p-invalid' : ''}
                  showIcon
                />
                {errors.fechaPago && <small className="text-red-500">{errors.fechaPago.message}</small>}
              </div>
            )}

            <div className="col-12 md:col-6">
              <label htmlFor="tipoPago" className="block mb-2">
                Tipo de Pago
              </label>
              <Dropdown
                id="tipoPago"
                value={watchedValues.tipoPago}
                onChange={(e) => setValue('tipoPago', e.value)}
                options={tiposPago}
                optionLabel="nombre"
                optionValue="id"
                placeholder="Seleccionar tipo de pago"
              />
            </div>

            {subcategoriasTipoPago.length > 0 && (
              <div className="col-12 md:col-6">
                <label htmlFor="subcategoriaTipoPago" className="block mb-2">
                  Subcategoría de Pago <span className="text-red-500">*</span>
                </label>
                <Dropdown
                  id="subcategoriaTipoPago"
                  value={watchedValues.subcategoriaTipoPago}
                  onChange={(e) => setValue('subcategoriaTipoPago', e.value)}
                  options={subcategoriasTipoPago}
                  optionLabel="nombre"
                  optionValue="id"
                  className={errors.subcategoriaTipoPago ? 'p-invalid' : ''}
                  placeholder="Seleccionar subcategoría"
                />
                {errors.subcategoriaTipoPago && <small className="text-red-500">{errors.subcategoriaTipoPago.message}</small>}
              </div>
            )}

            {/* Configuración de Recurrencia */}
            <div className="col-12">
              <h4>Configuración de Recurrencia</h4>
              <Divider />
            </div>

            <div className="col-12 md:col-6">
              <label htmlFor="frecuencia" className="block mb-2">
                Frecuencia <span className="text-red-500">*</span>
              </label>
              <Dropdown
                id="frecuencia"
                value={watchedValues.frecuencia}
                onChange={handleFrecuenciaChange}
                options={tiposProyeccion}
                optionLabel="nombre"
                optionValue="id"
                className={errors.frecuencia ? 'p-invalid' : ''}
                placeholder="Seleccionar frecuencia"
              />
              {errors.frecuencia && <small className="text-red-500">{errors.frecuencia.message}</small>}
            </div>

            <div className="col-12 md:col-6">
              <label htmlFor="cuotas" className="block mb-2">
                Número de Cuotas <span className="text-red-500">*</span>
              </label>
              <InputNumber
                id="cuotas"
                {...register('cuotas', { 
                  required: 'El número de cuotas es requerido',
                  min: { value: 1, message: 'Mínimo 1 cuota' },
                  max: { value: 60, message: 'Máximo 60 cuotas' }
                })}
                min={1}
                max={60}
                className={errors.cuotas ? 'p-invalid' : ''}
              />
              {errors.cuotas && <small className="text-red-500">{errors.cuotas.message}</small>}
            </div>

            <div className="col-12 md:col-6">
              <label htmlFor="recordatorio" className="block mb-2">
                Recordatorio
              </label>
              <Dropdown
                id="recordatorio"
                value={watchedValues.recordatorio}
                onChange={(e) => setValue('recordatorio', e.value)}
                options={recordatorios}
                optionLabel="nombre"
                optionValue="id"
                placeholder="Seleccionar recordatorio"
              />
            </div>

            {/* Información sobre el funcionamiento */}
            <div className="col-12">
              <div className="p-3 border-round bg-blue-50 border-blue-200">
                <div className="flex align-items-center gap-2 mb-2">
                  <i className="pi pi-info-circle text-blue-600"></i>
                  <span className="font-semibold text-blue-800">¿Cómo funciona?</span>
                </div>
                <p className="text-blue-700 text-sm m-0">
                  Este gasto recurrente aparecerá en el calendario como <strong>recordatorio</strong>. 
                  Cuando se acerque la fecha, podrás editarlo con el monto exacto y marcarlo como pagado.
                </p>
              </div>
            </div>

            {/* Vista Previa de Cuotas */}
            {cuotasPreview.length > 0 && (
              <div className="col-12">
                <h5>Vista Previa de Cuotas</h5>
                <DataTable
                  value={cuotasPreview}
                  paginator
                  rows={5}
                  responsiveLayout="scroll"
                  emptyMessage="No hay cuotas para mostrar"
                >
                  <Column field="cuota" header="Cuota" style={{ width: '80px' }} />
                  <Column field="fecha" header="Fecha" body={fechaTemplate} />
                  <Column field="monto" header="Monto" body={montoTemplate} />
                  <Column field="estado" header="Estado" body={estadoTemplate} />
                </DataTable>
              </div>
            )}

            {/* Nota */}
            <div className="col-12">
              <label htmlFor="nota" className="block mb-2">
                Nota
              </label>
              <InputText
                id="nota"
                {...register('nota')}
                placeholder="Notas adicionales sobre el gasto recurrente"
              />
            </div>

            {/* Botones */}
            <div className="col-12 flex justify-content-end gap-2">
              <Button
                type="button"
                label="Cancelar"
                icon="pi pi-times"
                className="p-button-text"
                onClick={onHide}
              />
              <Button
                type="submit"
                label={gasto ? 'Actualizar' : 'Crear'}
                icon="pi pi-check"
                loading={loading}
                disabled={loading}
              />
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
};

export default GastoRecurrenteForm;
