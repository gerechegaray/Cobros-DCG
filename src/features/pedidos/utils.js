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
      console.log('  - Stock guardado (producto.stock):', producto.stock, 'tipo:', typeof producto.stock);
      console.log('  - Warehouses:', producto.warehouses);
      console.log('  - Inventory:', producto.inventory);
    }
    
    // Obtener stock: primero verificar si ya está guardado en Firestore, sino extraer de Alegra
    let stock = 0;
    
    // 🆕 Prioridad 1: Si el producto ya tiene stock guardado Y es mayor a 0 (viene de Firestore sincronizado recientemente)
    if (producto.stock !== undefined && producto.stock !== null && Number(producto.stock) > 0) {
      stock = Number(producto.stock);
      if (index === 0) {
        console.log('  - ✅ Usando stock guardado:', stock);
      }
    } 
    // Prioridad 2: Intentar extraer de inventory (datos directos de Alegra o Firestore con estructura completa)
    else if (producto.inventory?.availableQuantity !== undefined) {
      stock = Number(producto.inventory.availableQuantity || 0);
      if (index === 0) {
        console.log('  - ✅ Usando stock de inventory.availableQuantity:', stock);
      }
    }
    else if (producto.inventory?.quantity !== undefined) {
      stock = Number(producto.inventory.quantity || 0);
      if (index === 0) {
        console.log('  - ✅ Usando stock de inventory.quantity:', stock);
      }
    }
    // Prioridad 3: Intentar extraer de warehouses (puede estar en Firestore con estructura completa de Alegra)
    else if (Array.isArray(producto.warehouses) && producto.warehouses.length > 0) {
      // Intentar diferentes campos posibles de stock en warehouses
      const warehouse = producto.warehouses[0];
      stock = Number(warehouse.availableQuantity || warehouse.quantity || warehouse.stock || 0);
      if (index === 0) {
        console.log('  - ✅ Usando stock de warehouses:', stock, 'de:', warehouse);
      }
    } 
    // Prioridad 4: Si el stock guardado es 0 o null, usarlo como último recurso
    else if (producto.stock !== undefined && producto.stock !== null) {
      stock = Number(producto.stock) || 0;
      if (index === 0) {
        console.log('  - ⚠️ Usando stock guardado (0 o null):', stock);
      }
    }
    // Si no se encuentra stock en ningún lugar, queda en 0
    else {
      if (index === 0) {
        console.log('  - ⚠️ No se encontró stock en ningún campo, usando 0');
        console.log('  - 💡 Sugerencia: Resincronizar productos desde Alegra para obtener stock');
      }
    }
    
    if (index === 0) {
      console.log('  - 📦 Stock final transformado:', stock);
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

/** Email usado en pedidos para Santi (mismo valor que PedidosReportes). */
export const VENDEDOR_SANTI_EMAIL_PEDIDOS = 'santi@dcg.com';

/**
 * Pedidos facturados cuya fechaPedido cae en el período YYYY-MM.
 */
export function filterPedidosFacturadosPorPeriodo(pedidos, periodo) {
  if (!Array.isArray(pedidos) || !pedidos.length || !/^\d{4}-\d{2}$/.test(periodo)) {
    return [];
  }
  const [anio, mes] = periodo.split('-').map(Number);
  const mesInicio = new Date(anio, mes - 1, 1, 0, 0, 0, 0);
  const mesFin = new Date(anio, mes, 0, 23, 59, 59, 999);
  return pedidos.filter((pedido) => {
    if (pedido.estado !== 'facturado') return false;
    const fechaPedido = pedido.fechaPedido?.toDate?.() || new Date(pedido.fechaPedido);
    return fechaPedido >= mesInicio && fechaPedido <= mesFin;
  });
}

/**
 * Top productos desde pedidos ya filtrados (misma lógica que PedidosReportes).
 */
export function topProductosDesdePedidosFacturados(pedidosFiltrados, limit = 10) {
  const productosVendidos = {};
  pedidosFiltrados.forEach((pedido) => {
    if (pedido.productos && Array.isArray(pedido.productos) && pedido.productos.length > 0) {
      pedido.productos.forEach((producto) => {
        const key = producto.id || producto.codigo || producto.nombre;
        if (!productosVendidos[key]) {
          productosVendidos[key] = {
            id: key,
            nombre: producto.nombre || 'Sin nombre',
            codigo: producto.codigo || '-',
            cantidadTotal: 0,
            montoTotal: 0
          };
        }
        productosVendidos[key].cantidadTotal += producto.cantidad || 0;
        productosVendidos[key].montoTotal +=
          producto.total || (producto.cantidad || 0) * (producto.precioUnitario || 0) || 0;
      });
    } else if (pedido.total > 0) {
      const key = `pedido_${pedido.id || 'sin_id'}`;
      if (!productosVendidos[key]) {
        productosVendidos[key] = {
          id: key,
          nombre: `Pedido ${pedido.cliente || ''}`,
          codigo: String(pedido.id || '-'),
          cantidadTotal: 1,
          montoTotal: 0
        };
      }
      productosVendidos[key].montoTotal += pedido.total || 0;
    }
  });
  return Object.values(productosVendidos)
    .sort((a, b) => b.cantidadTotal - a.cantidadTotal)
    .slice(0, limit);
}

