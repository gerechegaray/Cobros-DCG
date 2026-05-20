import assert from 'node:assert/strict';
import { FORMA_PAGO_ALIASES, findAliasValue } from './aliases.js';
import { parseTelegramMessage } from './parser.js';
import { __telegramServiceTest } from './service.js';

const cobroConNota = parseTelegramMessage('cobro costa martin 150000 transferencia cancela factura 1585');
assert.equal(cobroConNota.intent, 'cobro');
assert.equal(cobroConNota.clienteQuery, 'costa martin');
assert.equal(cobroConNota.monto, 150000);
assert.equal(cobroConNota.formaPago, 'transferencia');
assert.equal(cobroConNota.notas, 'cancela factura 1585');

const cobroTypo = parseTelegramMessage('cobro costa 85k tranferencia');
assert.equal(cobroTypo.monto, 85000);
assert.equal(cobroTypo.formaPago, 'transferencia');

const cobroMp = parseTelegramMessage('cobro costa 150000 mp detalle pago por mercado pago');
assert.equal(cobroMp.formaPago, 'transferencia');
assert.equal(cobroMp.notas, 'pago por mercado pago');

const pedido = parseTelegramMessage('pedido lopez 2x producto uno 1 producto dos cc obs entregar manana');
assert.equal(pedido.intent, 'pedido');
assert.equal(pedido.condicionPago, 'cuenta_corriente');
assert.equal(pedido.items.length, 2);
assert.equal(pedido.items[0].cantidad, 2);

assert.equal(findAliasValue('tr', FORMA_PAGO_ALIASES), 'transferencia');
assert.equal(findAliasValue('tranferencia', FORMA_PAGO_ALIASES), 'transferencia');
assert.equal(findAliasValue('mp', FORMA_PAGO_ALIASES), 'transferencia');

assert.deepEqual(__telegramServiceTest.parseDraftUpdate('agregar nota, cancela factura 1585', 'cobro'), {
  type: 'note',
  mode: 'append',
  value: 'cancela factura 1585'
});
assert.deepEqual(__telegramServiceTest.parseDraftUpdate('nota recibo 123', 'cobro'), {
  type: 'note',
  mode: 'replace',
  value: 'recibo 123'
});
assert.deepEqual(__telegramServiceTest.parseDraftUpdate('forma ef', 'cobro'), {
  type: 'payment_method',
  value: 'efectivo'
});
assert.deepEqual(__telegramServiceTest.parseDraftUpdate('monto $150.000', 'cobro'), {
  type: 'amount',
  value: 150000
});
assert.deepEqual(__telegramServiceTest.parseDraftUpdate('cc', 'pedido'), {
  type: 'condition',
  value: 'cuenta_corriente'
});

console.log('Telegram self-test ok');
