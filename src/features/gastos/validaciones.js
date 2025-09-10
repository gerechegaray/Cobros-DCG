// Validaciones centralizadas para el sistema de gastos

export const validacionesGastos = {
  montoTotal: {
    required: 'El monto es requerido',
    min: { 
      value: 1, 
      message: 'El monto debe ser mayor a 0' 
    },
    max: { 
      value: 999999999, 
      message: 'El monto es demasiado alto' 
    },
    validate: (value) => {
      if (value && value < 0) {
        return 'El monto no puede ser negativo';
      }
      return true;
    }
  },
  
  valorRecibido: {
    min: { 
      value: 0, 
      message: 'El valor recibido no puede ser negativo' 
    },
    max: { 
      value: 999999999, 
      message: 'El valor recibido es demasiado alto' 
    }
  },
  
  fechaVencimiento: {
    required: 'La fecha de vencimiento es requerida',
    validate: (value) => {
      if (!value) return true; // Si no es requerido, no validar
      
      const fecha = new Date(value);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fecha < hoy) {
        return 'La fecha de vencimiento no puede ser anterior a hoy';
      }
      
      // Validar que no sea más de 2 años en el futuro
      const dosAnos = new Date();
      dosAnos.setFullYear(dosAnos.getFullYear() + 2);
      
      if (fecha > dosAnos) {
        return 'La fecha no puede ser más de 2 años en el futuro';
      }
      
      return true;
    }
  },
  
  fechaPago: {
    required: 'La fecha de pago es requerida',
    validate: (value) => {
      if (!value) return true;
      
      const fecha = new Date(value);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fecha > hoy) {
        return 'La fecha de pago no puede ser futura';
      }
      
      // Validar que no sea más de 1 año en el pasado
      const unAno = new Date();
      unAno.setFullYear(unAno.getFullYear() - 1);
      
      if (fecha < unAno) {
        return 'La fecha de pago no puede ser más de 1 año en el pasado';
      }
      
      return true;
    }
  },
  
  categoria: {
    required: 'La categoría es requerida'
  },
  
  subcategoria: {
    required: 'La subcategoría es requerida',
    validate: (value, formValues) => {
      // Solo validar si la categoría tiene subcategorías
      const categoriasConSubcategorias = [
        'combustible', 'mantenimiento_vehiculo', 'sueldo', 'vendedores',
        'prestamos', 'proveedores', 'gastos_bancarios', 'echeqs', 'tarjeta_credito'
      ];
      
      if (categoriasConSubcategorias.includes(formValues.categoria) && !value) {
        return 'La subcategoría es requerida para esta categoría';
      }
      
      return true;
    }
  },
  
  cuotas: {
    required: 'El número de cuotas es requerido',
    min: { 
      value: 1, 
      message: 'Debe haber al menos 1 cuota' 
    },
    max: { 
      value: 60, 
      message: 'Máximo 60 cuotas' 
    }
  },
  
  nota: {
    maxLength: {
      value: 500,
      message: 'La nota no puede tener más de 500 caracteres'
    },
    validate: (value) => {
      if (value && value.length > 500) {
        return 'La nota es demasiado larga';
      }
      return true;
    }
  }
};

// Función para validar fechas lógicas
export const validarFechasLogicas = (fechaVencimiento, fechaPago) => {
  if (!fechaVencimiento || !fechaPago) return true;
  
  const vencimiento = new Date(fechaVencimiento);
  const pago = new Date(fechaPago);
  
  if (pago > vencimiento) {
    return 'La fecha de pago no puede ser posterior a la fecha de vencimiento';
  }
  
  return true;
};

// Función para validar montos lógicos
export const validarMontosLogicos = (montoTotal, valorRecibido) => {
  if (!montoTotal || !valorRecibido) return true;
  
  if (valorRecibido > montoTotal) {
    return 'El valor recibido no puede ser mayor al monto total';
  }
  
  return true;
};

// Función para sanitizar inputs
export const sanitizarInput = (input) => {
  if (!input) return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim();
};

// Función para validar formato de email (si se agrega en el futuro)
export const validarEmail = (email) => {
  if (!email) return true;
  
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) || 'Formato de email inválido';
};

// Función para validar formato de teléfono (si se agrega en el futuro)
export const validarTelefono = (telefono) => {
  if (!telefono) return true;
  
  const regex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
  return regex.test(telefono) || 'Formato de teléfono inválido';
};
