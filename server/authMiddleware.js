import { getAuth } from 'firebase-admin/auth';

const ROLES_VALIDOS = ['admin', 'Santi', 'Guille', 'Victor'];

function rutaPublica(path) {
  return path === '/api/health' || path.startsWith('/api/telegram/');
}

function esSoloAdmin(path) {
  return (
    path.startsWith('/api/cleanup') ||
    path === '/api/cache/invalidate' ||
    path === '/api/cache/refresh' ||
    path === '/api/alegra/estimates' ||
    path.startsWith('/api/sync-') ||
    path === '/api/cobros/update-vendedor-bulk' ||
    path === '/api/visitas/generar' ||
    path.startsWith('/api/hojas-de-ruta') ||
    path === '/api/presupuestos/sincronizar-alegra' ||
    path === '/api/comisiones/reglas' ||
    path === '/api/comisiones/reglas/seed' ||
    path.startsWith('/api/comisiones/sync-facturas') ||
    path.startsWith('/api/comisiones/calcular') ||
    path.startsWith('/api/comisiones/cerrar') ||
    path === '/api/comisiones/ajuste' ||
    path.startsWith('/api/comisiones/pagar') ||
    path.startsWith('/api/comisiones/flete/calcular')
  );
}

function primerHeader(value) {
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
}

function extraerToken(req) {
  const auth = String(primerHeader(req.headers.authorization)).trim();
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    if (token) {
      return token;
    }
  }

  const alt = String(primerHeader(req.headers['x-firebase-token'])).trim();
  if (alt.startsWith('Bearer ')) {
    return alt.slice(7).trim();
  }
  return alt;
}

export function crearAuthMiddleware(adminDb) {
  return async function requireAuth(req, res, next) {
    if (req.method === 'OPTIONS') {
      return next();
    }

    const path = (req.originalUrl || req.url || '').split('?')[0];

    if (rutaPublica(path)) {
      return next();
    }
    if (!path.startsWith('/api')) {
      return next();
    }

    const token = extraerToken(req);
    if (!token) {
      console.error('[AUTH] NO_TOKEN', req.method, path);
      return res.status(401).json({ error: 'No autenticado', code: 'NO_TOKEN' });
    }

    try {
      const decoded = await getAuth().verifyIdToken(token);
      const email = decoded.email;
      if (!email) {
        console.error('[AUTH] INVALID_TOKEN missing email', req.method, path);
        return res.status(401).json({ error: 'No autenticado', code: 'INVALID_TOKEN' });
      }

      const snap = await adminDb.collection('usuarios').doc(email).get();
      if (!snap.exists) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const data = snap.data() || {};
      if (!data.role || !ROLES_VALIDOS.includes(data.role)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      req.user = {
        email,
        role: data.role,
        name: data.name || ''
      };

      if (esSoloAdmin(path) && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      return next();
    } catch (error) {
      console.error('[AUTH] INVALID_TOKEN', error?.code || error?.message || error, req.method, path);
      return res.status(401).json({ error: 'No autenticado', code: 'INVALID_TOKEN' });
    }
  };
}
