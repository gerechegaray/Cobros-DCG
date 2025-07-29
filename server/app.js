// server/app.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

// Importo el servicio de Alegra
import { getAlegraInvoices, getAlegraContacts, getAlegraItems } from "./alegraService.js";
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializar Firebase Admin si no está inicializado
if (!global._firebaseAdminInitialized) {
  initializeApp({
    credential: applicationDefault(),
  });
  global._firebaseAdminInitialized = true;
}
const adminDb = getFirestore();

// 🆕 CACHE COMPARTIDO - Configuración
const cacheCompartido = {
  clientes: null,
  productos: null,
  ultimaActualizacion: {
    clientes: null,
    productos: null
  },
  ttl: {
    clientes: 7 * 24 * 60 * 60 * 1000,    // 7 días
    productos: 12 * 60 * 60 * 1000         // 12 horas
  }
};

// 🆕 Función para verificar si el cache expiró
function cacheExpiro(tipo) {
  if (!cacheCompartido.ultimaActualizacion[tipo]) return true;
  
  const ahora = Date.now();
  const tiempoTranscurrido = ahora - cacheCompartido.ultimaActualizacion[tipo];
  return tiempoTranscurrido > cacheCompartido.ttl[tipo];
}

// 🆕 Función para obtener tiempo transcurrido en formato legible
function getTiempoTranscurrido(timestamp) {
  const ahora = Date.now();
  const diferencia = ahora - timestamp;
  
  const minutos = Math.floor(diferencia / (1000 * 60));
  const horas = Math.floor(diferencia / (1000 * 60 * 60));
  const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
  
  if (dias > 0) return `${dias} día(s)`;
  if (horas > 0) return `${horas} hora(s)`;
  return `${minutos} minuto(s)`;
}

// 🆕 Función para obtener estado del cache
function getEstadoCache() {
  const ahora = Date.now();
  const estado = {};
  
  ['clientes', 'productos'].forEach(tipo => {
    if (cacheCompartido[tipo]) {
      const tiempoTranscurrido = ahora - cacheCompartido.ultimaActualizacion[tipo];
      const tiempoRestante = cacheCompartido.ttl[tipo] - tiempoTranscurrido;
      const expiraEn = getTiempoTranscurrido(ahora - tiempoRestante);
      
      estado[tipo] = {
        tieneDatos: true,
        ultimaActualizacion: new Date(cacheCompartido.ultimaActualizacion[tipo]).toLocaleString(),
        expiraEn: tiempoRestante > 0 ? expiraEn : 'EXPIRADO',
        registros: cacheCompartido[tipo].length,
        tiempoTranscurrido: getTiempoTranscurrido(cacheCompartido.ultimaActualizacion[tipo])
      };
    } else {
      estado[tipo] = {
        tieneDatos: false,
        ultimaActualizacion: 'Nunca',
        expiraEn: 'N/A',
        registros: 0,
        tiempoTranscurrido: 'N/A'
      };
    }
  });
  
  return estado;
}

