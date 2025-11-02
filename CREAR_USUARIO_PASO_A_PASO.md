# 🔑 CREAR USUARIO - PASO A PASO (CON DETALLES)

## 🚨 PROBLEMA DETECTADO

El usuario NO se creó correctamente en Supabase. Por eso da error "invalid credentials".

---

## ✅ SOLUCIÓN DEFINITIVA

### PASO 1: Abre Supabase Dashboard

1. Abre tu navegador (Chrome, Firefox, Edge, Safari)
2. Ve a: **https://app.supabase.com**
3. Haz login con tu cuenta de Supabase
4. Verás una lista de tus proyectos

### PASO 2: Selecciona tu Proyecto

Busca el proyecto que tiene esta URL: `fghzkyicnqyesaohtxel.supabase.co`

Si no recuerdas cuál es:
- El nombre del proyecto probablemente es algo como "hdm-system" o similar
- Click en el proyecto para abrirlo

### PASO 3: Ve a Authentication

1. En el menú lateral IZQUIERDO, busca el icono de un usuario con escudo
2. Click en **"Authentication"**
3. Se desplegará un submenu

### PASO 4: Ve a Users

1. En el submenu de Authentication, click en **"Users"**
2. Verás una tabla con los usuarios (puede estar vacía o tener usuarios viejos)

### PASO 5: Elimina Usuarios Viejos (si existen)

Si ves cualquier usuario en la lista:

1. Para cada usuario:
   - Click en los **3 puntos verticales (⋮)** al lado derecho del usuario
   - Click en **"Delete user"**
   - Aparecerá un diálogo de confirmación
   - Click en **"Delete"** o **"Confirm"**

2. Repite para TODOS los usuarios hasta que la lista esté VACÍA

### PASO 6: Crear Nuevo Usuario

1. Busca el botón verde **"Add user"** (esquina superior derecha)
2. Click en **"Add user"**
3. Aparecerá un menú desplegable con 2 opciones:
   - **"Create new user"** ← SELECCIONA ESTA
   - "Invite user"

### PASO 7: Completar el Formulario

Aparecerá un formulario. Complétalo EXACTAMENTE así:

```
┌──────────────────────────────────────────┐
│ Create new user                          │
├──────────────────────────────────────────┤
│                                          │
│ Email Address                            │
│ ┌──────────────────────────────────────┐ │
│ │ admin@hdm.com                        │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Password                                 │
│ ┌──────────────────────────────────────┐ │
│ │ Admin123456!                         │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ☑ Auto Confirm User?                   │  ← MUY IMPORTANTE: MARCAR
│                                          │
│ Metadata (Optional)                      │
│ ┌──────────────────────────────────────┐ │
│ │                                      │ │  ← DEJAR VACÍO
│ └──────────────────────────────────────┘ │
│                                          │
│     [ Cancel ]    [ Create user ]       │
└──────────────────────────────────────────┘
```

**COPIA Y PEGA**:
- Email: `admin@hdm.com`
- Password: `Admin123456!`

**CRÍTICO**:
- Marca el checkbox **"Auto Confirm User?"**
- Este checkbox es OBLIGATORIO
- Si no lo marcas, el usuario quedará en estado "pending" y no podrá hacer login

### PASO 8: Click en "Create user"

1. Revisa que todo esté correcto
2. Email: admin@hdm.com
3. Password: Admin123456!
4. Auto Confirm User: MARCADO ☑
5. Click en el botón verde **"Create user"**

### PASO 9: Verificar que se Creó Correctamente

Después de crear, deberías ver en la lista:

```
┌─────────────────┬──────────────────┬─────────┬─────────────────────┐
│ Email           │ Email Confirmed  │ Status  │ Created             │
├─────────────────┼──────────────────┼─────────┼─────────────────────┤
│ admin@hdm.com   │ ✓ YES           │ ACTIVE  │ few seconds ago     │
└─────────────────┴──────────────────┴─────────┴─────────────────────┘
```

**VERIFICA**:
- Email Confirmed debe decir **YES** con un check verde ✓
- Status debe decir **ACTIVE**

**SI DICE NO**:
- Elimina el usuario
- Créalo de nuevo
- ASEGÚRATE de marcar "Auto Confirm User"

---

## 🔄 DESPUÉS DE CREAR EL USUARIO

### En tu PC:

1. **Abre la terminal** donde está tu proyecto
2. Si el servidor está corriendo, presiona **Ctrl + C** para detenerlo
3. Ejecuta de nuevo:
   ```bash
   npm run dev
   ```
4. Espera a que diga: `Local: http://localhost:5173/`

### En tu navegador:

