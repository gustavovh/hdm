# 🔐 Instrucciones Rápidas de Seguridad

## ⚠️ ACCIÓN REQUERIDA: Habilitar Protección contra Contraseñas Comprometidas

Esta configuración es **OBLIGATORIA** antes de usar el sistema.

### 📋 Pasos Rápidos (2 minutos)

#### 1. Accede al Dashboard de Supabase
```
🔗 https://app.supabase.com
```

#### 2. Selecciona tu proyecto HDM

#### 3. Ve a la configuración de Authentication

**Ruta en el menú**:
```
Authentication → Policies
```
O también puede estar en:
```
Project Settings → Authentication
```

#### 4. Busca la opción de Password Protection

Encontrarás una sección llamada:
- **"Password Protection"**
- **"Password Requirements"**
- **"Security"**

#### 5. Habilita el toggle

Busca y **ACTIVA** la opción:
```
☑ Check passwords against HaveIBeenPwned
```
O similar que mencione "HaveIBeenPwned" o "compromised passwords"

#### 6. Guarda los cambios

Haz click en **"Save"** o **"Update"**

### ✅ Verificación

Intenta crear un usuario con contraseña débil como "password123":

- ❌ **Debe fallar** con mensaje: "Password has been found in a data breach"
- ✅ **Esto confirma** que la protección está activa

### 🎯 ¿Por qué es importante?

- Previene el uso de contraseñas expuestas en brechas de seguridad
- Protege cuentas de administrador y vendedores
- No tiene impacto en el rendimiento
- Es una buena práctica de seguridad estándar

### 📱 Siguientes Pasos

Una vez completado esto, puedes:

1. ✅ Crear usuarios de prueba (admin@hdm.com, vendedor1@hdm.com)
2. ✅ Iniciar sesión en la aplicación
3. ✅ Comenzar a usar el sistema

Para configuración avanzada de seguridad, consulta: **SECURITY_SETUP.md**

---

**Configurado**: [ ] Sí [ ] No
**Fecha**: _______________
**Por**: _______________
