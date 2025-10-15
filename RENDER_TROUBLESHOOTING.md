# Guía de Solución de Problemas en Render

## Problema: "Failed to fetch" al conectar con el backend

### Causas Comunes:
1. ✅ **Servicio "dormido"** - Render Free Tier duerme el servicio después de 15 minutos de inactividad
2. ⚠️ **Variables de entorno faltantes** - Firebase y Alegra necesitan credenciales
3. 🐛 **Errores en el servidor** - Falta dependencia `node-fetch` (YA CORREGIDO)

---

## Pasos para Resolver

### 1️⃣ Verificar el Estado del Servicio en Render

1. Ve a [render.com](https://render.com) e inicia sesión
2. Busca tu servicio `sist-gestion-dcg`
3. Revisa el estado:
   - 🟢 **Live** - El servicio está funcionando
   - 🟡 **Building** - Se está construyendo
   - 🔴 **Failed** - Hay un error

### 2️⃣ Ver los Logs del Servicio

En Render:
1. Haz clic en tu servicio `sist-gestion-dcg`
2. Ve a la pestaña **"Logs"**
3. Busca errores en rojo, especialmente:
   - ❌ `Error: Cannot find module 'node-fetch'` (YA CORREGIDO)
   - ❌ `Firebase no inicializado`
   - ❌ `FIREBASE_PRIVATE_KEY: ❌ No configurado`
   - ❌ `ALEGRA_EMAIL: ❌ No configurado`

### 3️⃣ Configurar Variables de Entorno

Si ves errores de Firebase o Alegra, necesitas configurar las variables de entorno:

#### En Render Dashboard:

1. Ve a tu servicio → **"Environment"** (lado izquierdo)
2. Agrega las siguientes variables (haz clic en "Add Environment Variable"):

**Variables de Firebase:**
```
FIREBASE_PROJECT_ID=planilla-cobranzas
FIREBASE_PRIVATE_KEY=(tu clave privada de Firebase)
FIREBASE_CLIENT_EMAIL=(tu email del service account)
FIREBASE_CLIENT_ID=(tu client ID)
FIREBASE_PRIVATE_KEY_ID=(tu private key ID)
FIREBASE_CLIENT_X509_CERT_URL=(tu cert URL)
```

**Variables de Alegra:**
```
ALEGRA_EMAIL=(tu email de Alegra)
ALEGRA_API_KEY=(tu API key de Alegra)
```

**IMPORTANTE:** Para obtener las credenciales de Firebase:
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto `planilla-cobranzas`
3. Ve a **Configuración del proyecto** (⚙️) → **Cuentas de servicio**
4. Haz clic en **"Generar nueva clave privada"**
5. Se descargará un archivo JSON con todas las credenciales
6. Copia cada campo del JSON a las variables de entorno en Render

**NOTA sobre FIREBASE_PRIVATE_KEY:**
- El valor incluye saltos de línea (`\n`)
- Cópialo TAL CUAL del JSON (con los `\n`)
- Ejemplo: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n`

### 4️⃣ Subir los Cambios a Render

Después de agregar `node-fetch` al `package.json`:

#### Opción A: Usando Git (Recomendado)

```bash
# Desde la raíz del proyecto
git add server/package.json
git commit -m "fix: agregar node-fetch a dependencias del servidor"
git push origin main
```

Render detectará el cambio y redesplegar automáticamente.

#### Opción B: Redeploy Manual en Render

1. Ve a tu servicio en Render
2. Haz clic en **"Manual Deploy"** → **"Deploy latest commit"**

### 5️⃣ Verificar que el Servicio Esté Funcionando

Después del deploy (toma 2-3 minutos):

1. Ve a la URL de tu backend: `https://sist-gestion-dcg.onrender.com/api/alegra/contacts`
2. Si ves un JSON con datos, ¡está funcionando! ✅
3. Si ves error 500 o 404, revisa los logs nuevamente

---

## Tiempo de Respuesta del Servicio

⚠️ **IMPORTANTE:** En el plan gratuito de Render:
- El servicio **se duerme** después de 15 minutos sin uso
- **Tarda 1-2 minutos** en despertar la primera vez
- Los usuarios verán "Verificando conexión..." durante este tiempo
- Después de despertar, funciona normalmente

### Solución para Evitar que se Duerma:

1. **Upgrade a plan de pago** ($7/mes) - Mantiene el servicio siempre activo
2. **Usar un servicio de ping** (no recomendado) - Hace requests cada 10 minutos

---

## Checklist de Verificación

Antes de usar el sistema en producción, verifica:

- [ ] ✅ `node-fetch` agregado al `package.json` del servidor
- [ ] ✅ Variables de Firebase configuradas en Render
- [ ] ✅ Variables de Alegra configuradas en Render
- [ ] ✅ Servicio desplegado y en estado "Live"
- [ ] ✅ Logs sin errores en rojo
- [ ] ✅ URL del backend responde con datos: `https://sist-gestion-dcg.onrender.com/api/alegra/contacts`
- [ ] ✅ Frontend puede conectarse al backend

---

## Comandos Útiles

### Ver estado del backend desde terminal:

```bash
# Probar el endpoint de contactos
curl https://sist-gestion-dcg.onrender.com/api/alegra/contacts

# Probar con timeout extendido (para cuando está despertando)
curl --max-time 120 https://sist-gestion-dcg.onrender.com/api/alegra/contacts
```

---

## Contacto de Soporte

Si después de seguir estos pasos el problema persiste:
1. Copia los logs de Render (últimas 50 líneas)
2. Verifica que todas las variables de entorno estén configuradas
3. Intenta hacer un nuevo deploy manual
4. Si aún falla, considera migrar a otro servicio (Railway, Heroku, etc.)

---

## Alternativas a Render

Si Render no funciona bien, puedes considerar:
- **Railway** - Similar a Render, plan gratuito
- **Heroku** - $5/mes, más estable
- **Fly.io** - Plan gratuito generoso
- **DigitalOcean App Platform** - $5/mes

---

**Fecha de creación:** Octubre 2025
**Última actualización:** Octubre 2025

