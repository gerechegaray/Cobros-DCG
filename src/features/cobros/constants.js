// Formas de pago disponibles
export const FORMAS_PAGO = [
  { label: 'Efectivo', value: 'efectivo' },
  { label: 'Transferencia', value: 'transferencia' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Otro', value: 'otro' }
];

// Estados de cobro
export const ESTADOS_COBRO = {
  PENDIENTE: 'pendiente',
  CARGADO: 'cargado'
};

// Etiquetas para estados
export const ESTADO_LABELS = {
  pendiente: 'Pendiente',
  cargado: 'Cargado'
};

// Colores para badges de estado
export const ESTADO_COLORS = {
  pendiente: 'warning',
  cargado: 'success'
};

// Iconos para estados
export const ESTADO_ICONS = {
  pendiente: 'pi pi-clock',
  cargado: 'pi pi-check-circle'
};

// Acciones de log
export const ACCIONES_LOG = {
  CREAR: 'crear',
  EDITAR: 'editar',
  ELIMINAR: 'eliminar',
  MARCAR_CARGADO: 'marcar_cargado',
  MARCAR_PENDIENTE: 'marcar_pendiente'
};

// Labels para acciones de log
export const ACCION_LABELS = {
  crear: 'Creado',
  editar: 'Editado',
  eliminar: 'Eliminado',
  marcar_cargado: 'Marcado como Cargado',
  marcar_pendiente: 'Marcado como Pendiente'
};

