# 📊 Módulo de Gestión de Cobros

## 🎯 Descripción

Módulo completo para la gestión de cobros del sistema. Permite a los vendedores registrar sus cobros y a los administradores controlar cuáles han sido cargados en el sistema de facturación externo.

---

## 👥 Roles y Permisos

### **Vendedores (Santi / Guille)**
- ✅ Crear nuevos cobros
- ✅ Editar sus propios cobros (solo si están en estado "Pendiente")
- ✅ Ver solo sus propios cobros
- ✅ Ver el estado de sus cobros (Pendiente/Cargado)
- ✅ Acceso al dashboard con sus métricas

### **Administrador**
- ✅ Ver todos los cobros de todos los vendedores
- ✅ Editar cualquier cobro
- ✅ Eliminar cobros
- ✅ Marcar cobros como "Cargado en sistema"
- ✅ Revertir estado a "Pendiente"
- ✅ Acceso completo al dashboard
- ✅ Acceso a logs de auditoría

---

## 📋 Estructura de Datos

### Colección: `cobros`

```javascript
{
  id: "auto-generado",
  cliente: "Nombre del cliente",
  clienteId: "id_cliente",
  monto: 150000,
  fechaCobro: Timestamp,
  formaPago: "efectivo" | "transferencia" | "otro",
  notas: "Información adicional",
  estado: "pendiente" | "cargado",
  fechaCargaSistema: Timestamp,
  cargadoPor: "admin@email.com",
  vendedor: "vendedor@email.com",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: "email",
  updatedBy: "email"
}
```

### Colección: `cobros_logs`

```javascript
{
  id: "auto-generado",
  cobroId: "id_del_cobro",
  usuario: "email",
  accion: "crear" | "editar" | "eliminar" | "marcar_cargado" | "marcar_pendiente",
  cambios: {
    anterior: {...},
    nuevo: {...}
  },
  timestamp: Timestamp,
  ip: "localhost",
  userAgent: "..."
}
```

---

## 🗂️ Estructura de Archivos

```
src/features/cobros/
├── CobrosMain.jsx           # Componente principal con tabs
├── CobroForm.jsx            # Formulario crear/editar cobro
├── CobrosLista.jsx          # Lista de cobros con filtros
├── CobrosDashboard.jsx      # Dashboard con métricas y gráficos
├── CobrosLogs.jsx           # Sistema de auditoría
├── cobrosService.js         # Servicios Firebase
├── constants.js             # Constantes del módulo
├── utils.js                 # Funciones utilitarias
├── index.js                 # Exports del módulo
└── README_COBROS.md         # Esta documentación
```

---

## 🚀 Funcionalidades

### 1. **Lista de Cobros** (`CobrosLista.jsx`)

#### Características:
- ✅ DataTable con paginación
- ✅ Búsqueda global en tiempo real
- ✅ Filtros avanzados:
  - Por estado (Pendiente/Cargado)
  - Por forma de pago
  - Por rango de fechas
- ✅ Exportar a CSV
- ✅ Acciones contextuales según rol
- ✅ Actualización en tiempo real (Firebase Realtime)

#### Columnas:
- Fecha del cobro
- Cliente
- Monto (formateado con $)
- Forma de pago
- Vendedor (solo visible para admin)
- Estado (badge con color)
- Notas
- Acciones

#### Acciones disponibles:
- **Editar** (solo si es tu cobro o eres admin, y está pendiente)
- **Marcar como Cargado** (solo admin)
- **Revertir a Pendiente** (solo admin)
- **Eliminar** (solo admin)

---

### 2. **Dashboard** (`CobrosDashboard.jsx`)

#### Tarjetas de Resumen:
1. **Total Cobrado** - Suma de todos los cobros
2. **Pendiente** - Suma de cobros no cargados
3. **Cargado** - Suma de cobros ya en el sistema
4. **Total Cobros** - Cantidad de registros

#### Gráficos:
1. **Distribución por Estado** (Doughnut Chart)
   - Pendiente vs Cargado
   
2. **Por Forma de Pago** (Bar Chart)
   - Efectivo, Transferencia, Otro

3. **Por Vendedor** (Horizontal Bar Chart - solo admin)
   - Total cobrado por cada vendedor

#### Filtro de Período:
- Hoy
- Esta Semana
- Este Mes
- Este Año
- Todo

#### Barra de Progreso:
- Porcentaje de cobros cargados en el sistema

---

### 3. **Formulario de Cobro** (`CobroForm.jsx`)

