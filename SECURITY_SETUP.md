# Configuración de Seguridad - Sistema HDM

Este documento contiene las configuraciones de seguridad obligatorias que deben aplicarse en el Dashboard de Supabase antes de usar el sistema en producción.

## 🔒 Configuraciones Críticas de Supabase Auth

### 1. Habilitar Protección contra Contraseñas Filtradas

**⚠️ OBLIGATORIO - Esta configuración previene el uso de contraseñas comprometidas**

#### Pasos para configurar:

1. Accede a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Authentication** → **Policies** (o **Settings** → **Auth**)
3. Busca la sección **Password Protection**
4. Habilita la opción **"Check passwords against HaveIBeenPwned"**
5. Guarda los cambios

#### ¿Qué hace esta configuración?

- Verifica cada nueva contraseña contra la base de datos de [HaveIBeenPwned.org](https://haveibeenpwned.com/)
- Bloquea contraseñas que han sido expuestas en brechas de seguridad conocidas
- Protege a los usuarios de usar contraseñas comprometidas
- No afecta el rendimiento (la verificación es rápida y segura)

#### Comportamiento del sistema:

Cuando un usuario intenta crear una cuenta o cambiar su contraseña:

```
✅ Contraseña segura → Registro/cambio exitoso
❌ Contraseña comprometida → Error: "Password has been found in a data breach"
```

---

## 🔐 Otras Configuraciones de Seguridad Recomendadas

### 2. Configurar Políticas de Contraseñas

**Ubicación**: Authentication → Settings → Password Requirements

Recomendaciones para producción:

```
✓ Longitud mínima: 12 caracteres
✓ Requerir al menos una mayúscula
✓ Requerir al menos un número
✓ Requerir al menos un carácter especial
✓ Habilitar check contra HaveIBeenPwned (ver punto 1)
```

### 3. Configurar Rate Limiting

**Ubicación**: Authentication → Rate Limits

Protege contra ataques de fuerza bruta:

```
- Sign-up: 10 intentos por hora por IP
- Sign-in: 10 intentos por hora por email
- Password reset: 5 intentos por hora por email
- OTP: 5 intentos por minuto
```

### 4. Configurar Email Confirmación

**Ubicación**: Authentication → Settings → Email Confirmation

**Para Desarrollo/Testing (Configuración Actual):**
```
☐ DESACTIVAR "Confirm email" para nuevos usuarios
```
Esto permite crear usuarios y acceder inmediatamente sin verificar email.

**Para Producción:**
```
✓ ACTIVAR "Confirm email" para nuevos usuarios
✓ Configurar plantilla de email profesional
✓ Configurar dominio SMTP personalizado
```

**⚠️ IMPORTANTE**: La confirmación de email está **DESHABILITADA** en este proyecto para facilitar desarrollo y pruebas. Asegúrate de habilitarla antes de ir a producción.

### 5. Configurar Refresh Token Rotation

**Ubicación**: Authentication → Settings → Advanced

```
✓ Enable automatic token refresh
✓ Enable refresh token rotation
✓ Reuse interval: 10 seconds (default)
```

### 6. Configurar Session Timeout

**Ubicación**: Authentication → Settings → Sessions

```
- Access token lifetime: 3600 seconds (1 hora)
- Refresh token lifetime: 604800 seconds (7 días)
```

### 7. Configurar CORS y Allowed URLs

**Ubicación**: Authentication → URL Configuration

```
Site URL: https://tu-dominio.com
Redirect URLs:
  - https://tu-dominio.com/auth/callback
  - http://localhost:5173 (solo desarrollo)
```

### 8. Habilitar Logs de Auditoría

**Ubicación**: Project Settings → Logs

```
✓ Habilitar logs de autenticación
✓ Habilitar logs de base de datos
✓ Configurar retención: mínimo 7 días
```

---

## 🛡️ Seguridad a Nivel de Base de Datos (Ya Implementado)

### Row Level Security (RLS)

El sistema ya tiene RLS habilitado en todas las tablas con las siguientes políticas:

#### Usuarios Vendedores
- ✅ Solo ven sus propios presupuestos
- ✅ Solo ven sus propias solicitudes de descuento
- ✅ No pueden ver presupuestos ANULADOS
- ✅ Solo pueden cancelar sus solicitudes PENDIENTES

#### Usuarios Administradores
- ✅ Acceso completo a presupuestos y solicitudes
- ✅ Pueden ver presupuestos ANULADOS
- ✅ Acceso exclusivo a auditorías
- ✅ Pueden modificar configuración del sistema

### Validaciones a Nivel de Base de Datos

```sql
✓ CHECK constraints para valores válidos
✓ Foreign keys con acciones apropiadas
✓ NOT NULL en campos críticos
✓ Validación de porcentajes (0-100%)
✓ Validación de montos positivos
```

---

## 🔍 Verificación de Seguridad

### Checklist Desarrollo (Configuración Actual)

Para entorno de desarrollo/testing:

- [ ] ✅ Protección contra contraseñas filtradas habilitada
- [ ] ✅ Rate limiting configurado (opcional en dev)
- [ ] ❌ Email confirmation **DESHABILITADA** (facilita desarrollo)
- [ ] ✅ CORS configurado para localhost:5173
- [ ] ✅ Variables de entorno (.env) configuradas

### Checklist Pre-Producción

⚠️ **IMPORTANTE**: Antes de desplegar a producción, verifica:

- [ ] ✅ Protección contra contraseñas filtradas habilitada
- [ ] ✅ Políticas de contraseñas configuradas (12+ caracteres)
- [ ] ✅ Rate limiting configurado (estricto)
- [ ] ⚠️ **Email confirmation HABILITADA** (cambiar de desarrollo)
- [ ] ✅ Refresh token rotation habilitada
- [ ] ✅ CORS y URLs configuradas correctamente (solo dominios de producción)
- [ ] ✅ Variables de entorno en producción configuradas
- [ ] ✅ SMTP personalizado configurado (NO usar Supabase SMTP)
- [ ] ✅ Plantillas de email personalizadas
- [ ] ✅ SSL/TLS habilitado
- [ ] ✅ Logs de auditoría habilitados
- [ ] ✅ Monitoreo de seguridad configurado

---

## 🚨 Monitoreo de Seguridad

### Alertas Recomendadas

Configura alertas para:

1. **Intentos de login fallidos** (>5 en 10 minutos)
2. **Cambios en políticas RLS**
3. **Acceso a auditorías** (monitorear quién ve logs)
4. **Solicitudes de descuento de alto valor** (>30%)
5. **Cambios en configuración del sistema**

### Revisiones Periódicas

Realiza estas verificaciones cada mes:

- [ ] Revisar logs de autenticación
- [ ] Auditar permisos de usuarios admin
- [ ] Verificar que RLS siga activo
- [ ] Revisar solicitudes de descuento sospechosas
- [ ] Actualizar contraseñas de cuentas de servicio
- [ ] Verificar que todos los paquetes estén actualizados

---

## 📞 Respuesta a Incidentes

### En caso de brecha de seguridad:

1. **Inmediato** (0-1 hora):
   - Revocar todos los tokens activos
   - Deshabilitar cuentas comprometidas
   - Revisar logs de las últimas 48 horas

2. **Corto plazo** (1-24 horas):
   - Notificar a usuarios afectados
   - Forzar cambio de contraseñas
   - Investigar alcance del incidente
   - Documentar hallazgos

3. **Seguimiento** (1-7 días):
   - Implementar medidas correctivas
   - Actualizar políticas de seguridad
   - Revisar y fortalecer RLS
   - Capacitar al equipo

---

## 🔗 Referencias

- [Supabase Auth Security Best Practices](https://supabase.com/docs/guides/auth/auth-helpers/security)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/v3)
- [OWASP Password Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Row Level Security (RLS) Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## ✅ Configuración Completada

Una vez hayas completado todas las configuraciones de seguridad, actualiza esta sección:

```
Configurado por: _______________
Fecha: _______________
Entorno: [ ] Desarrollo  [ ] Staging  [ ] Producción
Revisado por: _______________
```

---

**⚠️ IMPORTANTE**: No ignores estas configuraciones. La seguridad no es opcional.
