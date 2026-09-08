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
  
  return productosAlegra.map((producto) => {
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
    
    let stock = 0;
    
    if (producto.stock !== undefined && producto.stock !== null && Number(producto.stock) > 0) {
      stock = Number(producto.stock);
    } else if (producto.inventory?.availableQuantity !== undefined) {
      stock = Number(producto.inventory.availableQuantity || 0);
    } else if (producto.inventory?.quantity !== undefined) {
      stock = Number(producto.inventory.quantity || 0);
    } else if (Array.isArray(producto.warehouses) && producto.warehouses.length > 0) {
      const warehouse = producto.warehouses[0];
      stock = Number(warehouse.availableQuantity || warehouse.quantity || warehouse.stock || 0);
    } else if (producto.stock !== undefined && producto.stock !== null) {
      stock = Number(producto.stock) || 0;
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

/** Email principal en pedidos (PedidosReportes). */
export const VENDEDOR_SANTI_EMAIL_PEDIDOS = 'santi@dcg.com';

/** Emails conocidos para Santi; opcional: VITE_SANTI_PEDIDOS_EMAILS (separados por coma). */
export function getVendedorSantiEmailsPedidos() {
  const envExtra =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_SANTI_PEDIDOS_EMAILS
      ? String(import.meta.env.VITE_SANTI_PEDIDOS_EMAILS)
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : [];
  return [
    ...new Set([
      'santi@dcg.com',
      'santi@empresa.com',
      'santiagomillandcg@gmail.com',
      ...envExtra
    ])
  ];
}

/**
 * Pedido de Santi: coincide email configurado o nombre guardado al crear el pedido.
 */
export function esPedidoDelVendedorSanti(pedido) {
  if (!pedido) return false;
  const emails = getVendedorSantiEmailsPedidos();
  const v = String(pedido.vendedor || '').trim().toLowerCase();
  const createdBy = String(pedido.createdBy || '').trim().toLowerCase();
  if (emails.includes(v) || emails.includes(createdBy)) return true;
  const nom = String(pedido.vendedorNombre || '').trim().toLowerCase();
  return nom === 'santi';
}

/** Valor interno del desplegable "Santi" en reportes (todos los mails de Santi). */
export const FILTRO_REPORTE_PEDIDOS_SANTI = '__filtro_vendedor_santi__';

/**
 * Filtro admin en reportes de pedidos: email exacto o bloque Santi multi-mail.
 */
export function pedidoCoincideConFiltroVendedorReporte(pedido, filtro) {
  if (filtro == null || filtro === '') return true;
  if (filtro === FILTRO_REPORTE_PEDIDOS_SANTI) return esPedidoDelVendedorSanti(pedido);
  const sel = String(filtro).trim().toLowerCase();
  const v = String(pedido.vendedor || '').trim().toLowerCase();
  const c = String(pedido.createdBy || '').trim().toLowerCase();
  return v === sel || c === sel;
}

/**
 * Fecha que define el período para un pedido facturado: fechaFacturacion (al marcar en la app),
 * o fechaPedido si es histórico sin ese campo.
 */
export function getFechaReferenciaPedidoFacturado(pedido) {
  if (!pedido || pedido.estado !== 'facturado') return null;
  if (pedido.fechaFacturacion != null) {
    const f = pedido.fechaFacturacion?.toDate?.() ?? new Date(pedido.fechaFacturacion);
    if (f && !Number.isNaN(f.getTime())) return f;
  }
  if (pedido.fechaPedido != null) {
    const f = pedido.fechaPedido?.toDate?.() ?? new Date(pedido.fechaPedido);
    if (f && !Number.isNaN(f.getTime())) return f;
  }
  return null;
}

/**
 * Pedidos facturados cuya fecha de referencia (facturación en app o fecha del pedido) cae en YYYY-MM.
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
    const fechaRef = getFechaReferenciaPedidoFacturado(pedido);
    if (!fechaRef) return false;
    return fechaRef >= mesInicio && fechaRef <= mesFin;
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

export function claveProductoPedido(producto) {
  return String(producto?.id || producto?.codigo || producto?.nombre || '').trim() || 'sin-clave';
}

export function lineasProductosPedido(pedido) {
  if (!pedido?.productos || !Array.isArray(pedido.productos)) return [];
  return pedido.productos.map((producto) => ({
    codigo: producto.codigo || '-',
    producto: producto.nombre || 'Sin nombre',
    cantidad: Number(producto.cantidad) || 0,
    clave: claveProductoPedido(producto)
  }));
}

export function sumarioProductosPedidos(pedidos) {
  const agrupados = {};
  (pedidos || []).forEach((pedido) => {
    lineasProductosPedido(pedido).forEach((linea) => {
      if (!agrupados[linea.clave]) {
        agrupados[linea.clave] = {
          codigo: linea.codigo,
          producto: linea.producto,
          cantidad: 0
        };
      }
      agrupados[linea.clave].cantidad += linea.cantidad;
    });
  });
  return Object.values(agrupados).sort((a, b) => {
    const porCodigo = String(a.codigo).localeCompare(String(b.codigo), 'es');
    if (porCodigo !== 0) return porCodigo;
    return String(a.producto).localeCompare(String(b.producto), 'es');
  });
}

