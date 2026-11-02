# 🚀 Guía de Despliegue en Vercel - MedConsulta DNT Perú

La aplicación ya está configurada con:
- Enrutamiento SPA en `vercel.json`
- Serverless Functions en `/api/index.ts` para consultas DNI (RENIEC) y RUC (SUNAT)
- Base de datos centralizada en Firebase Firestore en tiempo real
- Autenticación con Roles (RBAC: Médico, Enfermero, Digitador, Administrador)

---

## ⚡ Opción Inmediata (Sin Desplegar)
Tu aplicación ya cuenta con una URL pública activa en Cloud Run con sincronización en tiempo real:
**URL:** [https://ais-pre-fpnnjb7yfv7o6qs57gpdwr-271837487331.us-west2.run.app](https://ais-pre-fpnnjb7yfv7o6qs57gpdwr-271837487331.us-west2.run.app)

Puedes abrir este enlace ahora mismo desde cualquier teléfono móvil, tablet o PC.

---

## 📦 Método 1: Despliegue desde GitHub a Vercel (Recomendado)

### Paso 1: Subir el código a GitHub
1. Crea un repositorio nuevo en [github.com](https://github.com/new) (ej. `medconsulta-dnt-peru`).
2. En tu terminal local, inicializa y sube tu proyecto:
```bash
git init
git add .
git commit -m "feat: MedConsulta DNT con sincronizacion tiempo real y Vercel ready"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

### Paso 2: Importar en Vercel
1. Ingresa a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en el botón **"Add New..."** y luego en **"Project"**.
3. Selecciona tu repositorio recién creado y presiona **"Import"**.

### Paso 3: Configurar Ajustes de Construcción (Build Settings)
Vercel detectará la configuración automáticamente gracias a `vercel.json`:
- **Framework Preset:** Vite
- **Root Directory:** `./`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Paso 4: Variables de Entorno (Environment Variables)
En la sección **Environment Variables** en Vercel, agrega:
- `APISPERU_TOKEN`: Token Bearer de apisperu.com para consultas de DNI y RUC.
- `NODE_ENV`: `production`

### Paso 5: Desplegar
- Haz clic en **"Deploy"**.
- En unos 60 segundos, Vercel te entregará una URL del tipo:
  `https://medconsulta-dnt-peru.vercel.app`

---

## 💻 Método 2: Despliegue con Vercel CLI (Línea de Comandos)

Si prefieres desplegar directamente desde la terminal:
```bash
# 1. Instalar o ejecutar CLI de Vercel
npx vercel

# 2. Seguir las preguntas interactivas:
# - Set up and deploy? -> Y
# - Which scope? -> (tu cuenta)
# - Link to existing project? -> N
# - Project name? -> medconsulta-dnt
# - In which directory? -> ./
# - Want to modify settings? -> N

# 3. Para producción final:
npx vercel --prod
```

---

## 🔐 Configuración de Firebase para tu dominio Vercel

Para que el inicio de sesión con Google funcione en tu nuevo enlace de Vercel:
1. Abre [Firebase Console](https://console.firebase.google.com).
2. Selecciona el proyecto del aplicativo: `gen-lang-client-0214841855`.
3. Ve a **Authentication** -> pestaña **Settings** (Configuración) -> **Authorized domains** (Dominios autorizados).
4. Haz clic en **"Add domain"** y pega tu dominio de Vercel (ejemplo: `tu-proyecto.vercel.app`).
5. ¡Listo! La base de datos Firestore y la autenticación funcionarán sincronizados en tiempo real en todos tus equipos.