1. Abre una **nueva pestaña incógnito/privada**:
   - Chrome: Ctrl + Shift + N (Windows) o Cmd + Shift + N (Mac)
   - Firefox: Ctrl + Shift + P
   - Edge: Ctrl + Shift + N

2. Ve a: **http://localhost:5173**

3. En la página de login, ingresa:
   ```
   Email: admin@hdm.com
   Password: Admin123456!
   ```

4. Click en **"Iniciar Sesión"** o el botón de login

---

## ✅ SI FUNCIONA

Deberías:
- Ver el dashboard del sistema
- Ver tu email (admin@hdm.com) en la esquina superior derecha
- Poder navegar por las opciones del menú

---

## ❌ SI SIGUE SIN FUNCIONAR

### Verificación 1: ¿El usuario realmente se creó?

En Supabase Dashboard → Authentication → Users:

**Debe verse así:**
```
admin@hdm.com | ✓ YES | ACTIVE
```

**NO debe verse así:**
```
admin@hdm.com | NO | PENDING
```

Si dice "NO" o "PENDING", el problema es que NO marcaste "Auto Confirm User".

**Solución**: Elimínalo y créalo de nuevo marcando el checkbox.

---

### Verificación 2: ¿Estás en el proyecto correcto?

En Supabase Dashboard, arriba a la izquierda, verifica el nombre del proyecto.

La URL debe ser: `https://fghzkyicnqyesaohtxel.supabase.co`

Para verificar:
1. Ve a Settings → API
2. Busca "Project URL"
3. Debe decir: `https://fghzkyicnqyesaohtxel.supabase.co`

Si es diferente, estás en el proyecto equivocado.

---

### Verificación 3: ¿Tu archivo .env es correcto?

En tu PC, abre el archivo `.env` en la raíz del proyecto:

**Debe contener EXACTAMENTE esto:**
```env
VITE_SUPABASE_URL=https://fghzkyicnqyesaohtxel.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaHpreWljbnF5ZXNhb2h0eGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDEyMzQsImV4cCI6MjA3NzMxNzIzNH0.TAFH6SaCgXiH7YCPx4LCb8-V0jMXFip81Em_DFcwjiA
```

**NO debe tener**:
- Espacios extra
- Comillas alrededor de los valores
- Líneas comentadas

Si está mal:
1. Bórralo
2. Copia el contenido de `.env.example`
3. Pégalo en `.env`
4. Guarda el archivo
5. Reinicia el servidor (Ctrl+C y npm run dev)

---

### Verificación 4: ¿Estás usando las credenciales correctas?

Al hacer login, debes usar EXACTAMENTE:

```
Email: admin@hdm.com
Password: Admin123456!
```

**CUIDADO CON**:
- Espacios antes o después del email
- Mayúsculas/minúsculas en la password (es sensible a mayúsculas)
- Copiar/pegar puede agregar espacios invisibles

**TIP**: Escribe las credenciales a mano en lugar de copiar/pegar.

---

### Verificación 5: Consola del Navegador

1. En tu navegador, presiona **F12**
2. Ve a la pestaña **"Console"**
3. Intenta hacer login
4. Mira si aparecen errores en rojo

**Errores comunes**:
- "Invalid API key" → Tu .env está mal
- "Failed to fetch" → El servidor no está corriendo
- "Invalid login credentials" → El usuario no existe o password incorrecta

---

## 🎯 RESUMEN RÁPIDO

1. Ve a https://app.supabase.com
2. Abre tu proyecto
3. Authentication → Users
4. Elimina usuarios viejos
5. Add user → Create new user
6. Email: `admin@hdm.com`
7. Password: `Admin123456!`
8. ☑ **Auto Confirm User** (CRÍTICO)
9. Create user
10. Verifica que diga "Email Confirmed: YES"
11. En tu PC: Ctrl+C, luego npm run dev
12. Navegador incógnito: http://localhost:5173
13. Login con las credenciales exactas

---

## 🆘 SI NADA FUNCIONA

Toma capturas de pantalla de:

1. **Supabase Dashboard → Authentication → Users** (la lista de usuarios)
2. **Tu archivo `.env`** (puedes ocultar la segunda mitad de las claves por seguridad)
3. **La consola del navegador** (F12 → Console) cuando intentas hacer login
4. **La terminal** donde corre `npm run dev`

Con esas capturas puedo ver exactamente qué está mal.

---

## 💡 NOTA IMPORTANTE

El error "invalid credentials" significa que:
- El usuario NO existe en auth.users, O
- El password es incorrecto, O
- El email no está confirmado

En tu caso, verificamos que el usuario NO existe. Por eso debes crearlo siguiendo estos pasos exactamente.

**El paso MÁS IMPORTANTE es marcar "Auto Confirm User".**

Sin ese checkbox marcado, el usuario no puede hacer login.
