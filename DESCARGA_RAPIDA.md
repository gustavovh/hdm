# ⚡ DESCARGA RÁPIDA - Sistema HDM

## 🎯 OBJETIVO

Instalar y ejecutar el sistema HDM en tu computadora local.

---

## 📋 RESUMEN EN 3 PASOS

### 1️⃣ DESCARGAR EL PROYECTO

**Necesitas obtener todos los archivos del proyecto en tu computadora.**

Opciones para descargar:

#### Opción A: Desde la interfaz actual
- Busca un botón **"Download"**, **"Export"** o **"Descargar proyecto"**
- Guarda el archivo ZIP
- Descomprímelo en una carpeta (ej: `C:\Proyectos\hdm-system`)

#### Opción B: Crear un ZIP manualmente
Si tienes acceso a estos archivos, crea una carpeta con:
- Todos los archivos que ves listados
- Las carpetas: `src/`, `supabase/`, `node_modules/` (opcional, se puede instalar después)
- Los archivos de configuración: `.env`, `package.json`, etc.

---

### 2️⃣ INSTALAR Y EJECUTAR

Una vez descargado, abre una terminal en la carpeta del proyecto y ejecuta:

```bash
# Instalar dependencias (solo la primera vez)
npm install

# Iniciar el servidor
npm run dev
```

Verás algo como:
```
Local: http://localhost:5173/
```

---

### 3️⃣ CREAR USUARIO Y ACCEDER

1. **Crear usuario en Supabase:**
   - Ve a: https://app.supabase.com
   - Authentication → Users → Add user
   - Email: `admin@hdm.com`
   - Password: `Admin123456!`
   - ☑ **Auto Confirm User?**

2. **Acceder:**
   - Abre: http://localhost:5173
   - Login con: `admin@hdm.com` / `Admin123456!`

---

## 📦 ARCHIVOS NECESARIOS

El proyecto debe contener estos archivos principales:

```
hdm-system/
├── .env                          ← Configuración Supabase
├── package.json                  ← Dependencias
├── package-lock.json            ← Lock de dependencias
├── vite.config.ts               ← Config Vite
├── tsconfig.json                ← Config TypeScript
├── index.html                   ← HTML principal
├── src/                         ← Código fuente
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   ├── contexts/
│   ├── lib/
│   ├── pages/
│   ├── services/
│   └── types/
└── supabase/
    └── migrations/              ← Migraciones DB
```

---

## 🚨 REQUISITOS

Antes de empezar, necesitas:

- **Node.js v18+** instalado ([descargar](https://nodejs.org/))
- Terminal o Command Prompt
- Navegador web moderno

Verifica que tengas Node.js:
```bash
node --version
# Debe mostrar: v18.x.x o superior
```

---

## 🆘 ¿CÓMO DESCARGAR DESDE AQUÍ?

Si estás viendo esto en una interfaz de chat/IDE:

1. **Busca opciones de exportación:**
   - Botón "Download project"
   - Menú "File" → "Export"
   - Opción "Download as ZIP"

2. **Si no hay opción de descarga:**
   - Pregunta: "¿Cómo puedo descargar todos estos archivos?"
   - O menciona la plataforma que estás usando (ej: "Estoy en Bolt.new, ¿cómo descargo?")

3. **Si tienes acceso a Git:**
   ```bash
   # Si el proyecto está en un repositorio
   git clone <URL_DEL_REPO>
   ```

---

## ✅ CHECKLIST DE DESCARGA

- [ ] Tengo Node.js instalado (v18+)
- [ ] He descargado todos los archivos del proyecto
- [ ] Los archivos están en una carpeta en mi computadora
- [ ] Puedo abrir una terminal en esa carpeta
- [ ] El archivo `.env` existe con las credenciales de Supabase
- [ ] El archivo `package.json` existe

---

## 📖 GUÍAS COMPLETAS

Una vez descargado, consulta:

- **INSTALACION_LOCAL.md** - Guía completa de instalación paso a paso
- **PASOS_ACCESO.md** - Cómo crear usuarios y acceder
- **README.md** - Documentación completa del proyecto

---

## 💡 SIGUIENTE PASO

Una vez descargado el proyecto:

```bash
# Ir a la carpeta del proyecto
cd ruta/a/hdm-system

# Instalar dependencias
npm install

# Iniciar servidor
npm run dev

# Abrir http://localhost:5173 en tu navegador
```

---

**¿No sabes cómo descargar desde donde estás?**

Menciona la plataforma o herramienta que estás usando y te daré instrucciones específicas.

Ejemplos:
- "Estoy en Bolt.new"
- "Estoy en Claude Code"
- "Estoy en GitHub Codespaces"
- "Estoy en VS Code en la nube"
