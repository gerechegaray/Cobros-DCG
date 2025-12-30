# Pruebas Controladas - Módulo de Comisiones FASE 1

## Objetivo
Validar el flujo completo del sistema de comisiones con datos reales.

## Pre-requisitos
- Backend corriendo en `http://localhost:3001` o la URL configurada
- Variables de entorno configuradas (ALEGRA_EMAIL, ALEGRA_API_KEY)
- Firebase inicializado correctamente
- Usuario admin autenticado en el frontend

---

## PASO 1: Seed de Reglas de Comisión

### Método 1: Desde el Frontend (Admin)
1. Acceder a `/comisiones` como admin
2. Hacer clic en "Cargar Reglas"
3. Verificar mensaje de éxito: "X creadas, Y actualizadas"

### Método 2: Desde Postman/curl
```bash
POST http://localhost:3001/api/comisiones/reglas/seed
```

**Resultado esperado:**
```json
{
  "success": true,
  "creadas": 21,
  "actualizadas": 0,
  "total": 21
}
```

**Validación:**
- Verificar en Firestore: colección `comisiones_reglas` debe tener 21 documentos
- Cada documento debe tener: `categoria`, `porcentaje`, `activa: true`

---

## PASO 2: Sincronizar Facturas desde Payments

### Método 1: Desde el Frontend (Admin)
1. En `/comisiones` como admin
2. Hacer clic en "Sincronizar Facturas"
3. Esperar mensaje de éxito con estadísticas

### Método 2: Desde Postman/curl
```bash
POST http://localhost:3001/api/comisiones/sync-facturas
```

**Resultado esperado:**
```json
{
  "success": true,
  "total": 50,
  "nuevas": 30,
  "actualizadas": 20,
  "errores": 0
}
```

**Validación:**
- Verificar en Firestore: colección `facturas_comisiones`
- Cada documento debe tener:
  - `invoiceId`
  - `seller.name` (solo "Guille" o "Santi")
  - `items` (array con `description` y `subtotal`)
  - `fecha`
- **CRÍTICO:** No debe haber facturas sin seller o con seller diferente a Guille/Santi

---

## PASO 3: Calcular Comisiones para 2025-01

### Método 1: Desde el Frontend
1. Como admin, seleccionar período "2025-01"
2. Hacer clic en "Calcular Comisiones"
3. Esperar mensaje de éxito

### Método 2: Desde Postman/curl
```bash
POST http://localhost:3001/api/comisiones/calcular/2025-01
```

**Resultado esperado:**
```json
{
  "success": true,
  "periodo": "2025-01",
  "resultados": [
    {
      "vendedor": "Guille",
      "periodo": "2025-01",
      "totalCobrado": 250000,
      "totalComision": 18750,
      "detalle": [...]
    },
    {
      "vendedor": "Santi",
      "periodo": "2025-01",
      "totalCobrado": 180000,
      "totalComision": 13500,
      "detalle": [...]
    }
  ]
}
```

**Validación:**
- Verificar en Firestore: `comisiones_mensuales/{vendedor}/2025-01/2025-01`
- Cada resultado debe tener:
  - `vendedor` (solo "Guille" o "Santi")
  - `periodo`: "2025-01"
  - `totalCobrado`: suma de subtotales
  - `totalComision`: suma de comisiones
  - `detalle`: array con al menos:
    - `facturaId`
    - `producto`
    - `categoria` ✅
    - `subtotal`
    - `porcentaje` ✅
    - `comision`

---

## PASO 4: Validación en Frontend

### 4.1 Vista Vendedor (Guille o Santi)

**Acceso:** `/comisiones` como vendedor (Guille o Santi)

**Validaciones:**

1. **Header:**
   - ✅ Título: "Mis Comisiones"
   - ✅ Período mostrado correctamente (ej: "enero 2025")
   - ✅ Botón "Recalcular Comisiones" visible

2. **KPIs:**
   - ✅ Card "Total Cobrado" con valor correcto
   - ✅ Card "Comisión Estimada" con valor correcto
   - ✅ Iconos y colores correctos