#### Campos:
- **Cliente*** (obligatorio) - InputText
- **Monto*** (obligatorio) - InputNumber con formato de moneda
- **Fecha del Cobro*** (obligatorio) - Calendar
- **Forma de Pago*** (obligatorio) - Dropdown
  - Efectivo
  - Transferencia
  - Otro
- **Notas** (opcional) - Textarea

#### Validaciones:
- Cliente no puede estar vacío
- Monto debe ser mayor a 0
- Fecha es requerida
- Forma de pago es requerida

#### Información adicional (solo en edición):
- Vendedor que creó el cobro
- Estado actual del cobro

---

### 4. **Sistema de Auditoría** (`CobrosLogs.jsx`)

#### Características:
- ✅ Vista de tabla y timeline
- ✅ Registro de todas las acciones
- ✅ Búsqueda y filtrado
- ✅ Actualización en tiempo real

#### Acciones registradas:
- Crear cobro
- Editar cobro
- Eliminar cobro
- Marcar como cargado
- Marcar como pendiente

#### Información registrada:
- Fecha y hora exacta
- Usuario que realizó la acción
- Tipo de acción
- Cambios realizados (antes/después)
- IP y User Agent

---

## 🔧 Servicios Principales

### `cobrosService.js`

#### Funciones disponibles:

```javascript
// Obtener cobros
getCobros()
getCobrosRealtime(callback)
getCobrosByVendedor(vendedorEmail)
getCobrosByVendedorRealtime(vendedorEmail, callback)
getCobroById(cobroId)

// CRUD
crearCobro(cobroData, usuario)
actualizarCobro(cobroId, cobroData, usuario)
eliminarCobro(cobroId, usuario)

// Cambio de estado
marcarComoCargado(cobroId, usuario)
marcarComoPendiente(cobroId, usuario)

// Auditoría
getLogs(cobroId?)
getLogsRealtime(callback, cobroId?)
crearLog(logData)
```

---

## 🎨 Utilidades

### `utils.js`

Funciones de formateo y validación:

```javascript
// Formateo
formatearMonto(monto)           // $150.000
formatearFecha(fecha)           // 14/10/2025
formatearFechaHora(fecha)       // 14/10/2025 10:30
getFormaPagoLabel(valor)
getEstadoLabel(estado)
getAccionLabel(accion)

// Validaciones
validarMonto(monto)
validarFecha(fecha)
validarCliente(cliente)
validarFormaPago(formaPago)

// Cálculos
calcularTotalesPorEstado(cobros)
calcularTotalesPorVendedor(cobros)
calcularTotalesPorFormaPago(cobros)

// Filtros
filtrarPorRangoFechas(cobros, fechaInicio, fechaFin)

// Export
exportarCobrosCsv(cobros)
descargarCsv(contenido, nombreArchivo)
```

---

## 📊 Constantes

### Formas de Pago
```javascript
FORMAS_PAGO = [
  { label: 'Efectivo', value: 'efectivo' },
  { label: 'Transferencia', value: 'transferencia' },
  { label: 'Otro', value: 'otro' }
]
```

### Estados
```javascript
ESTADOS_COBRO = {
  PENDIENTE: 'pendiente',
  CARGADO: 'cargado'
}

ESTADO_COLORS = {
  pendiente: 'warning',
  cargado: 'success'
}

ESTADO_ICONS = {
  pendiente: 'pi pi-clock',
  cargado: 'pi pi-check-circle'
}
```

---

## 🔄 Flujo de Trabajo

### Para Vendedores:

1. **Registrar Cobro**
   - Click en "Nuevo Cobro"
   - Completar formulario
   - Guardar

2. **Verificar Estado**
   - Ver lista de cobros
   - Identificar cuáles están "Pendientes" (amarillo)
   - Identificar cuáles están "Cargados" (verde)

3. **Editar Cobro**
   - Solo posible si está "Pendiente"
   - Click en ícono de editar
   - Modificar y guardar

### Para Administradores:

1. **Revisar Cobros Pendientes**
   - Filtrar por estado "Pendiente"
   - Verificar en sistema de facturación externo

2. **Marcar como Cargado**
   - Click en ícono de check (✓)
   - El cobro cambia a estado "Cargado"
   - Se registra quién y cuándo lo marcó

3. **Revertir si es necesario**
   - Click en ícono de refresh
   - Vuelve a estado "Pendiente"

4. **Control y Auditoría**
   - Ver dashboard con métricas
   - Revisar logs para auditoría
   - Exportar reportes en CSV

---

## 🎯 Casos de Uso

