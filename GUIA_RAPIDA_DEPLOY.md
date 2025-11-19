# Guía Rápida: Deploy con Nueva Versión

## Cada vez que hagas un deploy, sigue estos pasos:

### 1️⃣ Actualiza la versión en `.env`
```bash
# Edita el archivo .env y cambia:
VITE_APP_VERSION=1.0.1  # incrementa este número
```

### 2️⃣ Compila la aplicación
```bash
npm run build
```

### 3️⃣ Despliega
Sube todo el contenido de la carpeta `dist/` a tu servidor.

### 4️⃣ Verifica
Abre `https://tudominio.com/version.json` en el navegador y confirma que muestra la nueva versión.

---

## ¿Qué sucede después?

- **Usuarios nuevos**: Obtienen la nueva versión inmediatamente
- **Usuarios activos**: Reciben una notificación en máximo 5 minutos preguntando si desean actualizar

## Ejemplo de Versiones

Usa versionado semántico:
- `1.0.0` → Primera versión
- `1.0.1` → Corrección de bugs
- `1.1.0` → Nueva funcionalidad
- `2.0.0` → Cambios mayores

---

## ¡Eso es todo!

El sistema se encarga automáticamente de:
- ✅ Prevenir caché de HTML
- ✅ Versionar archivos JS/CSS con hash
- ✅ Notificar a usuarios sobre actualizaciones
- ✅ Recargar con la versión correcta
