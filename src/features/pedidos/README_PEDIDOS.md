# Módulo de Pedidos

## 📋 Descripción
Sistema completo de gestión de pedidos con integración a catálogo de productos de Alegra, control de estados, prioridades y seguimiento de entregas.

## 🎯 Características Principales

### 1. Gestión de Pedidos
- **Crear pedidos** con múltiples productos
- **Editar pedidos** existentes (según permisos)
- **Eliminar pedidos** (admin o vendedor antes de entrega)
- **Cambiar estados** del pedido
- **Seguimiento** de fechas de entrega

### 2. Catálogo de Productos
- **Carga desde Firestore** (cache local - rápido)
- **Sincronización manual** desde Alegra (solo admin)
- **Autocompletado** de productos
- **Precios actualizables**
- **Control de stock** (opcional)

### 3. Estados del Pedido
1. **Borrador**: Pedido en creación
2. **Confirmado**: Pedido confirmado por el cliente
3. **En Producción**: Pedido en proceso
4. **Listo**: Pedido terminado, listo para entregar
5. **Entregado**: Pedido entregado al cliente
6. **Cancelado**: Pedido cancelado

### 4. Prioridades
- **Baja**: Pedidos sin urgencia
- **Media**: Prioridad normal
- **Alta**: Requiere atención prioritaria
- **Urgente**: Máxima prioridad

### 5. Dashboard
- **Métricas generales**: Total pedidos, montos, estados
- **Gráficos**: Por estado y prioridad
- **Análisis de montos**: Total, entregado, pendiente
- **Alertas**: Pedidos vencidos, alta prioridad

## 🔐 Permisos y Roles

### Admin
- ✅ Ver todos los pedidos
- ✅ Crear, editar y eliminar cualquier pedido
- ✅ Cambiar estados de cualquier pedido
- ✅ Sincronizar productos desde Alegra
- ✅ Marcar pedidos como cargados en Alegra

### Vendedores (Santi, Guille)
- ✅ Ver solo sus propios pedidos
- ✅ Crear nuevos pedidos
- ✅ Editar sus pedidos (no entregados/cancelados)
- ✅ Eliminar sus pedidos (no entregados/cancelados)
- ✅ Cambiar estados de sus pedidos
- ❌ No pueden sincronizar productos

## 📁 Estructura de Archivos

```
src/features/pedidos/
├── PedidosMain.jsx          # Componente principal con tabs
├── PedidoForm.jsx           # Formulario de creación/edición
├── PedidosLista.jsx         # Lista con filtros y acciones
├── PedidosDashboard.jsx     # Dashboard con métricas
├── pedidosService.js        # Servicios de Firebase y productos
├── constants.js             # Estados, prioridades, colores
├── utils.js                 # Utilidades y formateo
├── PedidosLista.css         # Estilos responsive
├── index.js                 # Exports del módulo
└── README_PEDIDOS.md        # Esta documentación
```

## 🔄 Flujo de Trabajo

### Crear un Pedido
1. Click en "Nuevo Pedido"
2. Seleccionar cliente (autocompletado)
3. Establecer fecha de entrega
4. Agregar productos:
   - Buscar producto
   - Especificar cantidad
   - Ajustar precio si es necesario
   - Click en "Agregar"
5. Repetir para más productos
6. Ajustar descuento e IVA si es necesario
7. Agregar observaciones
8. Click en "Crear"

### Gestionar Productos
**Solo Admin:**
1. Ir a "Gestión de Datos"
2. Sección "Catálogo de Productos"
3. Click en "Sincronizar ahora"
4. Esperar confirmación
5. Productos actualizados disponibles para todos

### Cambiar Estado de Pedido
1. En la lista de pedidos
2. Click en el ícono de editar
3. Cambiar el estado en el dropdown
4. Guardar cambios

## 💾 Estructura de Datos