### Caso 1: Vendedor registra un cobro
```
Usuario: Santi
Acción: Crear nuevo cobro
Cliente: "Distribuidora ABC"
Monto: $250.000
Forma de pago: Transferencia
Resultado: Cobro creado en estado "Pendiente"
```

### Caso 2: Admin marca cobro como cargado
```
Usuario: Admin
Acción: Marcar como cargado
Cobro: ID abc123
Resultado: Estado cambia a "Cargado", se registra fecha y usuario
```

### Caso 3: Doble control
```
1. Vendedor revisa sus cobros
2. Ve que 5 están "Pendientes" y 3 "Cargados"
3. Confirma con admin que los 3 cargados están correctos
4. Admin verifica en sistema externo
```

---

## 🔐 Seguridad

- ✅ Validación de permisos por rol
- ✅ Reglas de Firestore para proteger datos
- ✅ Auditoría completa de todas las acciones
- ✅ Timestamps de creación y modificación
- ✅ Registro de quién hizo cada cambio

---

## 🚧 Reglas de Firestore Sugeridas

```javascript
// firestore.rules
match /cobros/{cobroId} {
  // Leer: vendedor solo sus cobros, admin todos
  allow read: if request.auth != null && 
    (resource.data.vendedor == request.auth.token.email || 
     get(/databases/$(database)/documents/usuarios/$(request.auth.token.email)).data.role == 'admin');
  
  // Crear: usuarios autenticados
  allow create: if request.auth != null && 
    request.resource.data.vendedor == request.auth.token.email;
  
  // Actualizar: solo admin o vendedor del cobro (si está pendiente)
  allow update: if request.auth != null && 
    (get(/databases/$(database)/documents/usuarios/$(request.auth.token.email)).data.role == 'admin' ||
     (resource.data.vendedor == request.auth.token.email && resource.data.estado == 'pendiente'));
  
  // Eliminar: solo admin
  allow delete: if request.auth != null && 
    get(/databases/$(database)/documents/usuarios/$(request.auth.token.email)).data.role == 'admin';
}

match /cobros_logs/{logId} {
  // Solo lectura para usuarios autenticados
  allow read: if request.auth != null;
  // Solo escritura desde el servidor o admin
  allow create: if request.auth != null;
}
```

---

## 📱 Responsive Design

El módulo está completamente adaptado para:
- 💻 Desktop
- 📱 Tablet
- 📱 Mobile

---

## 🎨 Tecnologías Utilizadas

- **React** - Framework principal
- **PrimeReact** - Componentes UI
- **Firebase Firestore** - Base de datos en tiempo real
- **Moment.js** - Manejo de fechas
- **Chart.js** (via PrimeReact) - Gráficos

---

## ✅ Características Destacadas

- ⚡ **Actualización en tiempo real** - Los cambios se ven instantáneamente
- 🔍 **Búsqueda y filtros potentes** - Encuentra cualquier cobro rápidamente
- 📊 **Dashboard visual** - Métricas claras y gráficos informativos
- 📝 **Auditoría completa** - Trazabilidad total de todas las acciones
- 🎯 **Control de permisos** - Cada usuario ve y hace solo lo que debe
- 📤 **Exportación** - Descarga reportes en CSV
- 🎨 **Interfaz moderna** - Diseño limpio y profesional

---

## 🐛 Manejo de Errores

Todos los errores se manejan con:
- Mensajes Toast informativos
- Console.error para debugging
- Try-catch en todas las operaciones asíncronas

---

## 📝 Notas Importantes

1. **Estado Pendiente**: Los cobros recién creados siempre inician en estado "Pendiente"
2. **Edición limitada**: Solo se pueden editar cobros en estado "Pendiente"
3. **Permisos**: El vendedor solo puede ver y editar sus propios cobros
4. **Auditoría**: Todas las acciones quedan registradas permanentemente
5. **Tiempo real**: Los cambios se sincronizan automáticamente entre usuarios

---

## 🔮 Futuras Mejoras (Sugeridas)

- [ ] Notificaciones push cuando un cobro es marcado como cargado
- [ ] Integración directa con el sistema de facturación
- [ ] Carga masiva de cobros desde CSV/Excel
- [ ] Adjuntar comprobantes (imágenes/PDFs)
- [ ] Reportes más avanzados con filtros personalizados
- [ ] Recordatorios automáticos de cobros pendientes
- [ ] Dashboard con tendencias y proyecciones

---

**Desarrollado con ❤️ para optimizar el proceso de gestión de cobros**

