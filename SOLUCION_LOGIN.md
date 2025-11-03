# 🔧 SOLUCIÓN: Invalid Credentials

## 🎯 PROBLEMA IDENTIFICADO

Tu usuario existe en la base de datos pero las credenciales no funcionan. Esto sucede cuando:
- El email NO está confirmado en Supabase Auth
- La contraseña no es la que crees
- El usuario tiene algún problema de estado

## ✅ SOLUCIÓN PASO A PASO

### Paso 1: Ir a Supabase Dashboard

1. Abre tu navegador
2. Ve a: **https://app.supabase.com**
3. Haz login con tu cuenta Supabase
4. Selecciona tu proyecto (el que tiene la URL: fghzkyicnqyesaohtxel.supabase.co)

---

### Paso 2: Eliminar Usuarios Existentes

1. En el menú lateral izquierdo, ve a: **Authentication** (icono de usuario)
2. Click en **Users**
3. Verás una lista de usuarios
4. **IMPORTANTE**: Selecciona TODOS los usuarios que veas
5. Para cada usuario:
   - Click en los **3 puntos** (⋮) al lado derecho
   - Click en **"Delete user"**
   - Confirma la eliminación

**Objetivo**: Dejar la lista de usuarios COMPLETAMENTE VACÍA.

---

### Paso 3: Crear Nuevo Usuario CORRECTAMENTE

1. En la misma página de **Authentication → Users**
2. Click en el botón **"Add user"** (esquina superior derecha)
3. Selecciona **"Create new user"** (no "Invite")

4. **COMPLETA EL FORMULARIO ASÍ:**

   ```
   Email Address: admin@hdm.com
   Password: Admin123456!
   ```

   **COPIA Y PEGA** exactamente esos valores para evitar errores de tipeo.

5. **MUY IMPORTANTE**:
   - Busca el checkbox **"Auto Confirm User?"**
   - **MÁRCALO** ☑
   - Este es el paso CRÍTICO que probablemente faltaba antes

6. Deja todo lo demás como está

7. Click en **"Create user"**

---

### Paso 4: Verificar que se Creó Correctamente

Después de crear el usuario, verifica:

1. En **Authentication → Users** deberías ver:
   ```
   Email: admin@hdm.com
   Email Confirmed: YES ✓ (debe estar en verde o con check)
   Status: ACTIVE
   ```

2. Si **Email Confirmed** dice **NO** o no aparece marcado:
   - Click en el usuario
   - Busca una opción para "Confirm email" o "Verify email"
   - O elimínalo y créalo de nuevo marcando "Auto Confirm User"

---

### Paso 5: Verificar en la Base de Datos

Ve a **SQL Editor** en Supabase y ejecuta:

```sql
SELECT id, email, role, created_at
FROM users
WHERE email = 'admin@hdm.com';
```

Deberías ver:
```
email: admin@hdm.com
role: admin
```

Si NO aparece o tiene `role: null`, espera 5 segundos y vuelve a ejecutar la query. El trigger debería asignar el rol automáticamente.

---

### Paso 6: Probar Login en tu PC

1. Asegúrate de que el servidor esté corriendo en tu PC:
   ```bash
   npm run dev
   ```

2. Abre tu navegador en: **http://localhost:5173**

3. Usa EXACTAMENTE estas credenciales:
   ```
   Email: admin@hdm.com
   Password: Admin123456!
   ```

4. Click en **"Iniciar Sesión"** o el botón de login

---

## 🔍 SI AÚN NO FUNCIONA

### Verificación 1: Email Confirmado

En Supabase Dashboard → Authentication → Users:

**DEBE verse así:**
```
✓ admin@hdm.com | Email Confirmed: YES | Status: ACTIVE
```

**Si dice NO**, haz click en el usuario y busca cómo confirmarlo, o elimínalo y créalo de nuevo.

---

### Verificación 2: Archivo .env Correcto

En tu PC, abre el archivo `.env` en la raíz del proyecto y verifica:

```env
VITE_SUPABASE_URL=https://fghzkyicnqyesaohtxel.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaHpreWljbnF5ZXNhb2h0eGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDEyMzQsImV4cCI6MjA3NzMxNzIzNH0.TAFH6SaCgXiH7YCPx4LCb8-V0jMXFip81Em_DFcwjiA
```

Si falta o está mal, cópialo de `.env.example`.

---

### Verificación 3: Reiniciar el Servidor

Después de verificar el `.env`:

1. En la terminal donde corre el servidor, presiona **Ctrl + C**
2. Ejecuta de nuevo: `npm run dev`
3. Intenta el login nuevamente

---

### Verificación 4: Limpiar Cache del Navegador

1. Abre las **Herramientas de Desarrollador** (F12)
2. Ve a la pestaña **Application** o **Almacenamiento**
3. En **Local Storage**, elimina todo
4. En **Session Storage**, elimina todo
5. Recarga la página (F5)
6. Intenta el login de nuevo

---

## 🎯 CHECKLIST COMPLETO

Marca cada paso:

- [ ] Fui a https://app.supabase.com
- [ ] Abrí mi proyecto
- [ ] Fui a Authentication → Users
- [ ] Eliminé TODOS los usuarios existentes
- [ ] Creé nuevo usuario con email: `admin@hdm.com`
- [ ] Usé password: `Admin123456!`
- [ ] **MARQUÉ** el checkbox "Auto Confirm User?"
- [ ] Verifiqué que Email Confirmed = YES
- [ ] Verifiqué el archivo .env en mi PC
- [ ] Reinicié el servidor (Ctrl+C y npm run dev)
- [ ] Abrí http://localhost:5173
- [ ] Usé las credenciales exactas para login

---

## 📸 CAPTURAS DE REFERENCIA

### Cómo debe verse al crear el usuario:

```
┌─────────────────────────────────────┐
│ Create new user                     │
├─────────────────────────────────────┤
│ Email Address                       │
│ admin@hdm.com                       │
│                                     │
│ Password                            │
│ Admin123456!                        │
│                                     │
│ ☑ Auto Confirm User?              │  ← DEBE estar marcado
│                                     │
│ [ Cancel ]  [ Create user ]        │
└─────────────────────────────────────┘
```

### Cómo debe verse después de crear:

```
Email               | Email Confirmed | Status
─────────────────────────────────────────────
admin@hdm.com       | YES ✓          | ACTIVE
```

---

## 🆘 ÚLTIMO RECURSO

Si después de todo sigue sin funcionar:

1. **Toma una captura de pantalla** de:
   - La página de Authentication → Users en Supabase
   - El error que ves en tu navegador (F12 → Console)
   - Tu archivo `.env`

2. **Verifica estos detalles:**
   - ¿El email dice "YES" en Email Confirmed?
   - ¿Estás usando EXACTAMENTE `admin@hdm.com` y `Admin123456!`?
   - ¿El servidor está corriendo sin errores?
   - ¿El .env tiene las credenciales correctas?

---

## ✅ ÉXITO

Sabrás que funcionó cuando:
- El login te redirige al dashboard
- Ves tu email en la esquina superior derecha
- Puedes navegar por el sistema

**El problema casi siempre es: "Auto Confirm User" no marcado.**

Sigue estos pasos exactamente y funcionará.
