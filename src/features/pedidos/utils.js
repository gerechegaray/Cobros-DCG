// Formatear moneda
export const formatearMoneda = (monto) => {
  if (!monto && monto !== 0) return '$0.00';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(monto);
};

// Formatear fecha
export const formatearFecha = (fecha) => {
  if (!fecha) return '-';
  
  let fechaObj;
  if (fecha.toDate) {
    fechaObj = fecha.toDate();
  } else if (fecha instanceof Date) {
    fechaObj = fecha;
  } else {
    fechaObj = new Date(fecha);
  }
  
  return fechaObj.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Formatear fecha y hora
export const formatearFechaHora = (fecha) => {
  if (!fecha) return '-';
  
  let fechaObj;
  if (fecha.toDate) {
    fechaObj = fecha.toDate();
  } else if (fecha instanceof Date) {
    fechaObj = fecha;
  } else {
    fechaObj = new Date(fecha);
  }
  
  return fechaObj.toLocaleString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Calcular subtotal de productos
export const calcularSubtotal = (productos) => {
  if (!productos || productos.length === 0) return 0;
  return productos.reduce((sum, producto) => sum + (producto.total || 0), 0);
};

// Calcular total del pedido (sin IVA porque ya está incluido en precios)
export const calcularTotal = (productos) => {
  return calcularSubtotal(productos);
};

// Calcular total de un producto con descuento
export const calcularTotalProducto = (cantidad, precioUnitario, descuento = 0) => {
  const subtotal = cantidad * precioUnitario;
  const montoDescuento = (subtotal * descuento) / 100;
  return subtotal - montoDescuento;
};


// Transformar productos de Alegra al formato del pedido
export const transformarProductosAlegra = (productosAlegra) => {
  if (!productosAlegra || !Array.isArray(productosAlegra)) return [];
  
  return productosAlegra.map((producto, index) => {
    // Intentar obtener el precio de diferentes campos posibles
    let precio = 0;
    
    // Primero verificar si es un array (antes de verificar si es objeto, porque array también es objeto)
    if (Array.isArray(producto.price) && producto.price.length > 0) {
      // Caso 1: price es un array (múltiples precios)
      precio = parseFloat(producto.price[0].price || 0);
    } else if (producto.price && !isNaN(producto.price)) {
      // Caso 2: price directo (número)
      precio = parseFloat(producto.price);
    } else if (producto.price && typeof producto.price === 'object') {
      // Caso 3: price es un objeto
      precio = parseFloat(producto.price.price || producto.price.value || 0);
    }
    
    // 🆕 Log para debugging del primer producto
    if (index === 0) {
      console.log('🔍 Transformando primer producto:');
      console.log('  - ID:', producto.id);
      console.log('  - Nombre:', producto.name);
      console.log('  - Price original:', producto.price);
      console.log('  - Es array?:', Array.isArray(producto.price));
      console.log('  - Tipo de price:', typeof producto.price);
      if (Array.isArray(producto.price) && producto.price.length > 0) {
        console.log('  - Primer elemento del array:', producto.price[0]);
      }
      console.log('  - Precio transformado:', precio);
    }
    
    // Obtener stock desde warehouses
    let stock = 0;
    if (Array.isArray(producto.warehouses) && producto.warehouses.length > 0) {
      stock = producto.warehouses[0].availableQuantity || 0;
    } else if (producto.inventory?.quantity !== undefined) {
      stock = producto.inventory.quantity;
    }
    
    return {
      id: producto.id,
      nombre: producto.name || producto.description || 'Sin nombre',
      precio: precio,
      codigo: producto.reference || producto.id,
      stock: stock,
      activo: producto.status === 'active',
      categoria: producto.category?.name || 'Sin categoría'
    };
  });
};

// Validar producto antes de agregar al pedido
export const validarProducto = (producto, cantidad) => {
  const errores = [];
  const advertencias = [];
  
  if (!producto) {
    errores.push('Debe seleccionar un producto');
  }
  
  if (!cantidad || cantidad <= 0) {
    errores.push('La cantidad debe ser mayor a 0');
  }
  
  // Advertencia de stock pero no bloquea
  if (producto && producto.stock !== undefined && cantidad > producto.stock) {
    advertencias.push(`⚠️ Stock insuficiente. Disponible: ${producto.stock}. El pedido se registrará de todas formas.`);
  }
  
  return {
    valido: errores.length === 0,
    errores,
    advertencias
  };
};

