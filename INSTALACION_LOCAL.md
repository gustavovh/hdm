# 💻 INSTALACIÓN LOCAL DEL SISTEMA HDM

## 📦 REQUISITOS PREVIOS

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** versión 18 o superior ([Descargar aquí](https://nodejs.org/))
- **npm** (viene con Node.js)
- Un navegador web moderno (Chrome, Firefox, Edge)
- Un editor de código (VS Code recomendado)

### Verificar instalación de Node.js

Abre una terminal y ejecuta:

```bash
node --version
npm --version
```

Deberías ver algo como:
```
v18.x.x  (o superior)
9.x.x    (o superior)
```

---

## 🚀 PASOS DE INSTALACIÓN

### Paso 1: Descargar el Proyecto

Tienes dos opciones:

#### Opción A: Descargar ZIP (Más fácil)

1. En la interfaz donde estás viendo este proyecto, busca un botón de **"Download"** o **"Descargar"**
2. Guarda el archivo ZIP en tu computadora
3. Descomprime el archivo en una carpeta de tu elección (ejemplo: `C:\Proyectos\hdm-system` o `~/Proyectos/hdm-system`)

#### Opción B: Clonar con Git (Si tienes Git instalado)

```bash
# Reemplaza con la URL de tu repositorio si lo tienes en GitHub/GitLab
git clone <URL_DEL_REPOSITORIO>
cd hdm-system
```

---

### Paso 2: Abrir el Proyecto

1. Abre tu terminal (Command Prompt, PowerShell, o Terminal de Mac/Linux)
2. Navega a la carpeta del proyecto:

```bash
# En Windows:
cd C:\Proyectos\hdm-system

# En Mac/Linux:
cd ~/Proyectos/hdm-system
```

---

### Paso 3: Instalar Dependencias

En la terminal, dentro de la carpeta del proyecto, ejecuta:

```bash
npm install
```

Esto descargará todas las librerías necesarias. Tomará 1-3 minutos.

Deberías ver algo como:
```
added 423 packages, and audited 424 packages in 45s
```

---

### Paso 4: Configurar Variables de Entorno

El archivo `.env` ya existe en el proyecto con la configuración de Supabase.

Verifica que el archivo `.env` contenga:

```env
VITE_SUPABASE_URL=https://fghzkyicnqyesaohtxel.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaHpreWljbnF5ZXNhb2h0eGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDEyMzQsImV4cCI6MjA3NzMxNzIzNH0.TAFH6SaCgXiH7YCPx4LCb8-V0jMXFip81Em_DFcwjiA
```

**Si el archivo no existe**, créalo en la raíz del proyecto con ese contenido.

---

### Paso 5: Iniciar el Servidor de Desarrollo

En la terminal, ejecuta:

```bash
npm run dev
```

Deberías ver:

```
VITE v5.4.8  ready in 324 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

**¡El servidor está corriendo!** 🎉

---

### Paso 6: Crear Usuario en Supabase (Si no lo has hecho)

1. Ve a: **https://app.supabase.com**
2. Abre tu proyecto
3. Ve a **Authentication** → **Users**
4. Click **"Add user"** → **"Create new user"**
5. Completa:
   ```
   Email: admin@hdm.com
   Password: Admin123456!
   ☑ Auto Confirm User? (MARCAR ESTO)
   ```
6. Click **"Create user"**

---

### Paso 7: Acceder a la Aplicación

1. Abre tu navegador
2. Ve a: **http://localhost:5173**
3. Inicia sesión con:
   ```
   Email: admin@hdm.com
   Password: Admin123456!
   ```

**¡Listo!** Deberías ver el dashboard del sistema.

---

## 🛠️ COMANDOS ÚTILES

### Iniciar servidor de desarrollo
```bash
npm run dev
```

### Detener servidor
Presiona `Ctrl + C` en la terminal

### Compilar para producción
```bash
npm run build
```

### Vista previa de producción
```bash
npm run preview
```

### Verificar tipos TypeScript
```bash
npm run typecheck
```

### Ejecutar linter
```bash
npm run lint
```

---

## 📁 ESTRUCTURA DEL PROYECTO

```
hdm-system/
├── src/                    # Código fuente
│   ├── components/        # Componentes React
│   ├── contexts/          # Contextos (Auth, etc.)
│   ├── lib/              # Configuración Supabase
│   ├── pages/            # Páginas
│   ├── services/         # Lógica de negocio
│   ├── types/            # Tipos TypeScript
│   ├── App.tsx           # Componente principal
│   └── main.tsx          # Punto de entrada
├── supabase/
│   └── migrations/       # Migraciones de base de datos
├── .env                  # Variables de entorno
├── package.json          # Dependencias
├── vite.config.ts        # Configuración Vite
└── README.md             # Documentación
```

---

## 🔍 TROUBLESHOOTING

### Error: "command not found: npm"

**Solución**: Instala Node.js desde https://nodejs.org/

### Error: "Cannot find module"

**Solución**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port 5173 is already in use"

**Solución**:
- Cierra cualquier otra aplicación usando ese puerto
- O usa otro puerto:
```bash
npm run dev -- --port 5174
```

### No puedo iniciar sesión

**Verifica:**
1. El archivo `.env` existe y tiene las credenciales correctas
2. El usuario está creado en Supabase con "Auto Confirm User" marcado
3. Usas el email y contraseña exactos
4. El servidor está corriendo (deberías ver "ready" en la terminal)

### Página en blanco o error 404

**Solución**:
- Asegúrate de estar en http://localhost:5173 (sin /index.html ni nada más)
- Verifica que el servidor esté corriendo
- Abre las herramientas de desarrollador (F12) y revisa la consola

---

## 🎯 CHECKLIST DE INSTALACIÓN

- [ ] Node.js instalado (v18+)
- [ ] Proyecto descargado y descomprimido
- [ ] Terminal abierta en la carpeta del proyecto
- [ ] `npm install` ejecutado exitosamente
- [ ] Archivo `.env` existe con las credenciales
- [ ] `npm run dev` ejecutado y servidor corriendo
- [ ] Usuario creado en Supabase con "Auto Confirm User"
- [ ] Navegador abierto en http://localhost:5173
- [ ] Login exitoso con admin@hdm.com

---

## 🆘 AYUDA ADICIONAL

Si sigues teniendo problemas:

1. Revisa que Node.js esté instalado correctamente
2. Asegúrate de estar en la carpeta correcta del proyecto
3. Verifica que el archivo `.env` exista
4. Confirma que el usuario esté creado en Supabase
5. Revisa los errores en la consola del navegador (F12)

### Verificar instalación completa

Ejecuta estos comandos uno por uno:

```bash
# Verificar Node.js
node --version

# Verificar que estás en la carpeta correcta
ls -la

# Deberías ver: package.json, src/, .env, etc.

# Verificar dependencias instaladas
ls node_modules

# Deberías ver muchas carpetas

# Iniciar servidor
npm run dev
```

Si todo está bien, el último comando debería mostrar:
```
Local: http://localhost:5173/
```

---

**¿Listo?** Sigue los pasos en orden y podrás acceder al sistema en tu computadora local.
