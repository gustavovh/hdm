# 🚀 PASOS PARA ACCEDER AL SISTEMA

## Estado Actual

✅ Base de datos configurada correctamente
✅ Usuario creado: `admin@test.com` con rol `admin`
❌ Problema: Credenciales no aceptadas

---

## SOLUCIÓN: Verificar y Reconfigurar Usuario

### Paso 1: Verificar Usuario en Supabase Dashboard

Ve a: **https://app.supabase.com** → Tu proyecto → **Authentication** → **Users**

Busca el usuario con email: `admin@test.com`

### Paso 2: Verificar Estado del Usuario

Haz click en el usuario y verifica:

```
✅ Email Confirmed: debe estar en YES o TRUE
✅ Status: debe estar en ACTIVE o algo similar
```

**Si Email Confirmed está en NO/FALSE:**
- En la página de edición del usuario, busca la opción para confirmar el email
- O elimina este usuario y créalo de nuevo (ver Paso 3)

### Paso 3: Eliminar y Recrear Usuario (Si es necesario)

#### A) Eliminar usuario actual

1. En **Authentication → Users**
2. Encuentra `admin@test.com`
3. Click en los 3 puntos → **Delete user**
4. Confirma

#### B) Crear usuario nuevo correctamente

1. Click **"Add user"** → **"Create new user"**
2. Completa:
   ```
   Email: admin@hdm.com
   Password: Admin123456!
   ```
   (Usa exactamente esta contraseña para probar)

3. **MUY IMPORTANTE**: Marca el checkbox **"Auto Confirm User?"**
4. Click **"Create user"**

### Paso 4: Verificar que se creó en la base de datos

Ve a: **SQL Editor** en Supabase y ejecuta:

```sql
SELECT id, email, role, created_at
FROM users
ORDER BY created_at DESC
LIMIT 1;
```

Deberías ver:
```
email: admin@hdm.com
role: admin
```

---

## Paso 5: Acceder a la Aplicación

### A) Verificar que el servidor está corriendo

En tu terminal, deberías ver algo como:
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
```

**Si NO ves esto**, el servidor no está corriendo. NO hacer nada, el servidor se inicia automáticamente.

### B) Abrir la aplicación

1. Abre tu navegador
2. Ve a: **http://localhost:5173**
3. Deberías ver la página de login

### C) Iniciar sesión

Usa las credenciales:
```
Email: admin@hdm.com
Password: Admin123456!
```

---

## 🔍 TROUBLESHOOTING

### Error: "Invalid login credentials"

**Causas comunes:**

1. **Email no confirmado**
   - Solución: Elimina y recrea el usuario marcando "Auto Confirm User?"

2. **Contraseña incorrecta**
   - Solución: Usa exactamente `Admin123456!` para probar
   - O resetea la contraseña del usuario en Supabase Dashboard

3. **Usuario no existe en auth.users**
   - Solución: Verifica en Authentication → Users que el usuario existe

### Error: "Cannot GET /"

Esto significa que el servidor de desarrollo no está corriendo o hay un problema con la ruta.

**Solución:**
- La aplicación debe estar en http://localhost:5173
- NO uses http://localhost:5173/ (sin nada después)

### Email confirmado pero sigue sin funcionar

**Resetear contraseña del usuario:**

1. En **Authentication → Users**
2. Click en tu usuario
3. Busca "Reset password" o "Send password reset email"
4. O elimina y recrea el usuario desde cero

---

## 📋 CHECKLIST COMPLETO

Marca cada paso:

- [ ] Usuario existe en **Authentication → Users**
- [ ] Email está confirmado (Email Confirmed: YES)
- [ ] Usuario está activo (Status: ACTIVE)
- [ ] Usuario aparece en la tabla `public.users` con role='admin'
- [ ] Servidor en http://localhost:5173 está corriendo
- [ ] Usaste las credenciales exactas: `admin@hdm.com` / `Admin123456!`
- [ ] Marcaste "Auto Confirm User?" al crear el usuario

---

## ✅ VERIFICACIÓN FINAL

Si todo está bien, al iniciar sesión deberías:

1. Ver un mensaje de "Cargando..." brevemente
2. Ser redirigido al dashboard
3. Ver tu email en la esquina superior derecha
4. Ver opciones de administrador

---

## 🆘 SI NADA FUNCIONA

Elimina el usuario actual y créalo de nuevo siguiendo EXACTAMENTE estos pasos:

1. **Supabase Dashboard** → **Authentication** → **Users**
2. Elimina cualquier usuario existente
3. **Add user** → **Create new user**
4. Email: `admin@hdm.com`
5. Password: `Admin123456!` (copia y pega exactamente)
6. ☑ **"Auto Confirm User?"** DEBE estar marcado
7. Click **"Create user"**
8. Espera 3 segundos
9. Ve a http://localhost:5173
10. Login con: `admin@hdm.com` / `Admin123456!`

**Si aún así no funciona**, comparte el mensaje de error exacto que ves.
