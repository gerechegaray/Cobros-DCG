import { findAliasValue, FORMA_PAGO_ALIASES } from './aliases.js';
import { getProductAliases, getProductosCatalogo, getClientesAsignados, getTelegramUser, resolveCliente, resolveProducto } from './catalog.js';
import { formatCurrency, getClienteNombre, normalizeText } from './normalization.js';
import { parseTelegramMessage } from './parser.js';
import { clearSession, getSession, saveSession } from './sessions.js';
import { sendTelegramMessage } from './telegramApi.js';
import { crearCobroDesdeTelegram, crearPedidoDesdeTelegram } from './writer.js';

export async function processTelegramUpdate({ adminDb, config, update }) {
  const message = update?.message || update?.edited_message;
  const chatId = message?.chat?.id;
  const telegramId = message?.from?.id;
  const text = message?.text;

  if (!chatId || !telegramId) return { processed: false, reason: 'missing_chat_or_user' };
  if (!config.enabled) return { processed: false, reason: 'disabled' };
  if (config.allowedChatIds.size > 0 && !config.allowedChatIds.has(String(chatId))) {
    return sendAndReturn(config, chatId, 'Bot en prueba privada. Este chat no esta habilitado.', 'chat_not_allowed');
  }
  if (!text) {
    return sendAndReturn(config, chatId, 'Por ahora solo puedo procesar mensajes de texto.', 'non_text');
  }

  const user = await getTelegramUser(adminDb, telegramId);
  if (!user) {
    return sendAndReturn(
      config,
      chatId,
      `Usuario no autorizado.\nTu Telegram ID es: ${telegramId}\nPedile al admin que lo cargue en telegramUsers.`,
      'user_not_allowed'
    );
  }

  const currentSession = await getSession(adminDb, telegramId);
  const normalized = normalizeText(text);

  if (['cancelar', 'cancela', '/cancelar'].includes(normalized)) {
    await clearSession(adminDb, telegramId);
    return sendAndReturn(config, chatId, 'Operacion cancelada.', 'cancelled');
  }

  if (normalized === 'resumen') {
    if (!currentSession) return sendAndReturn(config, chatId, 'No hay ningun borrador activo.', 'no_session');
    return sendAndReturn(config, chatId, renderSessionSummary(currentSession), 'summary');
  }

  if (['confirmar', 'confirma', 'ok', 'si'].includes(normalized)) {
    return confirmSession({ adminDb, config, chatId, telegramId, user, session: currentSession });
  }

  if (currentSession && isNumericSelection(normalized)) {
    return applySelection({ adminDb, config, chatId, telegramId, user, session: currentSession, selectedNumber: Number(normalized) });
  }

  if (currentSession?.step === 'awaiting_forma_pago') {
    const formaPago = findAliasValue(text, FORMA_PAGO_ALIASES);
    if (!formaPago) {
      return sendAndReturn(config, chatId, 'Falta forma de pago: ef, tr, ch u otro.', 'missing_payment_method');
    }

    const result = await buildDraft({
      adminDb,
      config,
      user,
      parsed: { ...currentSession.parsed, formaPago },
      context: { selectedClient: currentSession.selectedClient }
    });
    await persistBuildResult({ adminDb, config, telegramId, result });
    return sendAndReturn(config, chatId, result.message, result.reason || 'payment_method_applied');
  }

  const parsed = parseTelegramMessage(text);
  if (parsed.intent === 'command') return handleCommand({ adminDb, config, chatId, telegramId, user, command: parsed.command });
  if (!parsed.intent) return sendAndReturn(config, chatId, renderHelp(), 'unknown_intent');

  if (parsed.intent === 'pedido' || parsed.intent === 'cobro') {
    if (currentSession) await clearSession(adminDb, telegramId);
    const result = await buildDraft({ adminDb, config, user, parsed });
    await persistBuildResult({ adminDb, config, telegramId, result });
    return sendAndReturn(config, chatId, result.message, result.reason || 'draft');
  }

  return sendAndReturn(config, chatId, renderHelp(), 'ignored');
}

async function handleCommand({ adminDb, config, chatId, telegramId, user, command }) {
  if (command === '/ayuda' || command === '/start') {
    return sendAndReturn(config, chatId, renderHelp(), 'help');
  }

  if (command === '/misdatos') {
    return sendAndReturn(
      config,
      chatId,
      `Telegram ID: ${telegramId}\nUsuario: ${user.name || user.email}\nEmail: ${user.email}\nRol: ${user.role}`,
      'my_data'
    );
  }

  if (command === '/estado') {
    const session = await getSession(adminDb, telegramId);
    const state = session ? renderSessionSummary(session) : 'No hay ningun borrador activo.';
    return sendAndReturn(config, chatId, state, 'status');
  }

  return sendAndReturn(config, chatId, renderHelp(), 'unknown_command');
}