// 🆕 Función para invalidar cache
function invalidarCache(tipo) {
  cacheCompartido[tipo] = null;
  cacheCompartido.ultimaActualizacion[tipo] = null;
  console.log(`🗑️ Cache de ${tipo} invalidado manualmente`);
}

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint para obtener facturas de venta de Alegra
app.get("/api/alegra/invoices", async (req, res) => {
  try {
    const facturas = await getAlegraInvoices();
    res.json(facturas);
  } catch (error) {
    console.error("Error al obtener facturas de Alegra:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener clientes de Alegra
app.get("/api/alegra/contacts", async (req, res) => {
  try {
    const email = process.env.ALEGRA_EMAIL?.trim();
    const apiKey = process.env.ALEGRA_API_KEY?.trim();
    const url = 'https://api.alegra.com/api/v1/contacts';
    const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        authorization
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: errorText });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener productos (items) de Alegra
app.get("/api/alegra/items", async (req, res) => {
  try {
    const email = process.env.ALEGRA_EMAIL?.trim();
    const apiKey = process.env.ALEGRA_API_KEY?.trim();
    const url = 'https://api.alegra.com/api/v1/items';
    const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        authorization
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: errorText });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para crear un presupuesto en Alegra y guardar en Firestore
app.post("/api/alegra/quotes", async (req, res) => {
  try {
    const { clienteId, items, observaciones, usuario, fechaCreacion, vendedor } = req.body;
    const email = process.env.ALEGRA_EMAIL?.trim();
    const apiKey = process.env.ALEGRA_API_KEY?.trim();
    const url = 'https://api.alegra.com/api/v1/estimates'; // CORREGIDO
    const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
    // Forzar dueDate como string YYYY-MM-DD
    let dueDate = req.body.dueDate;
    if (dueDate instanceof Date) {
      dueDate = dueDate.toISOString().slice(0, 10);
    } else if (typeof dueDate === 'object' && dueDate !== null && dueDate.toISOString) {
      dueDate = dueDate.toISOString().slice(0, 10);
    }
    // Construir el body para Alegra
    const alegraBody = {
      client: clienteId,
      items: items.map(item => ({
        id: item.producto,
        quantity: item.cantidad,
        price: item.price
      })),
      observations: observaciones || '',
      dueDate: dueDate || '',
    };
    if (fechaCreacion) alegraBody.date = fechaCreacion;
    if (vendedor) alegraBody.seller = vendedor;
    // LOGS para depuración
    console.log('Enviando a Alegra:', JSON.stringify(alegraBody, null, 2));
    // Crear presupuesto en Alegra
    const alegraRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        authorization
      },
      body: JSON.stringify(alegraBody)
    });
    const alegraText = await alegraRes.text();
    console.log('Respuesta de Alegra:', alegraText);
    if (!alegraRes.ok) {
      return res.status(500).json({ error: alegraText });
    }
    const alegraQuote = JSON.parse(alegraText);
    // Guardar en Firestore
    await adminDb.collection('presupuestos').add({
      idAlegra: alegraQuote.id,
      clienteId,
      items,
      observaciones,
      usuario,
      estado: 'pendiente',
      fechaCreacion: fechaCreacion ? new Date(fechaCreacion) : new Date(),
      vendedor: vendedor || null
    });
    res.json({ success: true, alegraQuote });
  } catch (error) {
    console.error('Error en /api/alegra/quotes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Nuevo endpoint para crear presupuesto: primero en Firestore, luego en Alegra
app.post("/api/presupuestos", async (req, res) => {
  console.log('Entrando a /api/presupuestos');
  try {
    const { clienteId, items, observaciones, usuario, fechaCreacion, vendedor, condicion, dueDate } = req.body;
    // 1. Crear en Firestore con estado pendiente-alegra
    const docRef = await adminDb.collection('presupuestos').add({
      clienteId,
      items,
      observaciones,
      usuario,
      estado: 'pendiente-alegra',
      fechaCreacion: fechaCreacion ? new Date(fechaCreacion) : new Date(),
      vendedor: vendedor || null,
      condicion: condicion || null,
      dueDate: dueDate || null,
      idAlegra: null
    });
    let alegraQuote = null;
    let alegraError = null;
    // 2. Intentar crear en Alegra
    try {
      const email = process.env.ALEGRA_EMAIL?.trim();
      const apiKey = process.env.ALEGRA_API_KEY?.trim();
      const url = 'https://api.alegra.com/api/v1/estimates';
      const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
      const alegraBody = {
        client: clienteId,
        items: items.map(item => ({
          id: item.producto,
          quantity: item.cantidad,
          price: item.price
        })),
        observations: observaciones || '',
        dueDate: dueDate || '',
      };
      if (fechaCreacion) alegraBody.date = fechaCreacion;
      if (vendedor) alegraBody.seller = vendedor;
      const alegraRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          authorization
        },
        body: JSON.stringify(alegraBody)
      });
      const alegraText = await alegraRes.text();
      if (!alegraRes.ok) throw new Error(alegraText);
      alegraQuote = JSON.parse(alegraText);
      // 3. Si sale bien, actualizar doc con idAlegra y estado pendiente
      await docRef.update({ idAlegra: alegraQuote.id, estado: 'pendiente' });
    } catch (err) {
      alegraError = err.message || String(err);
      // Si falla, dejar estado como pendiente-alegra y guardar error
      await docRef.update({ alegraError });
    }
    // Responder con el doc de Firestore y el resultado de Alegra (si hay)
    const doc = await docRef.get();
    res.json({ success: true, presupuesto: { id: doc.id, ...doc.data() }, alegraQuote, alegraError });
  } catch (error) {
    console.error('Error en /api/presupuestos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener todos los presupuestos guardados en Firestore, filtrando por usuario y rol
app.get("/api/presupuestos", async (req, res) => {
  console.log('Entrando a /api/presupuestos');
  try {
    const { email, role } = req.query;
    let query = adminDb.collection('presupuestos').orderBy('fechaCreacion', 'desc');
    let snapshot;
    if (role === 'admin') {
      snapshot = await query.get();
    } else {
      // Solo ver los propios pendientes y todos los facturados
      const all = await query.get();
      const data = all.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtrados = data.filter(p => p.estado === 'facturado' || p.usuario === email);
      return res.json(filtrados);
    }
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(data);
  } catch (error) {
    console.error('Error en /api/presupuestos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para consultar el estado de un presupuesto en Alegra
app.get("/api/alegra/quote-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const email = process.env.ALEGRA_EMAIL?.trim();
    const apiKey = process.env.ALEGRA_API_KEY?.trim();
    const url = `https://api.alegra.com/api/v1/estimates/${id}`;
    const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        authorization
      }
    });
    if (response.status === 404) {
      return res.json({ notFound: true });
    }
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: errorText });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para actualizar el estado de un presupuesto en Firestore
app.patch("/api/presupuestos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    await adminDb.collection('presupuestos').doc(id).update({ estado });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para eliminar un presupuesto de Firestore
app.delete("/api/presupuestos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await adminDb.collection('presupuestos').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para sincronizar todos los contactos de Alegra a Firestore
app.post("/api/sync-clientes-alegra", async (req, res) => {
  try {
    const email = process.env.ALEGRA_EMAIL?.trim();
    const apiKey = process.env.ALEGRA_API_KEY?.trim();
    const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
    let page = 1;
    let hasMore = true;
    let total = 0;
    while (hasMore) {
      const url = `https://api.alegra.com/api/v1/contacts?start=${(page - 1) * 30}`;
      const response = await fetch(url, {
        headers: {
          accept: 'application/json',
          authorization
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(500).json({ error: errorText });
      }
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        hasMore = false;
      } else {
        // Guardar/actualizar en Firestore
        for (const cliente of data) {
          await adminDb.collection('clientesAlegra').doc(cliente.id.toString()).set(cliente, { merge: true });
          total++;
        }
        page++;
        if (data.length < 30) hasMore = false;
      }
    }
    res.json({ success: true, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para consultar los clientes desde Firestore
app.get("/api/clientes-firebase", async (req, res) => {
  console.log('🔄 Entrando a /api/clientes-firebase');
  
  try {
    // 🆕 Verificar cache compartido
    if (cacheCompartido.clientes && !cacheExpiro('clientes')) {
      console.log('📦 Sirviendo clientes desde cache compartido');
      console.log(`👥 Dispositivos que usan este cache: múltiples`);
      console.log(`⏰ Última actualización: ${getTiempoTranscurrido(cacheCompartido.ultimaActualizacion.clientes)}`);
      console.log(`📊 Registros en cache: ${cacheCompartido.clientes.length}`);
      
      return res.json(cacheCompartido.clientes);
    }
    
    // 🆕 Si no hay cache o expiró, cargar desde Firebase
    console.log('🔄 Cache expirado o no existe, cargando clientes desde Firebase...');
    const snapshot = await adminDb.collection('clientesAlegra').get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // 🆕 Guardar en cache compartido
    cacheCompartido.clientes = data;
    cacheCompartido.ultimaActualizacion.clientes = Date.now();
    
    console.log(`✅ Cache compartido actualizado para todos los dispositivos`);
    console.log(`📊 Registros cargados: ${data.length}`);
    console.log(`⏰ Próxima actualización en: 7 días`);
    
    res.json(data);
  } catch (error) {
    console.error('❌ Error en /api/clientes-firebase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para sincronizar todos los productos de Alegra a Firestore
app.post("/api/sync-productos-alegra", async (req, res) => {
  try {
    const email = process.env.ALEGRA_EMAIL?.trim();
    const apiKey = process.env.ALEGRA_API_KEY?.trim();
    const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
    let page = 1;
    let hasMore = true;
    let total = 0;
    while (hasMore) {
      const url = `https://api.alegra.com/api/v1/items?start=${(page - 1) * 30}`;
      const response = await fetch(url, {
        headers: {
          accept: 'application/json',
          authorization
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(500).json({ error: errorText });
      }
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        hasMore = false;
      } else {
        // Guardar/actualizar en Firestore
        for (const producto of data) {
          await adminDb.collection('productosAlegra').doc(producto.id.toString()).set(producto, { merge: true });
          total++;
        }
        page++;
        if (data.length < 30) hasMore = false;
      }
    }
    res.json({ success: true, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para consultar los productos desde Firestore
app.get("/api/productos-firebase", async (req, res) => {
  console.log('🔄 Entrando a /api/productos-firebase');
  
  try {
    // 🆕 Verificar cache compartido
    if (cacheCompartido.productos && !cacheExpiro('productos')) {
      console.log('📦 Sirviendo productos desde cache compartido');
      console.log(`👥 Dispositivos que usan este cache: múltiples`);
      console.log(`⏰ Última actualización: ${getTiempoTranscurrido(cacheCompartido.ultimaActualizacion.productos)}`);
      console.log(`📊 Registros en cache: ${cacheCompartido.productos.length}`);
      
      return res.json(cacheCompartido.productos);
    }
    
    // 🆕 Si no hay cache o expiró, cargar desde Firebase
    console.log('🔄 Cache expirado o no existe, cargando productos desde Firebase...');
    const snapshot = await adminDb.collection('productosAlegra').get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // 🆕 Guardar en cache compartido
    cacheCompartido.productos = data;
    cacheCompartido.ultimaActualizacion.productos = Date.now();
    
    console.log(`✅ Cache compartido actualizado para todos los dispositivos`);
    console.log(`📊 Registros cargados: ${data.length}`);
    console.log(`⏰ Próxima actualización en: 12 horas`);
    
    res.json(data);
  } catch (error) {
    console.error('❌ Error en /api/productos-firebase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener el estado de cuenta de un cliente específico
app.get("/api/alegra/estado-cuenta/:clienteId", async (req, res) => {
  try {
    const { clienteId } = req.params;
    const email = process.env.ALEGRA_EMAIL?.trim();
    const apiKey = process.env.ALEGRA_API_KEY?.trim();
    const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
    
    console.log(`[ESTADO CUENTA] Cliente ID solicitado: ${clienteId}`);
    
    // Primero obtener información del cliente para verificar que existe
    const clienteUrl = `https://api.alegra.com/api/v1/contacts/${clienteId}`;
    console.log(`[ESTADO CUENTA] Consultando cliente: ${clienteUrl}`);
    
    const clienteResponse = await fetch(clienteUrl, {
      headers: {
        accept: 'application/json',
        authorization
      }
    });
    
    let clienteInfo = null;
    if (clienteResponse.ok) {
      clienteInfo = await clienteResponse.json();
      console.log(`[ESTADO CUENTA] Cliente encontrado:`, clienteInfo.name || clienteInfo.organization);
    } else {
      console.log(`[ESTADO CUENTA] Cliente no encontrado en Alegra`);
    }
    
    // Obtener facturas específicas del cliente usando el parámetro client_id (según documentación oficial)
    const facturasUrl = `https://api.alegra.com/api/v1/invoices?client_id=${clienteId}`;
    console.log(`[ESTADO CUENTA] Consultando facturas del cliente: ${facturasUrl}`);
    
    const facturasResponse = await fetch(facturasUrl, {
      headers: {
        accept: 'application/json',
        authorization
      }
    });
    
    if (!facturasResponse.ok) {
      const errorText = await facturasResponse.text();
      console.error(`[ESTADO CUENTA] Error de Alegra: ${errorText}`);
      return res.status(500).json({ error: errorText });
    }
    
    const facturasDelCliente = await facturasResponse.json();
    console.log(`[ESTADO CUENTA] Facturas del cliente ${clienteId}: ${facturasDelCliente.length}`);
    
    console.log(`[ESTADO CUENTA] Facturas obtenidas:`, facturasDelCliente.map(f => ({ 
      numero: f.number, 
      client: f.client,
      clientName: f.clientName 
    })));
    
    // Transformar los datos al formato esperado por el frontend
    const boletas = facturasDelCliente.map(factura => {
      // Calcular el total de pagos asociados (solo payments.amount)
      const pagosAsociados = factura.payments || [];
      const montoPagado = pagosAsociados.reduce((sum, pago) => sum + (pago.amount || 0), 0);
      const montoTotal = factura.total || 0;
      const montoAdeudado = montoTotal - montoPagado;
      return {
        numero: factura.number || factura.id,
        fechaEmision: factura.date,
        fechaVencimiento: factura.dueDate,
        montoTotal: montoTotal,
        montoPagado: montoPagado,
        montoAdeudado: montoAdeudado,
        estado: montoPagado >= montoTotal ? 'PAGADO' : 
                new Date(factura.dueDate) < new Date() ? 'VENCIDO' : 'PENDIENTE',
        pagos: pagosAsociados,
        clienteNombre: factura.clientName || (clienteInfo ? clienteInfo.name || clienteInfo.organization : 'Cliente no identificado')
      };
    });
    
    console.log(`[ESTADO CUENTA] Boletas procesadas: ${boletas.length}`);
    res.json(boletas);
  } catch (error) {
    console.error('Error al obtener estado de cuenta:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para sincronizar estados de presupuestos con Alegra (manual)
app.post("/api/sync-estados-presupuestos", async (req, res) => {
  try {
    const snapshot = await adminDb.collection('presupuestos').where('estado', 'in', ['pendiente', 'pendiente-alegra']).get();
    console.log(`[SYNC] Presupuestos a sincronizar: ${snapshot.size}`);
    const email = process.env.ALEGRA_EMAIL?.trim();
    const apiKey = process.env.ALEGRA_API_KEY?.trim();
    const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
    let actualizados = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.idAlegra) {
        const url = `https://api.alegra.com/api/v1/estimates/${data.idAlegra}`;
        console.log(`[SYNC] Consultando Alegra ID: ${data.idAlegra}`);
        const response = await fetch(url, {
          headers: { accept: 'application/json', authorization }
        });
        if (response.status === 404) {
          await doc.ref.update({ estado: 'facturado' });
          actualizados++;
          console.log(`[SYNC] Presupuesto ${doc.id} marcado como facturado (no existe en Alegra)`);
        } else if (response.ok) {
          const alegraData = await response.json();
          // Usar el campo status oficial de Alegra
          if (alegraData.status === 'billed') {
            await doc.ref.update({ estado: 'facturado', facturaAlegra: alegraData.invoices || [] });
            actualizados++;
            console.log(`[SYNC] Presupuesto ${doc.id} marcado como facturado (status billed)`);
          } else if (alegraData.status === 'unbilled') {
            await doc.ref.update({ estado: 'pendiente' });
            console.log(`[SYNC] Presupuesto ${doc.id} sigue pendiente (status unbilled)`);
          } else {
            console.log(`[SYNC] Presupuesto ${doc.id} status desconocido: ${alegraData.status}`);
          }
        } else {
          const errorText = await response.text();
          console.error(`[SYNC] Error consultando Alegra para ID ${data.idAlegra}:`, errorText);
        }
      } else {
        console.log(`[SYNC] Presupuesto ${doc.id} no tiene idAlegra, se omite.`);
      }
    }
    console.log(`[SYNC] Total actualizados: ${actualizados}`);
    res.json({ success: true, actualizados });
  } catch (error) {
    console.error('[SYNC] Error general:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Endpoint para obtener el estado del cache
app.get("/api/cache/status", (req, res) => {
  try {
    const estado = getEstadoCache();
    console.log('📊 Estado del cache consultado');
    res.json({
      success: true,
      estado,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error obteniendo estado del cache:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Endpoint para invalidar cache manualmente
app.post("/api/cache/invalidate", (req, res) => {
  try {
    const { tipo } = req.body; // 'clientes', 'productos', o 'todos'
    
    if (tipo === 'todos') {
      invalidarCache('clientes');
      invalidarCache('productos');
      console.log('🗑️ Cache de clientes y productos invalidado');
    } else if (tipo === 'clientes' || tipo === 'productos') {
      invalidarCache(tipo);
      console.log(`🗑️ Cache de ${tipo} invalidado`);
    } else {
      return res.status(400).json({ error: 'Tipo inválido. Use: clientes, productos, o todos' });
    }
    
    res.json({
      success: true,
      message: `Cache de ${tipo} invalidado exitosamente`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error invalidando cache:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Endpoint para forzar actualización de cache
app.post("/api/cache/refresh", async (req, res) => {
  try {
    const { tipo } = req.body; // 'clientes', 'productos', o 'todos'
    
    console.log(`🔄 Forzando actualización de cache: ${tipo}`);
    
    if (tipo === 'todos' || tipo === 'clientes') {
      invalidarCache('clientes');
      // Forzar recarga de clientes
      const snapshot = await adminDb.collection('clientesAlegra').get();
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      cacheCompartido.clientes = data;
      cacheCompartido.ultimaActualizacion.clientes = Date.now();
      console.log(`✅ Cache de clientes actualizado: ${data.length} registros`);
    }
    
    if (tipo === 'todos' || tipo === 'productos') {
      invalidarCache('productos');
      // Forzar recarga de productos
      const snapshot = await adminDb.collection('productosAlegra').get();
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      cacheCompartido.productos = data;
      cacheCompartido.ultimaActualizacion.productos = Date.now();
      console.log(`✅ Cache de productos actualizado: ${data.length} registros`);
    }
    
    const estado = getEstadoCache();
    res.json({
      success: true,
      message: `Cache de ${tipo} actualizado exitosamente`,
      estado,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error actualizando cache:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Endpoint para obtener estadísticas de uso del cache
app.get("/api/cache/stats", (req, res) => {
  try {
    const estado = getEstadoCache();
    const ahora = Date.now();
    
    const stats = {
      clientes: {
        ...estado.clientes,
        ttl: '7 días',
        proximaActualizacion: estado.clientes.tieneDatos ? 
          new Date(cacheCompartido.ultimaActualizacion.clientes + cacheCompartido.ttl.clientes).toLocaleString() : 'N/A'
      },
      productos: {
        ...estado.productos,
        ttl: '12 horas',
        proximaActualizacion: estado.productos.tieneDatos ? 
          new Date(cacheCompartido.ultimaActualizacion.productos + cacheCompartido.ttl.productos).toLocaleString() : 'N/A'
      },
      configuracion: {
        ttlClientes: '7 días',
        ttlProductos: '12 horas',
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('📊 Estadísticas del cache consultadas');
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas del cache:', error);
    res.status(500).json({ error: error.message });
  }
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Servidor backend escuchando en http://localhost:${PORT}`));