### Pedido
```javascript
{
  id: string,
  cliente: string,
  clienteId: string,
  fechaPedido: timestamp,
  fechaEntrega: timestamp,
  fechaEntregaReal: timestamp,  // Cuando se marca como entregado
  estado: string,                // borrador, confirmado, etc.
  prioridad: string,             // baja, media, alta, urgente
  productos: [
    {
      id: string,
      nombre: string,
      codigo: string,
      cantidad: number,
      precioUnitario: number,
      total: number,
      observaciones: string
    }
  ],
  subtotal: number,
  descuento: number,             // Porcentaje
  iva: number,                   // Porcentaje
  total: number,
  observaciones: string,
  vendedor: string,              // Email del vendedor
  vendedorNombre: string,
  cargadoEnAlegra: boolean,
  numeroFactura: string,
  fechaCargaAlegra: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string,
  updatedBy: string
}
```

### Producto (desde Alegra)
```javascript
{
  id: string,
  nombre: string,
  precio: number,
  codigo: string,
  stock: number,
  activo: boolean,
  categoria: string
}
```

## 🎨 Componentes

### PedidosMain
Componente principal con dos tabs:
- Lista de Pedidos
- Dashboard

### PedidoForm
Formulario completo con:
- Selector de cliente con autocompletado
- Selector de productos con autocompletado
- Tabla de productos agregados
- Cálculo automático de totales
- Validaciones

### PedidosLista
Lista de pedidos con:
- Filtros colapsables (cliente, estado, prioridad, fechas)
- Tabla responsive (cards en móvil)
- Acciones (ver, editar, eliminar)
- Indicadores de vencimiento
- Paginación

### PedidosDashboard
Dashboard con:
- 4 tarjetas de resumen
- Gráfico de dona (estados)
- Gráfico de barras (prioridades)
- Desglose detallado
- Análisis de montos

## 🔧 Funciones Principales

### pedidosService.js
- `getPedidos()`: Obtener todos los pedidos
- `getPedidosRealtime(callback)`: Escuchar cambios en tiempo real
- `getPedidosByVendedor(email)`: Obtener pedidos de un vendedor
- `crearPedido(data, user)`: Crear nuevo pedido
- `actualizarPedido(id, data, user)`: Actualizar pedido
- `eliminarPedido(id, user)`: Eliminar pedido
- `cambiarEstadoPedido(id, estado, user)`: Cambiar estado
- `getProductos(forzar)`: Obtener productos (cache o Alegra)
- `sincronizarProductosAlegra()`: Sincronizar desde Alegra

### utils.js
- `formatearMoneda(monto)`: Formato ARS
- `formatearFecha(fecha)`: Formato dd/mm/yyyy
- `calcularSubtotal(productos)`: Suma de productos
- `calcularTotal(productos, desc, iva)`: Total con desc/iva
- `estaVencido(fecha)`: Verificar si está vencido
- `diasHastaEntrega(fecha)`: Días restantes
- `transformarProductosAlegra(productos)`: Adaptar formato

## 🔒 Reglas de Firestore

```javascript
// Pedidos
- Leer: vendedor solo sus pedidos, admin todos
- Crear: usuarios autenticados
- Actualizar: admin todo, vendedor sus pedidos no finalizados
- Eliminar: admin o vendedor (no finalizados)

// Logs de pedidos
- Leer: usuarios autenticados
- Crear: usuarios autenticados (auditoría)
- Actualizar/Eliminar: prohibido
```

## 📱 Responsive
- **Desktop**: Tabla completa con todas las columnas
- **Tablet**: Tabla con scroll horizontal
- **Móvil**: Cards individuales con toda la información

## 🚀 Próximas Mejoras
- [ ] Integración directa con Alegra para crear facturas
- [ ] Notificaciones de pedidos próximos a vencer
- [ ] Exportación de pedidos a PDF/Excel
- [ ] Historial de cambios de estado
- [ ] Búsqueda avanzada de productos
- [ ] Plantillas de pedidos frecuentes
- [ ] Firma digital del cliente al entregar

## 📞 Soporte
Para consultas o problemas con el módulo de pedidos, contactar al administrador del sistema.

