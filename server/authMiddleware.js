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

export function crearAuthMiddleware(adminDb) {
  return async function requireAuth(req, res, next) {
    if (rutaPublica(req.path)) {
      return next();
    }
    if (!req.path.startsWith('/api')) {
      return next();
    }

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    try {
      const decoded = await getAuth().verifyIdToken(token);
      const email = decoded.email;
      if (!email) {
        return res.status(401).json({ error: 'No autenticado' });
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

      if (esSoloAdmin(req.path) && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      return next();
    } catch {
      return res.status(401).json({ error: 'No autenticado' });
    }
  };
}
