// server/app.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

// Importo el servicio de Alegra
import { getAlegraInvoices, getAlegraContacts, getAlegraItems } from "./alegraService.js";
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 🆕 Debug: Verificar variables de entorno
console.log('🔍 Debug - Variables de entorno Firebase:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ Configurado' : '❌ No configurado');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅ Configurado' : '❌ No configurado');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅ Configurado' : '❌ No configurado');
console.log('FIREBASE_CLIENT_ID:', process.env.FIREBASE_CLIENT_ID ? '✅ Configurado' : '❌ No configurado');

        // Inicializar Firebase Admin si no está inicializado
        try {
          if (!global._firebaseAdminInitialized) {
            // Intentar usar variables de entorno primero
            if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
              console.log('🔄 Intentando inicializar Firebase con variables de entorno...');
              const serviceAccount = {
                type: "service_account",
                project_id: process.env.FIREBASE_PROJECT_ID || "planilla-cobranzas",
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                client_id: process.env.FIREBASE_CLIENT_ID,
                auth_uri: "https://accounts.google.com/o/oauth2/auth",
                token_uri: "https://oauth2.googleapis.com/token",
                auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
                client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
                universe_domain: "googleapis.com"
              };
              
              initializeApp({
                credential: cert(serviceAccount),
              });
              console.log('✅ Firebase Admin inicializado con variables de entorno');
            } else {
              console.log('🔄 Variables de entorno no disponibles, intentando con archivo...');
              // Fallback: intentar cargar las credenciales desde el archivo
              const serviceAccountPath = join(__dirname, 'firebase-gestion.json');
              const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
              
              initializeApp({
                credential: cert(serviceAccount),
              });
              console.log('✅ Firebase Admin inicializado con credenciales de archivo');
            }
          }
          global._firebaseAdminInitialized = true;
        } catch (error) {
          console.error('❌ Error cargando credenciales de Firebase:', error);
          // Fallback a applicationDefault si el archivo no está disponible
          try {
            console.log('🔄 Intentando con applicationDefault...');
            initializeApp({
              credential: applicationDefault(),
            });
            console.log('✅ Firebase Admin inicializado con applicationDefault');
          } catch (fallbackError) {
            console.error('❌ Error con applicationDefault:', fallbackError);
            console.warn('⚠️ Firebase no inicializado - usando modo de emergencia');
            // No lanzar error, permitir que la app funcione con endpoints de emergencia
          }
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

// 🆕 Configuración CORS específica para permitir Vercel
app.use(cors({
  origin: [
    'https://gestion-dcg.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control', 
    'Pragma',
    'Expires',
    'If-Modified-Since',
    'If-None-Match',
    'Accept',
    'Accept-Language',
    'Accept-Encoding',
    'User-Agent',
    'X-Requested-With'
  ]
}));

app.use(express.json());

// Endpoint para obtener facturas de venta de Alegra
app.get("/api/alegra/invoices", async (req, res) => {
  try {
    const { dias = 5, limit = 30, maxInvoices = 30 } = req.query;
    
    console.log(`🔍 Parámetros recibidos: dias=${dias}, limit=${limit}, maxInvoices=${maxInvoices}`);
    
    const diasInt = parseInt(dias);
    const limitInt = parseInt(limit);
    const maxInvoicesInt = parseInt(maxInvoices);
    
    // Validar parámetros
    if (isNaN(diasInt) || ![1, 3, 5].includes(diasInt)) {
      return res.status(400).json({
        error: 'El parámetro "dias" debe ser 1, 3 o 5',
        rangosPermitidos: [1, 3, 5]
      });
    }
    
    if (isNaN(limitInt) || limitInt < 1 || limitInt > 30) {
      return res.status(400).json({
        error: 'El parámetro "limit" debe ser un número entre 1 y 30 (Alegra solo permite máximo 30 facturas por consulta)',
        rangosPermitidos: [1, 30]
      });
    }
    
    if (isNaN(maxInvoicesInt) || maxInvoicesInt < 1) {
      return res.status(400).json({
        error: 'El parámetro "maxInvoices" debe ser un número mayor a 0',
        rangosPermitidos: [1, '∞']
      });
    }
    
    console.log(`✅ Parámetros validados: dias=${diasInt}, limit=${limitInt}, maxInvoices=${maxInvoicesInt}`);
    
    const facturas = await getAlegraInvoices(diasInt, limitInt, maxInvoicesInt);
    
    console.log(`✅ Facturas obtenidas: ${facturas.length}`);
    
    res.json(facturas);
  } catch (error) {
    console.error('❌ Error en /api/alegra/invoices:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      detalles: error.message 
    });
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
      items: items.map(item => {
        const itemData = {
          id: item.producto,
          quantity: item.cantidad,
          price: item.price
        };
        
        // Agregar bonificación si existe
        if (item.bonificacion && item.bonificacion > 0) {
          itemData.discount = item.bonificacion.toString(); // Convertir a string
          itemData.discountType = 'percentage'; // Bonificación como porcentaje
          console.log('🆕 Agregando bonificación al item:', {
            producto: item.producto,
            bonificacion: item.bonificacion,
            discount: itemData.discount,
            discountType: itemData.discountType
          });
        } else {
          console.log('🆕 Item sin bonificación:', {
            producto: item.producto,
            bonificacion: item.bonificacion
          });
        }
        
        return itemData;
      }),
      observations: observaciones || '',
      dueDate: dueDate || '',
    };
    if (fechaCreacion) alegraBody.date = fechaCreacion;
    if (vendedor) alegraBody.seller = vendedor;
    // LOGS para depuración
    console.log('🆕 Items con bonificación:', items.map(item => ({
      producto: item.producto,
      cantidad: item.cantidad,
      bonificacion: item.bonificacion,
      price: item.price
    })));
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
    // 1. Crear en Firestore con estado unbilled (estado correcto de Alegra)
    const docRef = await adminDb.collection('presupuestos').add({
      clienteId,
      items,
      observaciones,
      usuario,
      estado: 'unbilled', // Usar estado correcto de Alegra desde el inicio
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
        items: items.map(item => {
          const itemData = {
            id: item.producto,
            quantity: item.cantidad,
            price: item.price
          };
          
          // Agregar bonificación si existe
          if (item.bonificacion && item.bonificacion > 0) {
            itemData.discount = item.bonificacion.toString(); // Convertir a string
            itemData.discountType = 'percentage'; // Bonificación como porcentaje
            console.log('🆕 Agregando bonificación al item (presupuestos):', {
              producto: item.producto,
              bonificacion: item.bonificacion,
              discount: itemData.discount,
              discountType: itemData.discountType
            });
          } else {
            console.log('🆕 Item sin bonificación (presupuestos):', {
              producto: item.producto,
              bonificacion: item.bonificacion
            });
          }
          
          return itemData;
        }),
        observations: observaciones || '',
        dueDate: dueDate || '',
      };
      if (fechaCreacion) alegraBody.date = fechaCreacion;
      if (vendedor) alegraBody.seller = vendedor;
      
      // LOGS para depuración
      console.log('🆕 Items con bonificación (presupuestos):', items.map(item => ({
        producto: item.producto,
        cantidad: item.cantidad,
        bonificacion: item.bonificacion,
        price: item.price
      })));
      console.log('🆕 Body para Alegra (presupuestos):', JSON.stringify(alegraBody, null, 2));
      
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
      // 3. Si sale bien, actualizar doc con idAlegra y mantener estado unbilled
      await docRef.update({ idAlegra: alegraQuote.id, estado: 'unbilled' });
    } catch (err) {
      alegraError = err.message || String(err);
      // Si falla, mantener estado como unbilled y guardar error
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
  console.log('🔄 Entrando a /api/presupuestos');
  console.log('🆕 Verificando Firebase initialization...');
  
  // Verificar que Firebase esté inicializado
  if (!adminDb) {
    console.error('❌ Firebase no inicializado en /api/presupuestos');
    return res.status(500).json({ 
      error: 'Firebase no inicializado',
      success: false,
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    });
  }
  console.log('✅ Firebase inicializado correctamente');
  
      try {
      const { email, role, page = 1, limit = 20, estado, clienteId, fechaDesde, fechaHasta } = req.query;
      
      console.log('🆕 Parámetros recibidos:');
      console.log('🆕 - email:', email);
      console.log('🆕 - role:', role);
      console.log('🆕 - page:', page);
      console.log('🆕 - limit:', limit);
      console.log('🆕 - estado:', estado);
      console.log('🆕 - clienteId:', clienteId);
      console.log('🆕 - fechaDesde:', fechaDesde);
      console.log('🆕 - fechaHasta:', fechaHasta);
    console.log(`Filtrando presupuestos para email: ${email}, role: ${role}`);
    console.log(`Paginación: page=${page}, limit=${limit}`);
    console.log(`Filtros: estado=${estado}, clienteId=${clienteId}, fechaDesde=${fechaDesde}, fechaHasta=${fechaHasta}`);
    
    // 🆕 Verificar si Firebase está inicializado
    if (!adminDb) {
      console.warn('⚠️ Firebase no inicializado - devolviendo respuesta de emergencia');
      return res.json({
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }
    
    // 🆕 Calcular fecha límite (7 días atrás desde hoy)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 7);
    console.log(`🆕 Filtro de fecha: solo presupuestos desde ${fechaLimite.toISOString()}`);
    
    // 🆕 Construir query base con filtros
    let query = adminDb.collection('presupuestos')
      .where('fechaCreacion', '>=', fechaLimite)
      .orderBy('fechaCreacion', 'desc');
    
    // 🆕 Aplicar filtros adicionales si se proporcionan
    if (estado && estado !== 'todos') {
      // 🆕 Mapear estados del frontend a estados de Firebase
      let estadoFirebase = estado;
      if (estado === 'pendiente') {
        // Buscar tanto 'unbilled' como estados antiguos
        console.log(`🆕 Mapeando estado: "${estado}" -> buscando estados no facturados`);
        query = query.where('estado', 'in', ['unbilled', 'pendiente', 'pendiente-alegra', 'Sin facturar']);
      } else if (estado === 'facturado') {
        // Buscar tanto 'billed' como estados antiguos
        console.log(`🆕 Mapeando estado: "${estado}" -> buscando estados facturados`);
        query = query.where('estado', 'in', ['billed', 'facturado', 'Facturada']);
      } else {
        console.log(`🆕 Estado no reconocido: "${estado}" - aplicando filtro directo`);
        query = query.where('estado', '==', estado);
      }
    }
    
    if (clienteId) {
      query = query.where('clienteId', '==', clienteId);
    }
    
    // 🆕 Aplicar filtros de fecha si se proporcionan
    if (fechaDesde) {
      const fechaDesdeObj = new Date(fechaDesde);
      query = query.where('fechaCreacion', '>=', fechaDesdeObj);
    }
    
    if (fechaHasta) {
      const fechaHastaObj = new Date(fechaHasta);
      fechaHastaObj.setHours(23, 59, 59, 999);
      query = query.where('fechaCreacion', '<=', fechaHastaObj);
    }
    
    // 🆕 Obtener total de documentos para paginación
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;
    
    console.log(`🆕 Total de presupuestos en Firebase (con filtro de fecha): ${total}`);
    
    // 🆕 Aplicar paginación
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;
    
    query = query.limit(limitInt).offset(offset);
    
    let snapshot = await query.get();
    let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`🆕 Presupuestos obtenidos de Firebase (página ${pageInt}): ${data.length}`);
    console.log('🆕 Detalles de presupuestos obtenidos:');
    data.forEach((p, index) => {
      console.log(`🆕 ${index + 1}. ID: ${p.id}`);
      console.log(`🆕    - Fecha: ${p.fechaCreacion}`);
      console.log(`🆕    - Usuario: "${p.usuario}"`);
      console.log(`🆕    - Vendedor: ${p.vendedor}`);
      console.log(`🆕    - Estado: ${p.estado}`);
      console.log(`🆕    - Cliente: ${p.clienteNombre || 'N/A'}`);
    });
    
    // 🆕 Filtrar por rol después de obtener los datos (para evitar problemas con índices compuestos)
    if (role !== 'admin') {
      console.log(`🆕 Vendedor ${role} (${email}): filtrando por rol`);
      
      // Debug: mostrar todos los presupuestos y sus usuarios
      console.log('🆕 Todos los presupuestos (con filtro de fecha):');
      data.forEach(p => {
        console.log(`🆕 - ID: ${p.id}, Usuario: "${p.usuario}", Vendedor: ${p.vendedor}, Estado: ${p.estado}, Fecha: ${p.fechaCreacion}`);
      });
      
      // Filtrado SOLO por rol/vendedor, no por email
      let filtrados;
      if (role === 'Guille') {
        filtrados = data.filter(p => p.vendedor === 1 || p.vendedor === "1");
        console.log(`🆕 Filtrando para Guille (vendedor = 1): ${filtrados.length} de ${data.length}`);
      } else if (role === 'Santi') {
        filtrados = data.filter(p => p.vendedor === 2 || p.vendedor === "2");
        console.log(`🆕 Filtrando para Santi (vendedor = 2): ${filtrados.length} de ${data.length}`);
      } else {
        // Fallback: filtrar por email si no es Guille ni Santi
        filtrados = data.filter(p => p.usuario === email);
        console.log(`🆕 Filtrando por email "${email}": ${filtrados.length} de ${data.length}`);
      }
      
      console.log(`🆕 Presupuestos filtrados para ${role}: ${filtrados.length} de ${data.length} total`);
      data = filtrados;
    } else {
      console.log(`🆕 Admin: mostrando todos los presupuestos sin filtro`);
    }
    
    // 🆕 Calcular información de paginación
    const totalPages = Math.ceil(total / limitInt);
    const hasNextPage = pageInt < totalPages;
    const hasPrevPage = pageInt > 1;
    
    console.log(`Presupuestos para ${role}: ${data.length} de ${total} total (página ${pageInt} de ${totalPages})`);
    console.log('🆕 Estructura de respuesta que se envía:');
    console.log('🆕 - data es array:', Array.isArray(data));
    console.log('🆕 - data length:', Array.isArray(data) ? data.length : 'No es array');
    console.log('🆕 - data tipo:', typeof data);
    console.log('🆕 - pagination tipo:', typeof { page: pageInt, limit: limitInt, total, totalPages, hasNextPage, hasPrevPage });
    
    const responseData = {
      data,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    };
    
    console.log('🆕 Enviando respuesta completa:', JSON.stringify(responseData, null, 2));
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error en /api/presupuestos:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      error: error.message,
      success: false,
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    });
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
        // Guardar/actualizar en Firestore preservando solo la ubicación personalizada
        for (const cliente of data) {
          const clienteId = cliente.id.toString();
          
          // Obtener el cliente existente para preservar solo la ubicación
          const clienteExistente = await adminDb.collection('clientesAlegra').doc(clienteId).get();
          const ubicacionPersonalizada = {};
          
          if (clienteExistente.exists) {
            const datosExistentes = clienteExistente.data();
            // Preservar SOLO la ubicación personalizada
            if (datosExistentes.ubicacion) ubicacionPersonalizada.ubicacion = datosExistentes.ubicacion;
            if (datosExistentes.ubicacionActualizada) ubicacionPersonalizada.ubicacionActualizada = datosExistentes.ubicacionActualizada;
            if (datosExistentes.ubicacionActualizadaPor) ubicacionPersonalizada.ubicacionActualizadaPor = datosExistentes.ubicacionActualizadaPor;
          }
          
          // Combinar datos de Alegra con ubicación personalizada
          const clienteCompleto = {
            ...cliente,
            ...ubicacionPersonalizada,
            ultimaSincronizacion: new Date().toISOString()
          };
          
          await adminDb.collection('clientesAlegra').doc(clienteId).set(clienteCompleto);
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
    // 🆕 Verificar si Firebase está inicializado
    if (!adminDb) {
      console.warn('⚠️ Firebase no inicializado - devolviendo respuesta de emergencia');
      return res.json([]);
    }
    
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

// Endpoint para actualizar la ubicación de un cliente
app.put("/api/clientes-firebase/:id/ubicacion", async (req, res) => {
  console.log('🔄 Entrando a /api/clientes-firebase/:id/ubicacion');
  
  try {
    const { id } = req.params;
    const { ubicacion } = req.body;
    
    if (!id || !ubicacion) {
      return res.status(400).json({ error: 'ID del cliente y ubicación son requeridos' });
    }
    
    // Verificar si Firebase está inicializado
    if (!adminDb) {
      console.warn('⚠️ Firebase no inicializado');
      return res.status(500).json({ error: 'Firebase no inicializado' });
    }
    
    // Actualizar en Firebase
    await adminDb.collection('clientesAlegra').doc(id).update({
      ubicacion: ubicacion.trim(),
      ubicacionActualizada: new Date().toISOString(),
      ubicacionActualizadaPor: req.headers['user-agent'] || 'unknown'
    });
    
    // Invalidar cache de clientes para forzar recarga
    if (cacheCompartido.clientes) {
      delete cacheCompartido.clientes;
      console.log('🗑️ Cache de clientes invalidado después de actualización');
    }
    
    console.log(`✅ Ubicación actualizada para cliente ${id}: ${ubicacion}`);
    res.json({ 
      success: true, 
      message: 'Ubicación actualizada correctamente',
      clienteId: id,
      ubicacion: ubicacion.trim()
    });
    
  } catch (error) {
    console.error('❌ Error actualizando ubicación del cliente:', error);
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
    // 🆕 Verificar si Firebase está inicializado
    if (!adminDb) {
      console.warn('⚠️ Firebase no inicializado - devolviendo respuesta de emergencia');
      return res.json([]);
    }
    
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
    
    // 🆕 Filtrar facturas anuladas, cerradas y pagadas (status: "void", "closed", "paid")
    console.log(`[ESTADO CUENTA] Facturas antes del filtro:`, facturasDelCliente.length);
    
    const facturasValidas = facturasDelCliente.filter(factura => {
      const estadosExcluidos = ["void", "closed", "paid"];
      const esValida = !estadosExcluidos.includes(factura.status);
      if (!esValida) {
        console.log(`[ESTADO CUENTA] 🚫 EXCLUYENDO factura: ID ${factura.id}, Número ${factura.number}, Status: ${factura.status}`);
      } else {
        console.log(`[ESTADO CUENTA] ✅ MANTENIENDO factura: ID ${factura.id}, Número ${factura.number}, Status: ${factura.status}`);
      }
      return esValida;
    });
    
    console.log(`[ESTADO CUENTA] Facturas válidas: ${facturasValidas.length}`);
    
    // Transformar los datos al formato esperado por el frontend
    const boletas = facturasValidas.map(factura => {
      // Calcular el total de pagos asociados (solo payments.amount)
      const pagosAsociados = factura.payments || [];
      const montoPagado = pagosAsociados.reduce((sum, pago) => sum + (pago.amount || 0), 0);
      const montoTotal = factura.total || 0;
      const montoAdeudado = montoTotal - montoPagado;
      const numeroFinal = factura.numberTemplate?.number || factura.number || factura.id;
      
      return {
        numero: numeroFinal,
        fechaEmision: factura.date,
        fechaVencimiento: factura.dueDate,
        montoTotal: montoTotal,
        montoPagado: montoPagado,
        montoAdeudado: montoAdeudado,
        estado: montoPagado >= montoTotal ? 'PAGADO' : 
                new Date(factura.dueDate) < new Date() ? 'VENCIDO' : 'PENDIENTE',
        pagos: pagosAsociados,
        productos: factura.items || [], // 🆕 Incluir productos de la factura
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
    const snapshot = await adminDb.collection('presupuestos').where('estado', 'in', ['unbilled', 'pendiente', 'pendiente-alegra']).get();
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
          await doc.ref.update({ estado: 'billed' });
          actualizados++;
          console.log(`[SYNC] Presupuesto ${doc.id} marcado como billed (no existe en Alegra)`);
        } else if (response.ok) {
          const alegraData = await response.json();
          // Usar el campo status oficial de Alegra y mantener consistencia
          if (alegraData.status === 'billed') {
            await doc.ref.update({ estado: 'billed', facturaAlegra: alegraData.invoices || [] });
            actualizados++;
            console.log(`[SYNC] Presupuesto ${doc.id} marcado como billed (status billed)`);
          } else if (alegraData.status === 'unbilled') {
            await doc.ref.update({ estado: 'unbilled' });
            console.log(`[SYNC] Presupuesto ${doc.id} marcado como unbilled (status unbilled)`);
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
    console.log('🆕 Entrando a /api/visitas-cache, vendedorId:', vendedorId);
    
    // 🆕 Debug: Verificar estado del cache
    console.log('🆕 Estado del cache de visitas:');
    console.log('🆕 - Cache disponible:', !!cacheCompartido.visitas);
    console.log('🆕 - Cache expirado:', cacheExpiro('visitas'));
    console.log('🆕 - Última actualización:', cacheCompartido.ultimaActualizacion.visitas);
    
    // 🆕 TEMPORARIO: Forzar consulta directa a Firestore para debug
    // Verificar si el cache está disponible y no expiró
    /*
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
    */
    
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
    
    console.log(`🆕 Visitas encontradas en Firestore: ${visitas.length}`);
    if (visitas.length > 0) {
      console.log('🆕 Primeras 3 visitas:');
      visitas.slice(0, 3).forEach((v, index) => {
        console.log(`🆕   ${index + 1}. ID: ${v.id}, Cliente: ${v.clienteNombre}, Fecha: ${v.fecha}`);
      });
    }
    
    // Guardar en cache
    cacheCompartido.visitas = visitas;
    cacheCompartido.ultimaActualizacion.visitas = Date.now();
    
    console.log(`💾 Cache actualizado con ${visitas.length} visitas`);
    
    // Filtrar por vendedor si se especifica
    let visitasFiltradas = visitas;
    console.log('🆕 DEBUG: Antes del filtro - Total visitas:', visitas.length);
    console.log('🆕 DEBUG: vendedorId recibido:', vendedorId, 'tipo:', typeof vendedorId);
    
    if (vendedorId && vendedorId !== 'undefined') {
      visitasFiltradas = visitas.filter(visita => visita.vendedorId === parseInt(vendedorId));
      console.log(`🆕 DEBUG: Filtradas ${visitasFiltradas.length} visitas para vendedor ${vendedorId}`);
    } else {
      console.log('🆕 DEBUG: No se aplica filtro de vendedor, retornando todas las visitas');
    }
    
    console.log('🆕 DEBUG: Visitas a retornar:', visitasFiltradas.length);
    console.log('🆕 DEBUG: Primeras 3 visitas a retornar:');
    visitasFiltradas.slice(0, 3).forEach((v, index) => {
      console.log(`🆕   ${index + 1}. ID: ${v.id}, Cliente: ${v.clienteNombre}, Vendedor: ${v.vendedorId}`);
    });
    
    res.json(visitasFiltradas);
  } catch (error) {
    console.error('Error en /api/visitas-cache:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 TEMPORARY DEBUG ENDPOINT - FORCE CACHE INVALIDATION AND DIRECT FIRESTORE QUERY
app.get("/api/debug/visitas", async (req, res) => {
  try {
    console.log('🆕 DEBUG: Forzando invalidación de cache de visitas');
    invalidarCache('visitas');

    console.log('🆕 DEBUG: Consultando Firestore directamente');
    const snapshot = await adminDb.collection('visitas').get();
    const visitas = [];

    snapshot.forEach(doc => {
      visitas.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`🆕 DEBUG: Visitas encontradas en Firestore: ${visitas.length}`);
    if (visitas.length > 0) {
      console.log('🆕 DEBUG: Detalles de las visitas:');
      visitas.forEach((v, index) => {
        console.log(`🆕   ${index + 1}. ID: ${v.id}, Cliente: ${v.clienteNombre}, Fecha: ${v.fecha}, Programa: ${v.programaId}`);
      });
    }

    res.json({
      cacheInvalidado: true,
      visitasEncontradas: visitas.length,
      visitas: visitas
    });
  } catch (error) {
    console.error('🆕 DEBUG: Error:', error);
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

// 🆕 ENDPOINT TEMPORAL PARA DEBUG - FORZAR INVALIDACIÓN DE CACHE
app.get("/api/debug/visitas", async (req, res) => {
  try {
    console.log('🆕 DEBUG: Forzando invalidación de cache de visitas');
    invalidarCache('visitas');
    
    console.log('🆕 DEBUG: Consultando Firestore directamente');
    const snapshot = await adminDb.collection('visitas').get();
    const visitas = [];
    
    snapshot.forEach(doc => {
      visitas.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`🆕 DEBUG: Visitas encontradas en Firestore: ${visitas.length}`);
    if (visitas.length > 0) {
      console.log('🆕 DEBUG: Detalles de las visitas:');
      visitas.forEach((v, index) => {
        console.log(`🆕   ${index + 1}. ID: ${v.id}, Cliente: ${v.clienteNombre}, Fecha: ${v.fecha}, Programa: ${v.programaId}`);
      });
    }
    
    res.json({
      cacheInvalidado: true,
      visitasEncontradas: visitas.length,
      visitas: visitas
    });
  } catch (error) {
    console.error('🆕 DEBUG: Error:', error);
    res.status(500).json({ error: error.message });
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

// 🆕 Endpoint para obtener cobros con paginación
app.get("/api/cobros", async (req, res) => {
  console.log('Entrando a /api/cobros');
  try {
    const { page = 1, limit = 20, estado, clienteId, fechaDesde, fechaHasta, vendedorId, cobrador } = req.query;
    console.log(`🔍 Parámetros recibidos:`, req.query);
    console.log(`🔍 Paginación: page=${page}, limit=${limit}`);
    console.log(`🔍 Filtros: estado=${estado}, clienteId=${clienteId}, fechaDesde=${fechaDesde}, fechaHasta=${fechaHasta}, vendedorId=${vendedorId}, cobrador=${cobrador}`);
    
    // 🆕 Construir query base
    let query = adminDb.collection('cobros');
    console.log(`🔍 Query base construida:`, query);
    
    // 🆕 Aplicar filtros si se proporcionan
    if (estado && estado !== 'todos') {
      query = query.where('estado', '==', estado);
      console.log(`🔍 Filtro de estado aplicado: ${estado}`);
    }
    
    if (clienteId) {
      query = query.where('clienteId', '==', clienteId);
      console.log(`🔍 Filtro de cliente aplicado: ${clienteId}`);
    }
    
    // 🆕 Priorizar filtro por cobrador (campo string) sobre vendedorId
    if (cobrador) {
      console.log(`🔍 Aplicando filtro de cobrador: ${cobrador}`);
      query = query.where('cobrador', '==', cobrador);
      console.log(`🔍 Filtro de cobrador aplicado: ${cobrador}`);
    } else if (vendedorId) {
      console.log(`🔍 Aplicando filtro de vendedor en backend: vendedorId=${vendedorId}`);
      const vendedorIdInt = parseInt(vendedorId);
      if (isNaN(vendedorIdInt)) {
        console.error(`🔍 Error: vendedorId no es un número válido: ${vendedorId}`);
        return res.status(400).json({ error: 'vendedorId debe ser un número válido' });
      }
      console.log(`🔍 vendedorId convertido a entero: ${vendedorIdInt}`);
      query = query.where('vendedorId', '==', vendedorIdInt);
      console.log(`🔍 Filtro de vendedor aplicado: vendedorId=${vendedorIdInt}`);
    }
    
    // 🆕 Aplicar filtros de fecha si se proporcionan (ANTES del orderBy)
    if (fechaDesde) {
      const fechaDesdeObj = new Date(fechaDesde);
      console.log(`🔍 Filtro de fecha desde aplicado: ${fechaDesdeObj}`);
      query = query.where('fechaCreacion', '>=', fechaDesdeObj);
    }
    
    if (fechaHasta) {
      const fechaHastaObj = new Date(fechaHasta);
      fechaHastaObj.setHours(23, 59, 59, 999);
      console.log(`🔍 Filtro de fecha hasta aplicado: ${fechaHastaObj}`);
      query = query.where('fechaCreacion', '<=', fechaHastaObj);
    }
    
    // 🆕 Aplicar ordenamiento DESPUÉS de todos los filtros
    query = query.orderBy('fechaCreacion', 'desc');
    console.log(`🔍 Ordenamiento aplicado: fechaCreacion desc`);
    
    // 🆕 Obtener total de documentos para paginación
    console.log(`🔍 Query construida para cobros:`, query);
    let totalSnapshot;
    try {
      totalSnapshot = await query.get();
      const total = totalSnapshot.size;
      console.log(`🔍 Total de cobros encontrados: ${total}`);
      
      // 🆕 Aplicar paginación
      const pageInt = parseInt(page);
      const limitInt = parseInt(limit);
      const offset = (pageInt - 1) * limitInt;
      
      query = query.limit(limitInt).offset(offset);
      
      const snapshot = await query.get();
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 🆕 Calcular información de paginación
      const totalPages = Math.ceil(total / limitInt);
      const hasNextPage = pageInt < totalPages;
      const hasPrevPage = pageInt > 1;
      
      console.log(`🔍 Cobros obtenidos: ${data.length} de ${total} total (página ${pageInt} de ${totalPages})`);
      
      res.json({
        data,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      });
    } catch (queryError) {
      console.error('🔍 Error ejecutando query de Firestore:', queryError);
      console.error('🔍 Query que falló:', query);
      res.status(500).json({ 
        error: 'Error ejecutando consulta en Firestore', 
        details: queryError.message,
        query: 'Query falló al ejecutarse'
      });
      return;
    }
  } catch (error) {
    console.error('Error en /api/cobros:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Endpoint para crear un cobro
app.post("/api/cobros", async (req, res) => {
  try {
    console.log('🆕 Creando nuevo cobro con datos:', req.body);
    
    // 🆕 Determinar vendedorId automáticamente si no se proporciona
    let vendedorId = req.body.vendedorId;
    let cobrador = req.body.cobrador;
    
    if (!vendedorId && req.body.usuario) {
      const usuarioLower = req.body.usuario.toLowerCase();
      
      if (usuarioLower.includes('santi') || usuarioLower.includes('santiago')) {
        vendedorId = 2;
        cobrador = 'Santi';
        console.log(`🆕 Usuario "${req.body.usuario}" -> vendedorId asignado automáticamente: ${vendedorId}, cobrador: ${cobrador}`);
      } else if (usuarioLower.includes('guille') || usuarioLower.includes('guillermo')) {
        vendedorId = 1;
        cobrador = 'Guille';
        console.log(`🆕 Usuario "${req.body.usuario}" -> vendedorId asignado automáticamente: ${vendedorId}, cobrador: ${cobrador}`);
      } else {
        // Si es admin, permitir que asigne manualmente o usar por defecto
        vendedorId = req.body.vendedorId || 1;
        cobrador = req.body.cobrador || 'Guille';
        console.log(`🆕 Usuario "${req.body.usuario}" -> vendedorId: ${vendedorId}, cobrador: ${cobrador} (admin)`);
      }
    }
    
    // 🆕 Asegurar que siempre tenga cobrador si no se proporcionó
    if (!cobrador && req.body.cobrador) {
      cobrador = req.body.cobrador;
    }
    
    // 🆕 Formatear la fecha de creación como string dd/mm/aaaa
    const formatearFechaCreacion = (fecha) => {
      if (!fecha) return new Date().toLocaleDateString('es-AR');
      const dia = fecha.getDate().toString().padStart(2, '0');
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const año = fecha.getFullYear();
      return `${dia}/${mes}/${año}`;
    };

    // 🆕 Formatear la fecha del cobro si viene como objeto Date
    let fechaFormateada = req.body.fecha;
    if (req.body.fecha && typeof req.body.fecha === 'object' && req.body.fecha.toISOString) {
      // Si es un objeto Date, formatearlo
      fechaFormateada = formatearFechaCreacion(req.body.fecha);
      console.log(`🆕 Fecha convertida de Date a string: ${fechaFormateada}`);
    } else if (req.body.fecha && typeof req.body.fecha === 'string') {
      // Si ya es string, verificar formato
      if (req.body.fecha.includes('T') || req.body.fecha.includes('Z')) {
        // Si es formato ISO, convertirlo
        const fechaObj = new Date(req.body.fecha);
        fechaFormateada = formatearFechaCreacion(fechaObj);
        console.log(`🆕 Fecha ISO convertida a dd/mm/aaaa: ${fechaFormateada}`);
      } else {
        // Si ya está en formato dd/mm/aaaa, mantenerla
        fechaFormateada = req.body.fecha;
        console.log(`🆕 Fecha ya en formato correcto: ${fechaFormateada}`);
      }
    }

    const cobroData = {
      ...req.body,
      fecha: fechaFormateada, // 🆕 Fecha formateada como string dd/mm/aaaa
      vendedorId: vendedorId, // 🆕 Asegurar que siempre tenga vendedorId
      cobrador: cobrador, // 🆕 Asegurar que siempre tenga cobrador
      fechaCreacion: formatearFechaCreacion(new Date()), // 🆕 Fecha como string dd/mm/aaaa
      fechaActualizacion: formatearFechaCreacion(new Date()) // 🆕 Fecha como string dd/mm/aaaa
    };
    
    console.log(`🆕 Datos finales del cobro:`, cobroData);
    
    const docRef = await adminDb.collection('cobros').add(cobroData);
    
    res.json({
      id: docRef.id,
      ...cobroData
    });
  } catch (error) {
    console.error('Error creando cobro:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Endpoint para actualizar un cobro
app.put("/api/cobros/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // 🆕 Formatear la fecha de actualización como string dd/mm/aaaa
    const formatearFechaActualizacion = (fecha) => {
      if (!fecha) return new Date().toLocaleDateString('es-AR');
      const dia = fecha.getDate().toString().padStart(2, '0');
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const año = fecha.getFullYear();
      return `${dia}/${mes}/${año}`;
    };

    const updateData = {
      ...req.body,
      fechaActualizacion: formatearFechaActualizacion(new Date())
    };
    
    await adminDb.collection('cobros').doc(id).update(updateData);
    
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error actualizando cobro:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Endpoint para eliminar un cobro
app.delete("/api/cobros/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    await adminDb.collection('cobros').doc(id).delete();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando cobro:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🆕 Endpoint para actualizar masivamente vendedorId de cobros existentes
app.post("/api/cobros/update-vendedor-bulk", async (req, res) => {
  try {
    console.log('🔄 Iniciando actualización masiva de vendedorId en cobros...');
    
    // Obtener todos los cobros que no tienen vendedorId
    // Primero buscar cobros donde vendedorId es null
    const snapshotNull = await adminDb.collection('cobros')
      .where('vendedorId', '==', null)
      .get();
    
    // Luego buscar cobros que no tienen el campo vendedorId (usando get() y filtrando)
    const snapshotAll = await adminDb.collection('cobros').get();
    const cobrosSinVendedorId = snapshotAll.docs.filter(doc => {
      const data = doc.data();
      return !data.vendedorId || data.vendedorId === null || data.vendedorId === undefined;
    });
    
    console.log(`🆕 Cobros con vendedorId null: ${snapshotNull.size}`);
    console.log(`🆕 Cobros sin campo vendedorId: ${cobrosSinVendedorId.length}`);
    
    // Combinar ambos resultados
    const todosLosCobros = [...snapshotNull.docs, ...cobrosSinVendedorId];
    
    // Eliminar duplicados por ID
    const cobrosUnicos = todosLosCobros.filter((cobro, index, self) => 
      index === self.findIndex(c => c.id === cobro.id)
    );
    
    console.log(`🆕 Total de cobros únicos sin vendedorId: ${cobrosUnicos.length}`);
    
    if (cobrosUnicos.length === 0) {
      return res.json({
        success: true,
        message: 'No hay cobros sin vendedorId para actualizar',
        actualizados: 0
      });
    }
    

    

    
    // Actualizar en lotes
    const batch = adminDb.batch();
    let actualizados = 0;
    
    for (const doc of cobrosUnicos) {
      const cobroData = doc.data();
      
        // Determinar vendedorId y cobrador basándose en el cobrador o usuario que creó el cobro
      let vendedorId = null;
      let cobrador = null;
      
      // Primero intentar con el campo cobrador
      if (cobroData.cobrador) {
        cobrador = cobroData.cobrador;
        if (cobroData.cobrador === 'Santi' || cobroData.cobrador === 'Santiago') {
          vendedorId = 2;
        } else if (cobroData.cobrador === 'Guille' || cobroData.cobrador === 'Guillermo') {
          vendedorId = 1;
        }
      }
      
      // Si no se pudo determinar con cobrador, intentar con usuario
      if (!vendedorId && cobroData.usuario) {
        const usuarioLower = cobroData.usuario.toLowerCase();
        
        if (usuarioLower.includes('santi') || usuarioLower.includes('santiago')) {
          vendedorId = 2;
          cobrador = 'Santi';
        } else if (usuarioLower.includes('guille') || usuarioLower.includes('guillermo')) {
          vendedorId = 1;
          cobrador = 'Guille';
        }
      }
      
      // Si no se pudo determinar, asignar por defecto al admin (vendedorId = 1)
      if (!vendedorId) {
        vendedorId = 1;
        cobrador = 'Guille';
        console.log(`🆕 Cobro ${doc.id}: No se pudo determinar vendedor, asignando por defecto: vendedorId=${vendedorId}, cobrador=${cobrador}`);
      }
      
      // Asegurar que siempre tenga cobrador
      if (!cobrador) {
        cobrador = vendedorId === 2 ? 'Santi' : 'Guille';
      }
      
      // Actualizar el documento
      batch.update(doc.ref, { 
        vendedorId: vendedorId,
        cobrador: cobrador,
        fechaActualizacion: new Date()
      });
      
      actualizados++;
      console.log(`🆕 Cobro ${doc.id}: Cobrador "${cobroData.cobrador}", Usuario "${cobroData.usuario}" -> vendedorId: ${vendedorId}`);
    }
    
    // Commit del batch
    await batch.commit();
    
    console.log(`✅ Actualización masiva completada: ${actualizados} cobros actualizados`);
    
    res.json({
      success: true,
      message: `Actualización masiva completada: ${actualizados} cobros actualizados`,
      actualizados: actualizados
    });
    
  } catch (error) {
    console.error('❌ Error en actualización masiva:', error);
    res.status(500).json({ 
      error: error.message,
      success: false 
    });
  }
});

// 🆕 ENDPOINTS PARA LIMPIEZA DE DATOS
app.get("/api/cleanup/stats", async (req, res) => {
  try {
    const colecciones = ['visitas', 'hojasDeRuta', 'cobranzas', 'presupuestos'];
    const stats = {};
    
    for (const coleccion of colecciones) {
      const snapshot = await adminDb.collection(coleccion).get();
      const total = snapshot.size;
      
      // Calcular registros antiguos (más de 30 días para visitas/hojas, 60 para cobranzas/presupuestos)
      const diasLimite = coleccion === 'visitas' || coleccion === 'hojasDeRuta' ? 30 : 60;
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - diasLimite);
      
      const antiguosSnapshot = await adminDb.collection(coleccion)
        .where('fechaCreacion', '<', fechaLimite)
        .get();
      
      const antiguos = antiguosSnapshot.size;
      
      stats[coleccion] = {
        total,
        antiguos,
        porcentaje: total > 0 ? Math.round((antiguos / total) * 100) : 0
      };
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas de limpieza:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/cleanup/preview", async (req, res) => {
  try {
    const { dias, coleccion } = req.query;
    
    if (!dias || !coleccion) {
      return res.status(400).json({ error: 'Se requieren parámetros dias y coleccion' });
    }
    
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - parseInt(dias));
    
    const snapshot = await adminDb.collection(coleccion)
      .where('fechaCreacion', '<', fechaLimite)
      .limit(100) // Limitar a 100 registros para vista previa
      .get();
    
    const registros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({
      coleccion,
      dias,
      total: registros.length,
      registros
    });
  } catch (error) {
    console.error('Error obteniendo vista previa de limpieza:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/cleanup/export", async (req, res) => {
  try {
    const { dias, coleccion } = req.query;
    
    if (!dias || !coleccion) {
      return res.status(400).json({ error: 'Se requieren parámetros dias y coleccion' });
    }
    
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - parseInt(dias));
    
    const snapshot = await adminDb.collection(coleccion)
      .where('fechaCreacion', '<', fechaLimite)
      .get();
    
    const registros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Devolver JSON en lugar de CSV directamente
    res.json({
      coleccion,
      dias,
      total: registros.length,
      registros,
      fechaLimite: fechaLimite.toISOString()
    });
  } catch (error) {
    console.error('Error exportando datos de limpieza:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/cleanup/execute", async (req, res) => {
  try {
    const { dias, coleccion } = req.body;
    
    if (!dias || !coleccion) {
      return res.status(400).json({ error: 'Se requieren parámetros dias y coleccion' });
    }
    
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - parseInt(dias));
    
    // Obtener registros a eliminar
    const snapshot = await adminDb.collection(coleccion)
      .where('fechaCreacion', '<', fechaLimite)
      .get();
    
    const registrosAEliminar = snapshot.docs;
    const totalAEliminar = registrosAEliminar.length;
    
    if (totalAEliminar === 0) {
      return res.json({
        eliminados: 0,
        mensaje: 'No hay registros antiguos para eliminar'
      });
    }
    
    // Eliminar registros en lotes para evitar timeouts
    const batch = adminDb.batch();
    let eliminados = 0;
    
    for (const doc of registrosAEliminar) {
      batch.delete(doc.ref);
      eliminados++;
      
      // Commit cada 500 operaciones para evitar límites
      if (eliminados % 500 === 0) {
        await batch.commit();
        console.log(`Eliminados ${eliminados} registros de ${coleccion}`);
      }
    }
    
    // Commit final
    if (eliminados % 500 !== 0) {
      await batch.commit();
    }
    
    console.log(`Limpieza completada: ${eliminados} registros eliminados de ${coleccion}`);
    
    res.json({
      eliminados,
      coleccion,
      dias,
      mensaje: `Se eliminaron ${eliminados} registros antiguos de ${coleccion}`
    });
  } catch (error) {
    console.error('Error ejecutando limpieza de datos:', error);
    res.status(500).json({ error: error.message });
  }
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Servidor backend escuchando en http://localhost:${PORT}`));

// Endpoint para sincronizar presupuestos desde Alegra a Firebase
app.post("/api/presupuestos/sincronizar-alegra", async (req, res) => {
  try {
    console.log('🔄 Iniciando sincronización de presupuestos desde Alegra...');
    console.log('🆕 Verificando configuración...');
    
    // 🆕 Verificar si Firebase está inicializado
    if (!adminDb) {
      console.warn('⚠️ Firebase no inicializado - no se puede sincronizar');
      return res.status(500).json({ 
        error: 'Firebase no inicializado',
        success: false 
      });
    }
    console.log('✅ Firebase inicializado correctamente');
    
    const email = process.env.ALEGRA_EMAIL?.trim();
    const apiKey = process.env.ALEGRA_API_KEY?.trim();
    
    console.log('🆕 Verificando credenciales de Alegra...');
    console.log('🆕 ALEGRA_EMAIL configurado:', !!email);
    console.log('🆕 ALEGRA_API_KEY configurado:', !!apiKey);
    console.log('🆕 ALEGRA_EMAIL valor:', email ? `${email.substring(0, 3)}...` : 'NO CONFIGURADO');
    console.log('🆕 ALEGRA_API_KEY valor:', apiKey ? `${apiKey.substring(0, 3)}...` : 'NO CONFIGURADO');
    
    if (!email || !apiKey) {
      console.error('❌ Credenciales de Alegra no configuradas');
      console.error('❌ ALEGRA_EMAIL:', email ? 'Configurado' : 'NO CONFIGURADO');
      console.error('❌ ALEGRA_API_KEY:', apiKey ? 'Configurado' : 'NO CONFIGURADO');
      return res.status(500).json({ 
        error: 'Credenciales de Alegra no configuradas',
        success: false 
      });
    }
    console.log('✅ Credenciales de Alegra configuradas correctamente');
    
    // 🆕 Obtener presupuestos de Alegra (últimos 30 días)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 30);
    const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
    
    console.log(`🔄 Obteniendo presupuestos de Alegra desde ${fechaLimiteStr}...`);
    
    const url = `https://api.alegra.com/api/v1/estimates?date_afterOrNow=${fechaLimiteStr}&limit=30`;
    const authorization = 'Basic ' + Buffer.from(email + ':' + apiKey).toString('base64');
    
    console.log('🆕 URL de Alegra:', url);
    console.log('🆕 Authorization header:', authorization.substring(0, 20) + '...');
    
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        authorization
      }
    });
    
    console.log('🆕 Response status:', response.status);
    console.log('🆕 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error obteniendo presupuestos de Alegra:', errorText);
      console.error('❌ Status:', response.status);
      console.error('❌ Status text:', response.statusText);
      return res.status(500).json({ 
        error: `Error obteniendo presupuestos de Alegra: ${errorText}`,
        success: false 
      });
    }
    
    const alegraPresupuestos = await response.json();
    console.log(`🔄 Presupuestos obtenidos de Alegra: ${alegraPresupuestos.length}`);
    
    if (alegraPresupuestos.length > 0) {
      console.log('🆕 Primer presupuesto de Alegra:', {
        id: alegraPresupuestos[0].id,
        status: alegraPresupuestos[0].status,
        date: alegraPresupuestos[0].date,
        client: alegraPresupuestos[0].client?.name
      });
    }
    
    // 🆕 Obtener presupuestos existentes en Firebase
    const firebaseSnapshot = await adminDb.collection('presupuestos').get();
    const firebasePresupuestos = firebaseSnapshot.docs.map(doc => doc.data());
    const firebaseIds = firebasePresupuestos.map(p => p.alegraId).filter(id => id);
    
    console.log(`🔄 Presupuestos existentes en Firebase: ${firebasePresupuestos.length}`);
    console.log(`🔄 IDs de Alegra en Firebase: ${firebaseIds.length}`);
    
    // 🆕 Filtrar presupuestos de Alegra que no están en Firebase
    const presupuestosParaSincronizar = alegraPresupuestos.filter(presupuesto => {
      return !firebaseIds.includes(presupuesto.id.toString());
    });
    
    console.log(`🔄 Presupuestos para sincronizar: ${presupuestosParaSincronizar.length}`);
    
    if (presupuestosParaSincronizar.length === 0) {
      return res.json({
        success: true,
        message: 'No hay presupuestos nuevos para sincronizar',
        sincronizados: 0
      });
    }
    
    // 🆕 Sincronizar presupuestos a Firebase
    let sincronizados = 0;
    const errores = [];
    
    for (const presupuesto of presupuestosParaSincronizar) {
      try {
        // 🆕 Crear documento en Firebase
        const presupuestoData = {
          alegraId: presupuesto.id.toString(),
          clienteId: presupuesto.client?.id?.toString() || '',
          clienteNombre: presupuesto.client?.name || '',
          fechaCreacion: new Date(presupuesto.date),
          estado: presupuesto.status, // Usar el estado real de Alegra (billed/unbilled)
          total: presupuesto.total || 0,
          items: presupuesto.items || [],
          observaciones: presupuesto.observations || '',
          usuario: 'Sincronizado desde Alegra',
          vendedor: 1, // Default
          sincronizadoDesdeAlegra: true,
          fechaSincronizacion: new Date()
        };
        
        await adminDb.collection('presupuestos').add(presupuestoData);
        sincronizados++;
        console.log(`✅ Presupuesto ${presupuesto.id} sincronizado`);
        
      } catch (error) {
        console.error(`❌ Error sincronizando presupuesto ${presupuesto.id}:`, error);
        errores.push({
          id: presupuesto.id,
          error: error.message
        });
      }
    }
    
    console.log(`🔄 Sincronización completada: ${sincronizados} presupuestos sincronizados`);
    
    return res.json({
      success: true,
      message: `Sincronización completada: ${sincronizados} presupuestos sincronizados`,
      sincronizados,
      errores: errores.length > 0 ? errores : undefined
    });
    
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    res.status(500).json({ 
      error: error.message,
      success: false 
    });
  }
});

