import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Card, 
  Button, 
  InputText, 
  InputNumber, 
  Dropdown, 
  Calendar, 
  ToggleButton, 
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
import { validacionesGastos, validarFechasLogicas, validarMontosLogicos, sanitizarInput } from './validaciones';
import { useAtajosTeclado, useFeedbackVisual } from './hooks/useAtajosTeclado';

const GastoForm = ({ visible, onHide, gasto, onSuccess, user }) => {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [subcategorias, setSubcategorias] = useState([]);
  const [subcategoriasTipoPago, setSubcategoriasTipoPago] = useState([]);
  const [estadoPago, setEstadoPago] = useState('por_pagar'); // 'por_pagar' o 'pagado'
  const [mostrarValorRecibido, setMostrarValorRecibido] = useState(false);
  
  // Hooks personalizados
  const { mostrarFeedback } = useFeedbackVisual();
  
  // Atajos de teclado
  useAtajosTeclado({
    onGuardar: () => handleSubmit(onSubmit)(),
    onCancelar: onHide
  });
  
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm({
    defaultValues: {
      categoria: '',
      subcategoria: '',
      montoTotal: 0,
      valorRecibido: 0,
      fechaVencimiento: '',
      fechaPago: '',
      nota: '',
      tipoPago: 'efectivo',
      subcategoriaTipoPago: ''
    }
  });

  const watchedValues = watch();

  useEffect(() => {
    if (gasto) {
      const esPagado = gasto.estado === 'pagado';
      
      // Convertir fechas ISO a objetos Date para los campos Calendar
      const fechaVencimiento = gasto.fechaVencimiento ? new Date(gasto.fechaVencimiento) : null;
      const fechaPago = gasto.fechaPago ? new Date(gasto.fechaPago) : null;
      
      console.log('Cargando gasto para edición:', gasto);
      console.log('fechaVencimiento original:', gasto.fechaVencimiento);
      console.log('fechaVencimiento convertida:', fechaVencimiento);
      console.log('fechaPago original:', gasto.fechaPago);
      console.log('fechaPago convertida:', fechaPago);
      
      reset({
        categoria: gasto.categoria || '',
        subcategoria: gasto.subcategoria || '',
        montoTotal: gasto.montoTotal || gasto.monto || 0,
        valorRecibido: gasto.valorRecibido || 0,
        fechaVencimiento: fechaVencimiento,
        fechaPago: fechaPago,
        nota: gasto.nota || '',
        tipoPago: gasto.tipoPago || 'efectivo',
        subcategoriaTipoPago: gasto.subcategoriaTipoPago || ''
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
      // Limpiar subcategoría si cambia la categoría
      setValue('subcategoria', '');
    } else {
      setSubcategorias([]);
      setValue('subcategoria', '');
    }
  }, [watchedValues.categoria, setValue]);

  // Limpiar fechas cuando cambie el estado de pago
  useEffect(() => {
    if (estadoPago === 'por_pagar') {
      setValue('fechaPago', '');
    } else if (estadoPago === 'pagado') {
      setValue('fechaVencimiento', '');
    }
  }, [estadoPago, setValue]);

  // Mostrar campo valorRecibido cuando sea Echeqs > Descontados
  useEffect(() => {
    const esEcheqsDescontados = watchedValues.categoria === 'echeqs' && watchedValues.subcategoria === 'descontados';
    setMostrarValorRecibido(esEcheqsDescontados);
    
    // Limpiar valorRecibido si no es echeqs descontados
    if (!esEcheqsDescontados) {
      setValue('valorRecibido', 0);
    }
  }, [watchedValues.categoria, watchedValues.subcategoria, setValue]);

  // Actualizar subcategorías de tipo de pago cuando cambie el tipo de pago
  useEffect(() => {
    const tipoPagoSeleccionado = watchedValues.tipoPago;
    if (tipoPagoSeleccionado) {
      const subcategoriasDisponibles = getSubcategoriasByTipoPago(tipoPagoSeleccionado);
      setSubcategoriasTipoPago(subcategoriasDisponibles);
      // Limpiar subcategoría de tipo de pago si cambia el tipo de pago
      setValue('subcategoriaTipoPago', '');
    } else {
      setSubcategoriasTipoPago([]);
      setValue('subcategoriaTipoPago', '');
    }
  }, [watchedValues.tipoPago, setValue]);


  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Validar monto total manualmente
      if (!data.montoTotal || data.montoTotal <= 0) {
        setToast({ severity: 'error', summary: 'Error', detail: 'El monto debe ser mayor a 0' });
        setLoading(false);
        return;
      }

      // Validar fechas según el estado de pago
      if (estadoPago === 'por_pagar' && !data.fechaVencimiento) {
        setToast({ severity: 'error', summary: 'Error', detail: 'La fecha de vencimiento es requerida' });
        setLoading(false);
        return;
      }

      if (estadoPago === 'pagado' && !data.fechaPago) {
        setToast({ severity: 'error', summary: 'Error', detail: 'La fecha de pago es requerida' });
        setLoading(false);
        return;
      }

      // Generar título automático basado en categoría y subcategoría
      const categoria = categoriasGastos.find(c => c.id === data.categoria);
      const subcategorias = getSubcategoriasByCategoria(data.categoria);
      const subcategoria = subcategorias.find(s => s.id === data.subcategoria);
      
      let tituloAutomatico = categoria?.nombre || 'Gasto';
      if (subcategoria) {
        tituloAutomatico += ` - ${subcategoria.nombre}`;
      }
      
      const gastoData = {
        ...data,
        titulo: tituloAutomatico,
        monto: data.montoTotal,
        proyeccion: false,
        tipo: 'gasto', // Gasto real (no recordatorio)
        estado: estadoPago === 'pagado' ? 'pagado' : 'pendiente',
        cuotasPagadas: 0,
        fechaPago: estadoPago === 'pagado' ? (data.fechaPago ? data.fechaPago.toISOString() : null) : null,
        fechaVencimiento: estadoPago === 'por_pagar' ? (data.fechaVencimiento ? data.fechaVencimiento.toISOString() : null) : null
      };

      // Debug: Log de los datos que se van a guardar
      console.log('Datos del formulario:', data);
      console.log('Estado de pago:', estadoPago);
      console.log('Fecha de pago:', data.fechaPago);
      console.log('Fecha de pago tipo:', typeof data.fechaPago);
      console.log('Fecha de pago instanceof Date:', data.fechaPago instanceof Date);
      console.log('Datos finales del gasto:', gastoData);
      console.log('fechaPago en gastoData:', gastoData.fechaPago);
      console.log('fechaPago en gastoData tipo:', typeof gastoData.fechaPago);

      if (gasto) {
        await actualizarGasto(gasto.id, gastoData, user);
        setToast({ severity: 'success', summary: 'Éxito', detail: 'Gasto actualizado correctamente' });
      } else {
        await crearGasto(gastoData, user);
        setToast({ severity: 'success', summary: 'Éxito', detail: 'Gasto creado correctamente' });
      }
      
      onSuccess();
      onHide();
    } catch (error) {
      console.error('Error guardando gasto:', error);
      setToast({ severity: 'error', summary: 'Error', detail: 'Error al guardar el gasto' });
    } finally {
      setLoading(false);
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
        header={gasto ? 'Editar Gasto Único' : 'Nuevo Gasto Único'}
        visible={visible}
        onHide={onHide}
        style={{ width: '90vw', maxWidth: '800px' }}
        modal
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid">
            {/* Información Básica */}
            <div className="col-12">
              <h4>Información Básica</h4>
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
                value={watchedValues.montoTotal}
                onValueChange={(e) => setValue('montoTotal', e.value)}
                mode="currency"
                currency="ARS"
                locale="es-AR"
                className={errors.montoTotal ? 'p-invalid' : ''}
                placeholder="0"
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
                  value={watchedValues.valorRecibido}
                  onValueChange={(e) => setValue('valorRecibido', e.value)}
                  mode="currency"
                  currency="ARS"
                  locale="es-AR"
                  className={errors.valorRecibido ? 'p-invalid' : ''}
                  placeholder="0"
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

            {estadoPago === 'por_pagar' && (
              <div className="col-12 md:col-6">
                <label htmlFor="fechaVencimiento" className="block mb-2">
                  Fecha de Vencimiento <span className="text-red-500">*</span>
                </label>
                <Calendar
                  id="fechaVencimiento"
                  value={watchedValues.fechaVencimiento ? new Date(watchedValues.fechaVencimiento) : null}
                  onChange={(e) => setValue('fechaVencimiento', e.value)}
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
                  value={watchedValues.fechaPago ? new Date(watchedValues.fechaPago) : null}
                  onChange={(e) => setValue('fechaPago', e.value)}
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


            {/* Nota */}
            <div className="col-12">
              <label htmlFor="nota" className="block mb-2">
                Nota
              </label>
              <InputText
                id="nota"
                {...register('nota')}
                placeholder="Notas adicionales sobre el gasto"
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

export default GastoForm;