3. **Mensaje de advertencia:**
   - ✅ **CRÍTICO:** Debe verse: "Monto estimado – sujeto a validación administrativa"
   - ✅ Estilo destacado (fondo amarillo/naranja)

4. **Tabla de detalle:**
   - ✅ Columnas: Factura ID, Producto, Categoría, Subtotal, %, Comisión
   - ✅ Categoría mostrada como badge
   - ✅ Porcentaje mostrado correctamente
   - ✅ Comisión en color verde y negrita
   - ✅ Paginación funcionando

5. **Cálculo manual de validación:**
   - Seleccionar 2-3 facturas del detalle
   - Calcular manualmente: `subtotal * (porcentaje / 100)`
   - ✅ Debe coincidir con el valor de `comision` mostrado
   - ✅ Suma de todas las comisiones debe igualar "Comisión Estimada"

### 4.2 Vista Admin

**Acceso:** `/comisiones` como admin

**Validaciones:**

1. **Header:**
   - ✅ Título: "Comisiones de Vendedores"
   - ✅ Botones: "Sincronizar Facturas", "Cargar Reglas", "Calcular Comisiones"

2. **Filtros:**
   - ✅ Dropdown de vendedor (Guille, Santi)
   - ✅ Input de período (YYYY-MM)
   - ✅ Filtros funcionando correctamente

3. **KPIs:**
   - ✅ Mismos KPIs que vista vendedor
   - ✅ Valores correctos según vendedor/período seleccionado

4. **Tabla de detalle:**
   - ✅ Misma estructura que vista vendedor
   - ✅ Datos correctos según filtros

---

## Criterios de Validación Específicos

### ✅ Solo facturas con seller Guille o Santi
- **Verificar:** En `facturas_comisiones`, todas las facturas deben tener `seller.name` === "Guille" o "Santi"
- **Verificar:** Facturas sin seller NO deben aparecer en `comisiones_mensuales`

### ✅ Facturas sin seller deben ignorarse
- **Verificar:** En logs del backend, debe aparecer: "Invoice X sin seller, ignorada"
- **Verificar:** Estas facturas NO deben estar en `facturas_comisiones`

### ✅ Categorías deben matchear correctamente
- **Ejemplo:** Producto "ABOVE Adulto Perro 20kg" debe matchear categoría "ABOVE"
- **Ejemplo:** Producto "GENERAR 20kg" debe matchear categoría "GENERAR"
- **Verificar:** En el detalle, cada producto debe tener una categoría asignada (o ninguna si no matchea)

### ✅ Total de comisión debe coincidir con cálculo manual
- Seleccionar 2-3 facturas del detalle
- Calcular manualmente: `suma(subtotal * porcentaje / 100)`
- ✅ Debe coincidir con `totalComision` mostrado

### ✅ Mensaje de advertencia visible
- ✅ Debe verse claramente: "Monto estimado – sujeto a validación administrativa"
- ✅ Debe estar en la vista vendedor
- ✅ Estilo destacado (fondo warning)

---

## Checklist de Validación

- [ ] Seed de reglas ejecutado correctamente (21 reglas)
- [ ] Sync de facturas ejecutado (facturas con seller válido)
- [ ] Cálculo de comisiones ejecutado para 2025-01
- [ ] Vista vendedor muestra datos correctos
- [ ] Vista admin muestra datos correctos
- [ ] KPIs muestran totales correctos
- [ ] Tabla de detalle muestra categoría y porcentaje
- [ ] Cálculo manual coincide con total mostrado
- [ ] Mensaje de advertencia visible y correcto
- [ ] Solo facturas con seller Guille/Santi procesadas
- [ ] Facturas sin seller ignoradas correctamente

---

## Reporte de Inconsistencias

Si encuentras alguna inconsistencia, documentar:

1. **Descripción:** Qué no funciona o está incorrecto
2. **Pasos para reproducir:** Cómo llegar al problema
3. **Resultado esperado:** Qué debería pasar
4. **Resultado actual:** Qué está pasando
5. **Datos de ejemplo:** Facturas/productos específicos afectados

---

## Notas

- No agregar nuevas features durante las pruebas
- Solo reportar inconsistencias
- Mantener logs del backend para debugging
- Verificar Firestore directamente si hay dudas

