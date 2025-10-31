# 🔐 Instrucciones Rápidas de Configuración - Desarrollo

## 📋 Configuración de Supabase (3 minutos)

### Paso 1: Accede al Dashboard
```
🔗 https://app.supabase.com
```

### Paso 2: Selecciona tu proyecto HDM

### Paso 3: Configurar Authentication

**Ruta**: `Authentication → Settings`

#### A) Protección de Contraseñas (OBLIGATORIO) ✅

**Sección**: Password Requirements o Security

```
☑ Check passwords against HaveIBeenPwned
```

**Esto es obligatorio** - Previene contraseñas comprometidas.

#### B) Confirmación de Email (Desarrollo/Testing)

**Sección**: Email Confirmation

```
☐ Enable email confirmations (DESACTIVAR para desarrollo)
```

**Por qué desactivarlo:**
- ✅ No necesitas configurar SMTP
- ✅ No necesitas verificar emails
- ✅ Los usuarios pueden iniciar sesión inmediatamente
- ✅ Facilita pruebas rápidas

**⚠️ IMPORTANTE**: En producción, debes activar la confirmación de email.

### Paso 4: Guardar Cambios

Haz click en **"Save"** o **"Update"**

---

## ✅ Verificación Rápida

### 1. Protección de Contraseñas

Intenta crear un usuario con `password123`:

```
❌ Debe fallar: "Password has been found in a data breach"
✅ Protección activa
```

### 2. Sin Confirmación de Email

Crea un usuario:

```
✅ Se crea inmediatamente
✅ Puedes iniciar sesión sin verificar email
✅ No recibes correos de confirmación
```

---

## 🚀 Ahora puedes:

1. ✅ Crear usuarios de prueba directamente
2. ✅ Iniciar sesión inmediatamente
3. ✅ Probar el sistema sin configurar SMTP

### Usuarios de Prueba Sugeridos

En `Authentication → Users`, crea:

**Admin:**
```
Email: admin@hdm.com
Password: (mínimo 12 caracteres, segura)
```

**Vendedor:**
```
Email: vendedor1@hdm.com
Password: (mínimo 12 caracteres, segura)
```

Los perfiles en la tabla `users` ya están creados por el seed.

---

## 🔒 Para Producción

Antes de desplegar:

1. ⚠️ **ACTIVAR** confirmación de email
2. ⚠️ Configurar SMTP personalizado
3. ⚠️ Revisar todas las políticas de seguridad

Ver: **SECURITY_SETUP.md** para configuración completa.

---

**Configurado**: [ ] Sí [ ] No
**Fecha**: _______________
**Por**: _______________
