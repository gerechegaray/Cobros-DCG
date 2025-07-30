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
  visitas: null, // 🆕 Agregar visitas al caché
  ultimaActualizacion: {
    clientes: null,
    productos: null,
    visitas: null // 🆕 Agregar visitas al caché
  },
  ttl: {
    clientes: 7 * 24 * 60 * 60 * 1000,    // 7 días
    productos: 12 * 60 * 60 * 1000,        // 12 horas
    visitas: 5 * 60 * 1000                  // 🆕 5 minutos para visitas
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
  
  ['clientes', 'productos', 'visitas'].forEach(tipo => { // 🆕 Agregar visitas
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
    console.log(`Filtrando presupuestos para email: ${email}, role: ${role}`);
    
    // 🆕 Calcular fecha límite (7 días atrás desde hoy)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 7);
    console.log(`🆕 Filtro de fecha: solo presupuestos desde ${fechaLimite.toISOString()}`);
    
    let query = adminDb.collection('presupuestos')
      .where('fechaCreacion', '>=', fechaLimite) // 🆕 Filtrar por fecha
      .orderBy('fechaCreacion', 'desc');
    let snapshot;
    
    if (role === 'admin') {
      // Admin ve todos los presupuestos (pero con filtro de fecha)
      console.log('Admin: mostrando presupuestos de los últimos 7 días');
      snapshot = await query.get();
    } else {
      // Vendedores (Guille, Santi) ven solo sus presupuestos por rol (con filtro de fecha)
      console.log(`Vendedor ${role}: filtrando por rol y fecha`);
      snapshot = await query.get();
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Debug: mostrar todos los presupuestos y sus usuarios
      console.log('Todos los presupuestos (con filtro de fecha):');
      data.forEach(p => {
        console.log(`- ID: ${p.id}, Usuario: "${p.usuario}", Vendedor: ${p.vendedor}, Estado: ${p.estado}, Fecha: ${p.fechaCreacion}`);
      });
      
      // Filtrado SOLO por rol/vendedor, no por email
      let filtrados;
      if (role === 'Guille') {
        filtrados = data.filter(p => p.vendedor === 1 || p.vendedor === "1");
      } else if (role === 'Santi') {
        filtrados = data.filter(p => p.vendedor === 2 || p.vendedor === "2");
      } else {
        // Fallback: filtrar por email si no es Guille ni Santi
        filtrados = data.filter(p => p.usuario === email);
      }
      
      console.log(`Presupuestos filtrados para ${role}: ${filtrados.length} de ${data.length} total`);
      console.log('Presupuestos filtrados:');
      filtrados.forEach(p => {
        console.log(`- ID: ${p.id}, Usuario: "${p.usuario}", Vendedor: ${p.vendedor}, Estado: ${p.estado}, Fecha: ${p.fechaCreacion}`);
      });
      
      return res.json(filtrados);
    }
    
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Presupuestos para admin (últimos 7 días): ${data.length} total`);
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

// 🆕 ENDPOINT CON CACHÉ PARA VISITAS
app.get("/api/visitas-cache", async (req, res) => {
  try {
    const { vendedorId } = req.query;
    console.log('Entrando a /api/visitas-cache, vendedorId:', vendedorId);
    
    // Verificar si el cache está disponible y no expiró
    if (!cacheExpiro('visitas') && cacheCompartido.visitas) {
      console.log('📦 Sirviendo visitas desde cache');
      
      let visitas = cacheCompartido.visitas;
      
      // Filtrar por vendedor si se especifica
      if (vendedorId) {
        visitas = visitas.filter(visita => visita.vendedorId === parseInt(vendedorId));
        console.log(`Filtradas ${visitas.length} visitas para vendedor ${vendedorId}`);
      }
      
      res.json(visitas);
      return;
    }
    
    // Cache expirado o no disponible, cargar desde Firestore
    console.log('🔄 Cache expirado o no disponible, cargando visitas desde Firestore...');
    
    const snapshot = await adminDb.collection('visitas').get();
    const visitas = [];
    
    snapshot.forEach(doc => {
      visitas.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Guardar en cache
    cacheCompartido.visitas = visitas;
    cacheCompartido.ultimaActualizacion.visitas = Date.now();
    
    console.log(`💾 Cache actualizado con ${visitas.length} visitas`);
    
    // Filtrar por vendedor si se especifica
    let visitasFiltradas = visitas;
    if (vendedorId) {
      visitasFiltradas = visitas.filter(visita => visita.vendedorId === parseInt(vendedorId));
      console.log(`Filtradas ${visitasFiltradas.length} visitas para vendedor ${vendedorId}`);
    }
    
    res.json(visitasFiltradas);
  } catch (error) {
    console.error('Error en /api/visitas-cache:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 ENDPOINTS PARA VISITAS
app.get("/api/visitas", async (req, res) => {
  try {
    const { vendedorId } = req.query;
    let query = adminDb.collection("visitas");
    
    if (vendedorId) {
      query = query.where("vendedorId", "==", parseInt(vendedorId));
    }
    
    const snapshot = await query.get();
    const visitas = [];
    
    snapshot.forEach(doc => {
      visitas.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(visitas);
  } catch (error) {
    console.error("Error obteniendo visitas:", error);
    res.status(500).json({ error: "Error obteniendo visitas" });
  }
});

app.post("/api/visitas", async (req, res) => {
  try {
    const visitaData = {
      ...req.body,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };
    
    const docRef = await adminDb.collection("visitas").add(visitaData);
    
    // 🆕 Invalidar cache de visitas
    invalidarCache('visitas');
    
    res.json({
      id: docRef.id,
      ...visitaData
    });
  } catch (error) {
    console.error("Error creando visita:", error);
    res.status(500).json({ error: "Error creando visita" });
  }
});

app.put("/api/visitas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      fechaActualizacion: new Date()
    };
    
    await adminDb.collection("visitas").doc(id).update(updateData);
    
    // 🆕 Invalidar cache de visitas
    invalidarCache('visitas');
    
    res.json({ success: true, id });
  } catch (error) {
    console.error("Error actualizando visita:", error);
    res.status(500).json({ error: "Error actualizando visita" });
  }
});

app.delete("/api/visitas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    await adminDb.collection("visitas").doc(id).delete();
    
    // 🆕 Invalidar cache de visitas
    invalidarCache('visitas');
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error eliminando visita:", error);
    res.status(500).json({ error: "Error eliminando visita" });
  }
});

// 🆕 ENDPOINTS PARA VISITAS PROGRAMADAS
app.get("/api/visitas-programadas", async (req, res) => {
  try {
    const { vendedorId } = req.query;
    let query = adminDb.collection("visitasProgramadas");
    
    if (vendedorId) {
      query = query.where("vendedorId", "==", parseInt(vendedorId));
    }
    
    const snapshot = await query.get();
    const programas = [];
    
    snapshot.forEach(doc => {
      programas.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(programas);
  } catch (error) {
    console.error("Error obteniendo visitas programadas:", error);
    res.status(500).json({ error: "Error obteniendo visitas programadas" });
  }
});

app.post("/api/visitas-programadas", async (req, res) => {
  try {
    const programaData = {
      ...req.body,
      activo: true,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };
    
    const docRef = await adminDb.collection("visitasProgramadas").add(programaData);
    
    // Generar visitas automáticamente para el próximo mes
    const fechaInicio = new Date();
    const fechaFin = new Date();
    fechaFin.setMonth(fechaFin.getMonth() + 1);
    
    const visitasGeneradas = [];
    let fechaActual = new Date(programaData.fechaInicio);
    
    while (fechaActual <= fechaFin) {
      if (fechaActual.getDay() === programaData.diaSemana) {
        const fechaStr = fechaActual.toISOString().split('T')[0];
        
        // Verificar si ya existe una visita
        const visitaExistente = await adminDb.collection("visitas")
          .where("programaId", "==", docRef.id)
          .where("fecha", "==", fechaStr)
          .get();
        
        if (visitaExistente.empty) {
          const visitaData = {
            programaId: docRef.id,
            vendedorId: programaData.vendedorId,
            clienteId: programaData.clienteId,
            clienteNombre: programaData.clienteNombre,
            fecha: fechaStr,
            horario: programaData.horario,
            estado: "pendiente",
            resultado: null,
            comentario: "",
            fechaCreacion: new Date()
          };
          
          await adminDb.collection("visitas").add(visitaData);
          visitasGeneradas.push(visitaData);
        }
      }
      
      fechaActual.setDate(fechaActual.getDate() + 7);
    }
    
    // 🆕 Invalidar cache de visitas
    invalidarCache('visitas');
    
    res.json({
      id: docRef.id,
      visitasGeneradas: visitasGeneradas.length
    });
  } catch (error) {
    console.error("Error creando programa de visitas:", error);
    res.status(500).json({ error: "Error creando programa de visitas" });
  }
});

app.put("/api/visitas-programadas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      fechaActualizacion: new Date()
    };
    
    await adminDb.collection("visitasProgramadas").doc(id).update(updateData);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error actualizando visita programada:", error);
    res.status(500).json({ error: "Error actualizando visita programada" });
  }
});

app.delete("/api/visitas-programadas/:id", async (req, res) => {
  try {
    const programaId = req.params.id;
    
    console.log(`🗑️ Eliminando programa ${programaId} y todas sus visitas...`);
    
    // 1. Eliminar todas las visitas generadas por este programa
    const visitasSnapshot = await adminDb.collection("visitas")
      .where("programaId", "==", programaId)
      .get();
    
    let visitasEliminadas = 0;
    for (const visita of visitasSnapshot.docs) {
      await visita.ref.delete();
      visitasEliminadas++;
    }
    
    console.log(`✅ Eliminadas ${visitasEliminadas} visitas del programa ${programaId}`);
    
    // 2. Eliminar el programa
    await adminDb.collection("visitasProgramadas").doc(programaId).delete();
    
    console.log(`✅ Programa ${programaId} eliminado correctamente`);
    
    res.json({ 
      success: true, 
      programaEliminado: programaId,
      visitasEliminadas: visitasEliminadas
    });
  } catch (error) {
    console.error("Error eliminando programa y visitas:", error);
    res.status(500).json({ error: "Error eliminando programa y visitas" });
  }
});

// 🆕 ENDPOINT PARA GENERAR VISITAS DESDE PROGRAMAS
app.post("/api/visitas/generar", async (req, res) => {
  try {
    const { fechaInicio, fechaFin, vendedorId } = req.body;
    
    console.log("Generando visitas desde:", fechaInicio, "hasta:", fechaFin);
    
    // Obtener todos los programas activos
    let query = adminDb.collection("visitasProgramadas").where("activo", "==", true);
    if (vendedorId) {
      query = query.where("vendedorId", "==", parseInt(vendedorId));
    }
    
    const snapshot = await query.get();
    const programas = [];
    snapshot.forEach(doc => {
      programas.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log("Programas encontrados:", programas.length);
    
    const visitasGeneradas = [];
    const fechaInicioObj = new Date(fechaInicio);
    const fechaFinObj = new Date(fechaFin);
    
    for (const programa of programas) {
      console.log(`Procesando programa ${programa.id} para cliente ${programa.clienteNombre}`);
      
      let fechaActual = new Date(programa.fechaInicio);
      
      while (fechaActual <= fechaFinObj) {
        // Verificar si es el día correcto de la semana
        if (fechaActual.getDay() === programa.diaSemana) {
          // Verificar si la fecha está en el rango
          if (fechaActual >= fechaInicioObj && fechaActual <= fechaFinObj) {
            const fechaStr = fechaActual.toISOString().split('T')[0];
            
            // Verificar si ya existe una visita para esta fecha y programa
            const visitaExistente = await adminDb.collection("visitas")
              .where("programaId", "==", programa.id)
              .where("fecha", "==", fechaStr)
              .get();
            
            if (visitaExistente.empty) {
              console.log(`Creando visita para ${programa.clienteNombre} el ${fechaStr}`);
              
              // Crear nueva visita
              const visitaData = {
                programaId: programa.id,
                vendedorId: programa.vendedorId,
                clienteId: programa.clienteId,
                clienteNombre: programa.clienteNombre,
                fecha: fechaStr,
                horario: programa.horario,
                estado: "pendiente",
                resultado: null,
                comentario: "",
                fechaCreacion: new Date()
              };
              
              const docRef = await adminDb.collection("visitas").add(visitaData);
              visitasGeneradas.push({
                id: docRef.id,
                ...visitaData
              });
            } else {
              console.log(`Visita ya existe para ${programa.clienteNombre} el ${fechaStr}`);
            }
          }
        }
        
        // Avanzar según la frecuencia
        if (programa.frecuencia === "semanal") {
          fechaActual.setDate(fechaActual.getDate() + 7);
        } else if (programa.frecuencia === "quincenal") {
          fechaActual.setDate(fechaActual.getDate() + 14);
        } else if (programa.frecuencia === "mensual") {
          fechaActual.setMonth(fechaActual.getMonth() + 1);
        }
      }
    }
    
    console.log(`Generación completada: ${visitasGeneradas.length} visitas nuevas`);
    
    // 🆕 Invalidar cache de visitas
    invalidarCache('visitas');
    
    res.json({
      success: true,
      visitasGeneradas: visitasGeneradas.length,
      programas: programas.length
    });
  } catch (error) {
    console.error("Error generando visitas:", error);
    res.status(500).json({ error: "Error generando visitas" });
  }
});

// 🆕 Endpoint para obtener hojas de ruta (para Dashboard)
app.get("/api/hojas-de-ruta", async (req, res) => {
  try {
    console.log('Entrando a /api/hojas-de-ruta');
    
    const snapshot = await adminDb.collection('hojasDeRuta').get();
    const hojasDeRuta = [];
    
    snapshot.forEach(doc => {
      hojasDeRuta.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Hojas de ruta encontradas: ${hojasDeRuta.length}`);
    res.json(hojasDeRuta);
  } catch (error) {
    console.error('Error en /api/hojas-de-ruta:', error);
    res.status(500).json({ error: error.message });
  }
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Servidor backend escuchando en http://localhost:${PORT}`));
