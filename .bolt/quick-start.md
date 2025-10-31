# 🚀 Quick Start - Sistema HDM

## Paso 1: Configurar Seguridad (2 minutos)

### En Supabase Dashboard

**URL**: https://app.supabase.com → Tu proyecto

#### A) Protección de Contraseñas (OBLIGATORIO)

```
Authentication → Settings → Password Requirements
☑ Check passwords against HaveIBeenPwned
```

#### B) Desactivar Confirmación de Email (Desarrollo)

```
Authentication → Settings → Email Confirmation
☐ Enable email confirmations (DESACTIVAR)
```

Click **"Save"**

---

## Paso 2: Crear Usuario Administrador (1 minuto)

### En Supabase Dashboard

```
Authentication → Users → Add user → Create new user
```

**Importante: Crear en este orden**

### Primer Usuario (será Admin automáticamente):

```
Email: admin@hdm.com
Password: (tu contraseña segura, 12+ caracteres)
☑ Auto Confirm User?
```

Click **"Create user"**

**✨ Este usuario automáticamente tendrá rol de admin**

---

## Paso 3: Crear Usuarios Vendedores (Opcional)

Repite el proceso:

```
Email: vendedor1@hdm.com
Password: (contraseña segura)
☑ Auto Confirm User?
```

**Estos usuarios tendrán rol de vendedor automáticamente**

---

## Paso 4: Acceder al Sistema

1. Abre: http://localhost:5173
2. Inicia sesión con:
   - Email: `admin@hdm.com`
   - Password: (la que creaste)

---

## ✅ Verificación

### Como Admin, deberías ver:

- ✅ Dashboard de administrador
- ✅ Gestión de solicitudes de descuento
- ✅ Todas las funcionalidades administrativas

### Como Vendedor, deberías ver:

- ✅ Tus propios presupuestos
- ✅ Crear solicitudes de descuento
- ✅ Ver estado de tus solicitudes

---

## 🔧 Solución de Problemas

### Error: "Could not find table users"

**Solución**: Las migraciones ya están aplicadas. Solo crea los usuarios.

### Error: "Password has been found in a data breach"

**Solución**: Usa una contraseña más segura (no "password123", "admin123", etc.)

### No puedo acceder como admin

**Verificación**:
```sql
-- En Supabase SQL Editor
SELECT email, role FROM users;
```

Si el rol no es 'admin', el primer usuario creado debería serlo automáticamente.

---

## 📚 Funcionalidades Disponibles

### Para Administradores:
- Ver todas las solicitudes de descuento
- Aprobar/Rechazar solicitudes
- Modificar valores de descuento
- Ver auditoría completa
- Gestionar configuración del sistema

### Para Vendedores:
- Crear presupuestos
- Solicitar descuentos (global o por ítem)
- Ver estado de solicitudes
- Cancelar solicitudes pendientes
- Recibir notificaciones en tiempo real

---

## 🔐 Seguridad Configurada

- ✅ Row Level Security (RLS) en todas las tablas
- ✅ Vendedores solo ven sus datos
- ✅ Admins acceso completo
- ✅ Auditoría de todas las acciones críticas
- ✅ Protección contra contraseñas comprometidas
- ✅ Validaciones a nivel de base de datos

---

**¿Listo?** Inicia sesión y comienza a usar el sistema.

Para más detalles, consulta: **README.md** y **SECURITY_SETUP.md**
