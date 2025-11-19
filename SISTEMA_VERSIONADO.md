# Sistema de Versionado y Control de Caché

## Resumen

Se ha implementado un sistema completo de versionado que asegura que los usuarios siempre vean la última versión de la aplicación, eliminando problemas de caché.

## Componentes Implementados

### 1. Variable de Versión en `.env`
```env
VITE_APP_VERSION=1.0.0
```
- Cambia este valor cada vez que hagas un deploy (ej: 1.0.1, 1.0.2, etc.)

### 2. Meta Tags de No-Cache en HTML
El archivo `index.html` incluye:
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```
Esto previene que los navegadores cacheen el archivo HTML principal.

### 3. Assets Versionados con Hash
Todos los archivos JS/CSS generados por Vite incluyen un hash único:
- `index-DGHWSdlz.js`
- `index-BH2YGbQg.css`
- etc.

Cuando cambia el código, el hash cambia automáticamente, forzando a los navegadores a descargar la nueva versión.

### 4. Archivo `version.json`
Se genera automáticamente en cada build:
```json
{
  "version": "1.0.0",
  "buildTime": "2025-11-19T15:03:38.445Z"
}
```

### 5. Sistema de Detección de Versión
El frontend verifica cada 5 minutos si hay una nueva versión disponible:
- Compara la versión actual con `/version.json`
- Si detecta una nueva versión, muestra un diálogo al usuario
- Permite recargar la página para obtener la actualización

## Cómo Funciona

### Durante el Desarrollo
```bash
npm run dev
```
- Genera `public/version.json`
- Inicia el servidor de desarrollo

### Durante el Build
```bash
npm run build
```
- Compila la aplicación con Vite
- Genera archivos con hash en `dist/assets/`
- Crea `dist/version.json` con la versión actual

### En Producción
1. Usuario abre la aplicación
2. Se carga con la versión actual (ej: 1.0.0)
3. Cada 5 minutos, el sistema verifica `/version.json`
4. Si detectas que hiciste un deploy (ej: cambió a 1.0.1):
   - Se muestra un mensaje: "¡Nueva versión disponible! ¿Deseas recargar?"
   - El usuario puede recargar inmediatamente o esperar
5. Al recargar, obtiene todos los archivos nuevos (gracias al hash)

## Proceso de Deploy

### Paso 1: Actualizar la Versión
Edita `.env`:
```env
VITE_APP_VERSION=1.0.1  # Incrementa el número
```

### Paso 2: Compilar
```bash
npm run build
```

### Paso 3: Desplegar
Sube el contenido de la carpeta `dist/` a tu servidor.

### Paso 4: Verificación
Los usuarios que tengan la app abierta recibirán una notificación en máximo 5 minutos.

## Depuración

### Ver la Versión Actual en el Navegador
Abre la consola del navegador y ejecuta:
```javascript
console.log(window.APP_VERSION);  // Muestra: "1.0.0"
```

### Forzar Verificación Manual
En la consola del navegador:
```javascript
window.versionChecker.checkNow();
```

### Ver el Estado del Version Checker
```javascript
window.versionChecker
```

## Beneficios

✅ **No más caché viejo**: Los meta tags previenen que el HTML se cachee
✅ **Assets actualizados**: Los hashes en los nombres de archivo aseguran archivos nuevos
✅ **Notificación automática**: Los usuarios saben cuando hay actualizaciones
✅ **Sin recargas forzadas**: El usuario decide cuándo actualizar
✅ **Sin Service Workers problemáticos**: No se necesitan SW que puedan causar problemas

## Notas Importantes

1. **Incrementa la versión**: Recuerda cambiar `VITE_APP_VERSION` en `.env` antes de cada deploy
2. **Tiempo de detección**: Los usuarios detectarán la nueva versión en máximo 5 minutos
3. **Primera carga**: La primera vez que un usuario carga la app después de un deploy, obtiene la nueva versión inmediatamente
4. **Usuarios activos**: Los usuarios con la app ya abierta reciben la notificación automáticamente

## Ejemplo de Flujo Completo

```bash
# 1. Desarrollas nuevas características
# ... código ...

# 2. Actualizas la versión
echo "VITE_APP_VERSION=1.0.2" >> .env

# 3. Compilas
npm run build

# 4. Despliegas
# ... subes dist/ a tu servidor ...

# 5. Los usuarios son notificados automáticamente
# "¡Nueva versión disponible! Versión actual: 1.0.1, Nueva versión: 1.0.2"
```

## Solución de Problemas

### Los usuarios siguen viendo versión vieja
- Verifica que `dist/version.json` se haya desplegado correctamente
- Asegúrate de que el archivo sea accesible en `https://tudominio.com/version.json`

### El version checker no funciona
- Abre la consola del navegador y busca mensajes que comiencen con 🔖 o 🔍
- Verifica que `window.APP_VERSION` esté definido

### Error al generar version.json
- Asegúrate de que el script tenga permisos de ejecución
- Verifica que Node.js pueda escribir en las carpetas `public/` y `dist/`