async function confirmSession({ adminDb, config, chatId, telegramId, user, session }) {
  if (!session || session.step !== 'confirming' || !session.draft) {
    return sendAndReturn(config, chatId, 'No hay un borrador listo para confirmar.', 'nothing_to_confirm');
  }

  if (config.dryRun) {
    await clearSession(adminDb, telegramId);
    return sendAndReturn(
      config,
      chatId,
      `DRY RUN activo: no guarde nada.\n\n${renderFinalSummary(session.intent, session.draft)}`,
      'dry_run_confirmed'
    );
  }

  const saved =
    session.intent === 'pedido'
      ? await crearPedidoDesdeTelegram(adminDb, session.draft, user)
      : await crearCobroDesdeTelegram(adminDb, session.draft, user);

  await clearSession(adminDb, telegramId);
  return sendAndReturn(config, chatId, `Guardado correctamente.\nID: ${saved.id}`, 'saved');
}

async function applySelection({ adminDb, config, chatId, telegramId, user, session, selectedNumber }) {
  if (!session || !['resolving_cliente', 'resolving_producto'].includes(session.step)) {
    return sendAndReturn(config, chatId, 'No hay una seleccion pendiente.', 'no_selection_pending');
  }

  const selected = session.options?.[selectedNumber - 1];
  if (!selected) {
    return sendAndReturn(config, chatId, `Opcion invalida. Responde un numero entre 1 y ${session.options?.length || 0}.`, 'invalid_selection');
  }

  const context = {
    selectedClient: session.selectedClient || null,
    selectedProducts: session.selectedProducts || {}
  };

  if (session.step === 'resolving_cliente') {
    context.selectedClient = selected.entity;
  }

  if (session.step === 'resolving_producto') {
    context.selectedProducts[String(session.pendingProductIndex)] = selected.entity;
  }

  const result = await buildDraft({ adminDb, config, user, parsed: session.parsed, context });
  await persistBuildResult({ adminDb, config, telegramId, result });
  return sendAndReturn(config, chatId, result.message, result.reason || 'selection_applied');
}

async function buildDraft({ adminDb, config, user, parsed, context = {} }) {
  const clientes = await getClientesAsignados(adminDb, user);
  const clientResolution = context.selectedClient
    ? { status: 'matched', entity: context.selectedClient }
    : resolveCliente(parsed.clienteQuery, clientes);

  if (clientResolution.status === 'missing') {
    return { message: 'Falta indicar el cliente.', reason: 'missing_client' };
  }
  if (clientResolution.status === 'not_found') {
    return { message: `No encontre cliente para "${parsed.clienteQuery}". Proba con mas datos.`, reason: 'client_not_found' };
  }
  if (clientResolution.status === 'ambiguous') {
    return buildSelectionResult({
      intent: parsed.intent,
      step: 'resolving_cliente',
      parsed,
      options: clientResolution.matches.map((match) => ({ entity: compactCliente(match.entity), label: getClienteNombre(match.entity) })),
      messageTitle: `Encontre varios clientes para "${parsed.clienteQuery}":`
    });
  }

  const selectedClient = compactCliente(clientResolution.entity);

  if (parsed.intent === 'cobro') {
    if (!parsed.monto || parsed.monto <= 0) return { message: 'Falta un monto valido para el cobro.', reason: 'missing_amount' };
    if (!parsed.formaPago) {
      return {
        intent: 'cobro',
        step: 'awaiting_forma_pago',
        parsed,
        selectedClient,
        message: 'Falta forma de pago: ef, tr, ch u otro.',
        reason: 'missing_payment_method'
      };
    }

    const draft = {
      cliente: selectedClient,
      monto: Number(parsed.monto),
      formaPago: parsed.formaPago,
      fechaCobro: new Date(),
      notas: parsed.notas || ''
    };

    return {
      intent: 'cobro',
      step: 'confirming',
      parsed,
      draft,
      message: `${renderFinalSummary('cobro', draft)}\n\nResponde CONFIRMAR o CANCELAR.`,
      reason: 'cobro_ready'
    };
  }

  if (!parsed.items || parsed.items.length === 0) {
    return { message: 'Falta agregar al menos un producto con cantidad.', reason: 'missing_products' };
  }

  const productosCatalogo = await getProductosCatalogo(adminDb);
  const aliases = await getProductAliases(adminDb, config);
  const selectedProducts = context.selectedProducts || {};
  const productos = [];

  for (let index = 0; index < parsed.items.length; index++) {
    const item = parsed.items[index];
    if (!item.cantidad || item.cantidad <= 0) {
      return { message: `Cantidad invalida en producto ${index + 1}.`, reason: 'invalid_quantity' };
    }

    const selectedProduct = selectedProducts[String(index)];
    const productResolution = selectedProduct
      ? { status: 'matched', entity: selectedProduct }
      : resolveProducto(item.productoQuery, productosCatalogo, aliases);

    if (productResolution.status === 'not_found' || productResolution.status === 'missing') {
      return { message: `No encontre producto para "${item.productoQuery}".`, reason: 'product_not_found' };
    }

    if (productResolution.status === 'ambiguous') {
      return buildSelectionResult({
        intent: 'pedido',
        step: 'resolving_producto',
        parsed,
        selectedClient,
        selectedProducts,
        pendingProductIndex: index,
        options: productResolution.matches.map((match) => ({ entity: match.entity, label: `${match.entity.nombre} (${match.entity.codigo})` })),
        messageTitle: `Encontre varios productos para "${item.productoQuery}":`
      });
    }

    const producto = productResolution.entity;
    const descuento = clampDiscount(item.descuento || 0);
    const total = item.cantidad * producto.precio * (1 - descuento / 100);
    productos.push({
      id: producto.id,
      nombre: producto.nombre,
      codigo: producto.codigo,
      cantidad: item.cantidad,
      precioUnitario: producto.precio,
      descuento,
      total,
      observaciones: '',
      sinStock: (producto.stock || 0) <= 0
    });
  }

  const total = productos.reduce((sum, producto) => sum + (producto.total || 0), 0);
  const draft = {
    cliente: selectedClient,
    fechaPedido: new Date(),
    condicionPago: parsed.condicionPago || 'contado',
    productos,
    total,
    observaciones: parsed.observaciones || ''
  };

  return {
    intent: 'pedido',
    step: 'confirming',
    parsed,
    draft,
    message: `${renderFinalSummary('pedido', draft)}\n\nResponde CONFIRMAR o CANCELAR.`,
    reason: 'pedido_ready'
  };
}

