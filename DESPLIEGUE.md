# Guía de Despliegue — ParkSystem

Stack recomendado (todo gratuito o con crédito inicial):
- **Frontend** → Vercel (gratis)
- **Backend** → Render (gratis)
- **Base de datos** → Railway (MySQL, $5 USD crédito gratuito)

---

## PASO 1 — Preparar la base de datos en Railway

1. Ir a [railway.app](https://railway.app) y crear cuenta (con GitHub)
2. Click **"New Project"** → **"Deploy MySQL"**
3. Esperar que provisione (1-2 min)
4. Click en el servicio MySQL → pestaña **"Variables"**
5. Copiar estos valores (los necesitarás en el paso 2):
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`

6. Conectarte a la base de datos para ejecutar el schema:
   - En Railway → pestaña **"Data"** → click **"Query"**
   - Pegar el contenido completo de `backend/database/schema.sql`
   - Click **"Run"**

---

## PASO 2 — Subir el código a GitHub

Si aún no tienes Git, descárgalo de [git-scm.com](https://git-scm.com)

```bash
# Desde la carpeta parqueadero/
git init
git add .
git commit -m "Initial commit"
```

Luego en [github.com](https://github.com):
1. Click **"New repository"** → nombre: `parqueadero`
2. **No** marcar "Initialize with README"
3. Copiar los comandos que te da GitHub y ejecutarlos:

```bash
git remote add origin https://github.com/TU_USUARIO/parqueadero.git
git branch -M main
git push -u origin main
```

---

## PASO 3 — Desplegar el Backend en Render

1. Ir a [render.com](https://render.com) → crear cuenta con GitHub
2. Click **"New"** → **"Web Service"**
3. Conectar el repositorio `parqueadero`
4. Configurar:
   - **Name:** `parqueadero-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/app.js`
   - **Instance Type:** Free

5. Agregar variables de entorno (click **"Add Environment Variable"**):

   | Key | Value |
   |-----|-------|
   | `DB_HOST` | (valor MYSQL_HOST de Railway) |
   | `DB_PORT` | (valor MYSQL_PORT de Railway) |
   | `DB_USER` | (valor MYSQL_USER de Railway) |
   | `DB_PASSWORD` | (valor MYSQL_PASSWORD de Railway) |
   | `DB_NAME` | (valor MYSQL_DATABASE de Railway) |
   | `JWT_SECRET` | (inventa una clave larga, ej: `mi_clave_super_secreta_2024`) |
   | `JWT_EXPIRES_IN` | `8h` |
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |

6. Click **"Create Web Service"**
7. Esperar el despliegue (3-5 min) — copiar la URL que te da Render, ejemplo:
   `https://parqueadero-backend.onrender.com`

---

## PASO 4 — Desplegar el Frontend en Vercel

1. Ir a [vercel.com](https://vercel.com) → crear cuenta con GitHub
2. Click **"Add New Project"** → seleccionar el repositorio `parqueadero`
3. En **"Configure Project"**:
   - **Root Directory:** click **Edit** → escribir `frontend`
   - **Framework Preset:** Vite (se detecta automáticamente)
4. Agregar variable de entorno:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://parqueadero-backend.onrender.com/api` |

5. Click **"Deploy"**
6. Esperar 2-3 min → Vercel te dará una URL como:
   `https://parqueadero.vercel.app`

---

## PASO 5 — Conectar Frontend con Backend

En el archivo `frontend/src/services/api.js`, cambiar la baseURL para producción:

```js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});
```

Y en `frontend/vite.config.js`, el proxy solo aplica en desarrollo local, en producción Vercel usará la variable `VITE_API_URL`.

Luego hacer commit y push para que Vercel redesplegua automáticamente:

```bash
git add .
git commit -m "Configure API URL for production"
git push
```

---

## PASO 6 — Configurar CORS en el Backend

Editar `backend/src/app.js` para permitir la URL de Vercel:

```js
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://parqueadero.vercel.app',  // <- tu URL real de Vercel
  ],
  credentials: true,
}));
```

Commit y push → Render redesplegará automáticamente.

---

## PASO 7 — Verificar que todo funcione

1. Abrir `https://parqueadero.vercel.app`
2. Ingresar con `admin` / `admin123`
3. Verificar que el dashboard carga datos
4. Crear un operario de prueba y verificar login

---

## Resumen de URLs

| Servicio | URL ejemplo |
|----------|-------------|
| App web | `https://parqueadero.vercel.app` |
| API backend | `https://parqueadero-backend.onrender.com` |
| Base de datos | Railway (solo acceso interno) |

---

## Notas importantes

- **Render gratis** pone el servidor a dormir después de 15 min sin tráfico.
  La primera petición tarda ~30 segundos en "despertar". Para evitarlo,
  considera el plan Starter ($7/mes) o usa [UptimeRobot](https://uptimerobot.com)
  para hacer ping cada 14 min gratis.

- **Railway** ofrece $5 USD de crédito. Una base de datos MySQL pequeña
  consume aprox. $0.50–1 USD/mes, por lo que dura varios meses.

- Cada `git push` a `main` redesplegará automáticamente tanto Vercel como Render.
