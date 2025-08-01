# Filtro de Facturas Excluidas

## Descripción

Se ha implementado un filtro automático para excluir las facturas con estados `"void"` (anuladas), `"closed"` (cerradas) y `"paid"` (pagadas) tanto en el **Estado de Cuenta** como en el menú **Facturas/Envíos**.

## Implementación

### Backend

            #### 1. Endpoint de Estado de Cuenta (`server/app.js:673-772`)
            ```javascript
            // 🆕 Filtrar facturas anuladas, cerradas y pagadas (status: "void", "closed", "paid")
            const facturasValidas = facturasDelCliente.filter(factura => {
              const estadosExcluidos = ["void", "closed", "paid"];
              const esValida = !estadosExcluidos.includes(factura.status);
              if (!esValida) {
                console.log(`[ESTADO CUENTA] Excluyendo factura: ID ${factura.id}, Número ${factura.number}, Status: ${factura.status}`);
              }
              return esValida;
            });
            ```

            #### 2. Servicio de Alegra (`server/alegraService.js`)
            ```javascript
            // 🆕 Filtrar facturas anuladas, cerradas y pagadas (status: "void", "closed", "paid")
            const facturasSinAnuladas = facturasFiltradas.filter(factura => {
              const estadosExcluidos = ["void", "closed", "paid"];
              const esValida = !estadosExcluidos.includes(factura.status);
              if (!esValida) {
                console.log(`🆕 Excluyendo factura: ID ${factura.id}, Número ${factura.number}, Status: ${factura.status}`);
              }
              return esValida;
            });
            ```

### Frontend

            #### 1. Estado de Cuenta (`src/features/clientes/EstadoCuenta.jsx`)
            - Muestra notificación informativa sobre el filtro
            - Mensaje: "Se muestran X facturas válidas. Las facturas anuladas, cerradas y pagadas han sido excluidas automáticamente."

            #### 2. Facturas/Envíos (`src/features/facturas/FacturasAlegra.jsx`)
            - Logs informativos en consola sobre el filtro aplicado
            - Muestra el status de cada factura en los logs

            ## Estados de Alegra

            ### Estados Válidos
            - `"open"` - Factura abierta/pendiente ✅

            ### Estados Excluidos
            - `"void"` - Factura anulada ❌
            - `"closed"` - Factura cerrada/pagada ❌
            - `"paid"` - Factura pagada ❌

## Beneficios

1. **Datos más limpios**: No se muestran facturas que no existen comercialmente o ya están pagadas
2. **Cálculos precisos**: Los totales no incluyen facturas anuladas, cerradas o pagadas
3. **Experiencia de usuario mejorada**: No confunde con facturas que no deben considerarse
4. **Logs informativos**: Permite rastrear qué facturas se están excluyendo

## Logs de Debug

### Backend
```
[ESTADO CUENTA] Excluyendo factura: ID 6, Número 00001-00000006, Status: void
[ESTADO CUENTA] Excluyendo factura: ID 7, Número 00001-00000007, Status: closed
[ESTADO CUENTA] Facturas válidas (sin anuladas/cerradas/pagadas): 1 de 3
```

### Frontend
```
🆕 Frontend: Se muestran solo facturas válidas (las anuladas, cerradas y pagadas han sido excluidas automáticamente)
```

## Ubicaciones Afectadas

1. **Estado de Cuenta**: `/estado-cuenta`
2. **Facturas/Envíos**: `/facturas`
3. **Dashboard**: Estadísticas de facturas

## Consideraciones

- El filtro se aplica automáticamente sin opción de desactivarlo
- Las facturas anuladas, cerradas y pagadas siguen existiendo en Alegra pero no se muestran en la aplicación
- Los logs permiten auditoría de qué facturas se están excluyendo
- No afecta el rendimiento ya que el filtro es simple y eficiente 