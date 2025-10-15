# 🚨 SOLUCIÓN RÁPIDA - Backend No Responde en Render

## ⏱️ Tiempo estimado: 10-15 minutos

---

## 🔴 PASO 1: Subir el Fix de `node-fetch` (2 minutos)

El servidor necesita la dependencia `node-fetch` que acabamos de agregar:

```bash
# Desde la raíz de tu proyecto
cd /c/Users/gerec/cobranzas-app

# Agregar los cambios
git add server/package.json

# Hacer commit
git commit -m "fix: agregar node-fetch al servidor"

# Subir a GitHub (esto activará el redeploy en Render)
git push origin main
```

Render detectará el cambio y empezará a redesplegar automáticamente (toma 2-3 minutos).

---

## 🟡 PASO 2: Configurar Variables de Entorno en Render (5 minutos)

### 2.1 Ir a Render

1. Ve a https://dashboard.render.com
2. Busca tu servicio: `sist-gestion-dcg`
3. Haz clic en el servicio

### 2.2 Ir a Environment Variables

1. En el menú lateral izquierdo, haz clic en **"Environment"**
2. Verás una lista de variables (si hay alguna)

### 2.3 Agregar Variables de Firebase

Necesitas obtener las credenciales de Firebase:

**¿Cómo obtener las credenciales?**
1. Ve a https://console.firebase.google.com
2. Selecciona tu proyecto: `planilla-cobranzas`
3. Haz clic en el ⚙️ (Configuración) → **"Configuración del proyecto"**
4. Ve a la pestaña **"Cuentas de servicio"**
5. Haz clic en **"Generar nueva clave privada"**
6. Se descargará un archivo JSON

**En Render, agrega estas variables:**

Haz clic en "Add Environment Variable" para cada una:

| Key | Value (del JSON descargado) |
|-----|------------------------------|
| `FIREBASE_PROJECT_ID` | Copia el valor de `project_id` del JSON |
| `FIREBASE_PRIVATE_KEY` | Copia el valor de `private_key` del JSON (incluye los `\n`) |
| `FIREBASE_CLIENT_EMAIL` | Copia el valor de `client_email` del JSON |
| `FIREBASE_CLIENT_ID` | Copia el valor de `client_id` del JSON |
| `FIREBASE_PRIVATE_KEY_ID` | Copia el valor de `private_key_id` del JSON |
| `FIREBASE_CLIENT_X509_CERT_URL` | Copia el valor de `client_x509_cert_url` del JSON |

**⚠️ MUY IMPORTANTE:** 
- Para `FIREBASE_PRIVATE_KEY`, copia el valor TAL CUAL del JSON
- Debe incluir `-----BEGIN PRIVATE KEY-----\n....\n-----END PRIVATE KEY-----\n`
- NO quites los `\n`

### 2.4 Agregar Variables de Alegra

| Key | Value |
|-----|-------|
| `ALEGRA_EMAIL` | Tu email de Alegra |
| `ALEGRA_API_KEY` | Tu API Key de Alegra |

**¿Dónde encontrar las credenciales de Alegra?**
1. Ve a https://app.alegra.com
2. Menú → Configuración → Integraciones → API
3. Ahí verás tu email y puedes generar una API Key

---

## 🟢 PASO 3: Forzar Redeploy (1 minuto)

Después de agregar las variables de entorno:

1. En Render, en la parte superior derecha, haz clic en **"Manual Deploy"**
2. Selecciona **"Deploy latest commit"**
3. Espera 2-3 minutos a que termine el deploy

---

## ✅ PASO 4: Verificar que Funciona (2 minutos)

### 4.1 Ver los Logs

1. En Render, ve a la pestaña **"Logs"** (menú lateral izquierdo)
2. Verifica que NO haya errores en rojo
3. Deberías ver mensajes como:
   ```
   ✅ Firebase Admin inicializado con variables de entorno
   Servidor backend escuchando en http://localhost:3001
   ```

### 4.2 Probar el Backend

Abre esta URL en tu navegador:
```
https://sist-gestion-dcg.onrender.com/api/alegra/contacts
```

**¿Qué deberías ver?**
- ✅ **Un JSON con datos de clientes** - ¡Funciona!
- ❌ **Error 500 o página en blanco** - Revisa los logs en Render
- ⏳ **Cargando por 1-2 minutos** - Normal, el servicio se está despertando

### 4.3 Probar desde tu Aplicación

1. Abre tu aplicación en Vercel: `https://gestion-dcg.vercel.app`
2. Intenta iniciar sesión o cargar datos
3. Deberías ver el mensaje: **"✅ Backend conectado"**

---

## 🐛 Si Aún No Funciona

### Opción 1: Revisar Logs Detallados

En Render → Logs, busca estos errores:

❌ **"Cannot find module 'node-fetch'"**
- Solución: Asegúrate de haber hecho `git push` del cambio en `package.json`

❌ **"Firebase no inicializado"**
- Solución: Verifica que todas las variables de Firebase estén configuradas

❌ **"FIREBASE_PRIVATE_KEY: ❌ No configurado"**
- Solución: Revisa que `FIREBASE_PRIVATE_KEY` tenga el formato correcto

❌ **"Error: invalid_grant"**
- Solución: Regenera las credenciales de Firebase y vuelve a configurarlas

### Opción 2: Verificar desde Terminal

Prueba hacer una petición con curl:

```bash
curl --max-time 120 https://sist-gestion-dcg.onrender.com/api/alegra/contacts
```

Si funciona desde terminal pero no desde tu app, el problema es de CORS o del frontend.

### Opción 3: Restart Manual

En Render:
1. Ve a la pestaña **"Settings"** (menú lateral)
2. Scroll hasta el final
3. Haz clic en **"Restart"**

---

## ⏰ Sobre el Tiempo de Respuesta

⚠️ **Normal en plan gratuito de Render:**
- Primera carga después de inactividad: **1-2 minutos**
- Cargas subsecuentes: **inmediatas**
- El servicio se "duerme" después de **15 minutos** sin uso

**Soluciones:**
1. **Esperar** - Es normal, solo tarda la primera vez
2. **Upgrade a plan de pago** ($7/mes) - El servicio nunca se duerme
3. **Migrar a otro servicio** - Railway, Heroku, Fly.io

---

## 📋 Checklist Final

Antes de decir "¡Ya funciona!", verifica:

- [ ] ✅ `git push` realizado con el cambio de `package.json`
- [ ] ✅ Variables de Firebase configuradas en Render (6 variables)
- [ ] ✅ Variables de Alegra configuradas en Render (2 variables)
- [ ] ✅ Deploy completado sin errores
- [ ] ✅ Logs sin mensajes de error en rojo
- [ ] ✅ URL del backend responde: `https://sist-gestion-dcg.onrender.com/api/alegra/contacts`
- [ ] ✅ Frontend muestra "✅ Backend conectado"

---

## 🆘 Ayuda Adicional

Si después de estos pasos el problema persiste:

1. **Copia los logs** de Render (últimas 100 líneas)
2. **Toma screenshot** de tus variables de entorno en Render (oculta los valores sensibles)
3. **Prueba el endpoint** con curl y comparte el resultado

---

**Creado:** Octubre 2025
**Para:** Sistema de Cobranzas DCG
**Servicio:** Render - https://sist-gestion-dcg.onrender.com

