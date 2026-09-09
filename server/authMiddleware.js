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
    path.startsWith('/api/comisiones/sync-periodo') ||
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

function extraerCandidatos(req) {
  const candidatos = [];
  const auth = String(primerHeader(req.headers.authorization)).trim();
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    if (token) {
      candidatos.push(token);
    }
  }

  const alt = String(primerHeader(req.headers['x-firebase-token'])).trim();
  const altToken = alt.startsWith('Bearer ') ? alt.slice(7).trim() : alt;
  if (altToken && !candidatos.includes(altToken)) {
    candidatos.push(altToken);
  }
  return candidatos;
}

function emailDesdeToken(decoded) {
  if (decoded?.email) {
    return decoded.email;
  }
  const identities = decoded?.firebase?.identities?.email;
  if (Array.isArray(identities) && identities[0]) {
    return identities[0];
  }
  return '';
}

function esQuotaFirestore(error) {
  const code = error?.code;
  return code === 8 || code === '8' || String(error?.message || '').includes('RESOURCE_EXHAUSTED');
}

async function resolverEmail(decoded) {
  const desdeToken = emailDesdeToken(decoded);
  if (desdeToken) {
    return desdeToken;
  }
  const record = await getAuth().getUser(decoded.uid);
  return record.email || '';
}

async function cargarUsuario(adminDb, email) {
  const exacto = await adminDb.collection('usuarios').doc(email).get();
  if (exacto.exists) {
    return exacto;
  }
  const lower = email.toLowerCase();
  if (lower !== email) {
    return adminDb.collection('usuarios').doc(lower).get();
  }
  return exacto;
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

    const candidatos = extraerCandidatos(req);
    if (!candidatos.length) {
      console.error('[AUTH] NO_TOKEN', req.method, path);
      return res.status(401).json({ error: 'No autenticado', code: 'NO_TOKEN' });
    }

    let decoded = null;
    let lastVerifyError = null;
    for (const token of candidatos) {
      try {
        decoded = await getAuth().verifyIdToken(token);
        lastVerifyError = null;
        break;
      } catch (error) {
        lastVerifyError = error;
      }
    }

    if (!decoded) {
      console.error(
        '[AUTH] INVALID_TOKEN',
        lastVerifyError?.code || lastVerifyError?.message || lastVerifyError,
        req.method,
        path
      );
      return res.status(401).json({ error: 'No autenticado', code: 'INVALID_TOKEN' });
    }

    try {
      const email = await resolverEmail(decoded);
      if (!email) {
        console.error('[AUTH] MISSING_EMAIL', req.method, path);
        return res.status(401).json({ error: 'No autenticado', code: 'MISSING_EMAIL' });
      }

      let snap;
      try {
        snap = await cargarUsuario(adminDb, email);
      } catch (error) {
        if (esQuotaFirestore(error)) {
          console.error('[AUTH] FIRESTORE_QUOTA', req.method, path);
          return res.status(503).json({ error: 'Servicio saturado', code: 'FIRESTORE_QUOTA' });
        }
        throw error;
      }

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
      if (esQuotaFirestore(error)) {
        console.error('[AUTH] FIRESTORE_QUOTA', req.method, path);
        return res.status(503).json({ error: 'Servicio saturado', code: 'FIRESTORE_QUOTA' });
      }
      console.error('[AUTH] LOOKUP_ERROR', error?.code || error?.message || error, req.method, path);
      return res.status(401).json({ error: 'No autenticado', code: 'INVALID_TOKEN' });
    }
  };
}