async function persistBuildResult({ adminDb, config, telegramId, result }) {
  if (!result.step) return;
  await saveSession(
    adminDb,
    telegramId,
    {
      intent: result.intent,
      step: result.step,
      parsed: result.parsed,
      draft: result.draft || null,
      selectedClient: result.selectedClient || result.draft?.cliente || null,
      selectedProducts: result.selectedProducts || null,
      pendingProductIndex: result.pendingProductIndex ?? null,
      options: result.options || null
    },
    config.sessionTtlMs
  );
}

function buildSelectionResult({ intent, step, parsed, options, messageTitle, selectedClient = null, selectedProducts = null, pendingProductIndex = null }) {
  return {
    intent,
    step,
    parsed,
    selectedClient,
    selectedProducts,
    pendingProductIndex,
    options,
    message: `${messageTitle}\n${renderOptions(options)}\n\nResponde con el numero correcto o CANCELAR.`,
    reason: step
  };
}

function compactCliente(cliente) {
  return {
    id: String(cliente.id),
    nombre: getClienteNombre(cliente)
  };
}

function renderOptions(options) {
  return options.map((option, index) => `${index + 1}. ${option.label}`).join('\n');
}

function renderSessionSummary(session) {
  if (session.step === 'confirming' && session.draft) {
    return `${renderFinalSummary(session.intent, session.draft)}\n\nResponde CONFIRMAR o CANCELAR.`;
  }
  if (session.options) {
    return `${renderOptions(session.options)}\n\nResponde con el numero correcto o CANCELAR.`;
  }
  return 'Hay un borrador activo, pero todavia no esta listo para confirmar.';
}

function renderFinalSummary(intent, draft) {
  if (intent === 'cobro') {
    return [
      'Resumen de cobro:',
      `Cliente: ${draft.cliente.nombre}`,
      `Monto: ${formatCurrency(draft.monto)}`,
      `Forma: ${draft.formaPago}`,
      `Notas: ${draft.notas || '-'}`
    ].join('\n');
  }

  return [
    'Resumen de pedido:',
    `Cliente: ${draft.cliente.nombre}`,
    `Condicion: ${draft.condicionPago}`,
    `Productos:`,
    ...draft.productos.map((producto) => {
      const discount = producto.descuento ? ` - desc ${producto.descuento}%` : '';
      const stock = producto.sinStock ? ' - sin stock' : '';
      return `- ${producto.cantidad} x ${producto.nombre} (${producto.codigo}) ${formatCurrency(producto.precioUnitario)}${discount} = ${formatCurrency(producto.total)}${stock}`;
    }),
    `Total: ${formatCurrency(draft.total)}`,
    `Obs: ${draft.observaciones || '-'}`
  ].join('\n');
}

function renderHelp() {
  return [
    'Bot DCG - comandos:',
    '',
    'Pedido:',
    'pedido lopez',
    '2 producto uno',
    '1 producto dos',
    'cc',
    'obs entregar manana',
    '',
    'Cobro:',
    'cobro lopez 85000 tr obs pago parcial',
    '',
    'Comandos: /misdatos, /estado, resumen, confirmar, cancelar'
  ].join('\n');
}

function isNumericSelection(text) {
  return /^\d+$/.test(text);
}

function clampDiscount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

async function sendAndReturn(config, chatId, message, reason) {
  await sendTelegramMessage(config, chatId, message);
  return { processed: true, reason, message };
}
