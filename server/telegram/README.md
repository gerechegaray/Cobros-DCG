# Telegram bot para pedidos y cobros

Integracion paralela y apagada por defecto. No afecta el flujo web actual mientras
`TELEGRAM_BOT_ENABLED` no sea `true`.

## Variables de entorno

```txt
TELEGRAM_BOT_ENABLED=false
TELEGRAM_DRY_RUN=true
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_ALLOWED_CHAT_IDS=
TELEGRAM_PRODUCT_ALIASES=
```

- `TELEGRAM_DRY_RUN=true`: interpreta y confirma, pero no escribe en Firestore.
- `TELEGRAM_ALLOWED_CHAT_IDS`: lista separada por comas; si esta vacia no filtra por chat.
- `TELEGRAM_PRODUCT_ALIASES`: JSON o pares `alias=valor;alias2=valor2`.

## Usuarios autorizados

Crear documentos manuales en Firestore:

```js
telegramUsers/{telegramId} = {
  telegramId: "123456",
  email: "santi@dcg.com",
  name: "Santi",
  role: "Santi",
  activo: true
}
```

## Aliases de productos

Opcionalmente crear documentos:

```js
telegramAliases/{id} = {
  tipo: "producto", // tambien acepta type: "producto"
  alias: "op adulto",
  valor: "old prince adulto" // tambien acepta value: "old prince adulto"
}
```

## Endpoints

- `GET /api/telegram/status`
- `POST /api/telegram/webhook`

Si se configura `TELEGRAM_WEBHOOK_SECRET`, Telegram debe enviar el header
`X-Telegram-Bot-Api-Secret-Token`.

## Ejemplos

El vendedor debe empezar el mensaje con la accion: `pedido`, `cobro` u otra
funcion futura.

```txt
pedido lopez
2 old prince adulto 20kg
1 pipeta chica
cc
obs entregar manana
```

Tambien se pueden mandar varios pedidos en un solo mensaje. Cada pedido empieza
con una linea de cliente + condicion de pago, y debajo van sus productos:

```txt
pedido
Magdalena contado
2 op premium gato ad x7
Videla contado
2 op premium cachorro 15kg
1 op premium perro ad x20
Muro cuenta corriente
1 op eq cachorro rp x7kg
1 op eq rp ad x15kg
```

```txt
cobro lopez 85000 tr obs pago parcial
```

El bot siempre pide `CONFIRMAR` antes de guardar.

## Reglas v1

Abreviaturas de cobros:

- `ef`, `efe`, `efec`, `efectivo`, `cash` -> `efectivo`
- `tr`, `trans`, `transf`, `transfe`, `transfer`, `transferencia`, `tranferencia`, `banco`, `bco`, `mp`, `mercado pago` -> `transferencia`
- `ch`, `che`, `cheq`, `cheque` -> `cheque`
- `otro`, `otros` -> `otro`

Abreviaturas de pedidos:

- `cc`, `c/c`, `cta cte`, `ctacte`, `cuenta corriente` -> `cuenta_corriente`
- `cont`, `contado`, `de contado` -> `contado`
- En productos se normalizan variantes como `op`, `eq`, `rp`, `rg`, `c.a`,
  `ad`, `cach`, `x7`, `x7kg`, `x 7,5kg`, `caja`, `cajas`.
- Hay aliases internos para los productos frecuentes de Old Prince, Equilibrium,
  Seguidor, Simparica, Defender Top, Curabigen Plata y Acá No.

Antes de confirmar se puede corregir el borrador:

- `agregar nota cancela factura 1585`
- `nota recibo 123`
- `sin nota`
- `monto 150000`
- `forma tr`
- `pago ef`
- `cc` o `contado` en pedidos
