# ⚡ PASOS INMEDIATOS PARA SOLUCIONAR EL CACHÉ

## 🎯 Objetivo
Que tus clientes SIEMPRE vean la última versión de la aplicación, sin caché viejo.

---

## 📋 PASO 1: Identifica tu Plataforma de Hosting

¿Dónde está alojada tu aplicación?

- [ ] **Netlify** → Ve a la sección "Para Netlify"
- [ ] **Vercel** → Ve a la sección "Para Vercel"
- [ ] **cPanel / Hosting Compartido (Apache)** → Ve a la sección "Para Apache"
- [ ] **VPS con Nginx** → Ve a la sección "Para Nginx"
- [ ] **Otro** → Contacta a tu proveedor de hosting

---

## 🟢 Para NETLIFY

### ✅ Ya está todo listo
Los archivos `netlify.toml` y `public/_headers` ya están configurados.

### Lo que debes hacer:

1. **Compilar:**
   ```bash
   npm run build
   ```

2. **Desplegar:**
   - Sube la carpeta `dist/` a Netlify, o
   - Haz push a tu repositorio de Git si usas deploy automático

3. **Verificar:**
   - Abre: `https://tu-sitio.netlify.app/check-cache.html`
   - Debe mostrar todo en verde ✅

### ¡Listo! No necesitas nada más.

---

## 🔵 Para VERCEL

### ✅ Ya está todo listo
El archivo `vercel.json` ya está configurado.

### Lo que debes hacer:

1. **Compilar:**
   ```bash
   npm run build
   ```

2. **Desplegar:**
   - Haz push a tu repositorio de Git si usas deploy automático, o
   - Usa Vercel CLI: `vercel --prod`

3. **Verificar:**
   - Abre: `https://tu-sitio.vercel.app/check-cache.html`
   - Debe mostrar todo en verde ✅

### ¡Listo! No necesitas nada más.

---

## 🟠 Para APACHE (cPanel, Hosting Compartido)

### ⚠️ Requiere un paso extra

El archivo `.htaccess` ya está en `dist/`, pero debes verificar que tu servidor tenga habilitado `mod_headers`.

### Lo que debes hacer:

1. **Compilar:**
   ```bash
   npm run build
   ```

2. **Verificar que `.htaccess` existe:**
   ```bash
   ls dist/.htaccess
   ```
   Debe mostrar el archivo.

3. **Subir a tu servidor:**
   - Sube TODO el contenido de `dist/` a tu servidor
   - Asegúrate de que `.htaccess` esté en la raíz (donde está `index.html`)
   - En cPanel, usa el File Manager
   - **IMPORTANTE:** Marca "Show Hidden Files" para ver `.htaccess`

4. **Verificar:**
   - Abre: `https://tu-dominio.com/check-cache.html`
   - Si sale todo verde ✅ → ¡Listo!
   - Si sale rojo ❌ → Ver "Solución de Problemas" abajo

### Solución de Problemas

**Si check-cache.html muestra errores:**

Tu servidor no tiene habilitado `mod_headers`. Tienes 2 opciones:

**Opción A: Pedir a tu proveedor que lo habilite**
- Contacta al soporte técnico de tu hosting
- Di: "Necesito que habiliten mod_headers y mod_rewrite para mi sitio"
- Es un cambio simple y gratuito

**Opción B: Habilitar desde cPanel (si tienes acceso)**
- Ve a cPanel → Software → Select PHP Version
- Busca "Apache Modules"
- Habilita: `mod_headers` y `mod_rewrite`
- Guarda cambios

---

## 🟣 Para NGINX (VPS, Servidor Dedicado)

### ⚠️ Requiere configuración manual del servidor

### Lo que debes hacer:

1. **Compilar:**
   ```bash
   npm run build
   ```

2. **Subir archivos al servidor:**
   ```bash
   # Ejemplo con rsync
   rsync -av dist/ usuario@servidor:/var/www/html/
   ```

3. **Configurar Nginx:**

   Edita tu archivo de configuración:
   ```bash
   sudo nano /etc/nginx/sites-available/tu-sitio
   ```

   Usa el contenido del archivo `nginx.conf` que está en la raíz del proyecto.

   **Reemplaza:**
   - `your-domain.com` → Tu dominio real
   - `/var/www/html` → Tu ruta real

4. **Probar la configuración:**
   ```bash
   sudo nginx -t
   ```

5. **Recargar Nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

6. **Verificar:**
   - Abre: `https://tu-dominio.com/check-cache.html`
   - Debe mostrar todo en verde ✅

---

## 🔧 Herramienta de Verificación

Después de desplegar, SIEMPRE verifica:

### Abre en tu navegador:
```
https://tu-dominio.com/check-cache.html
```

Esta herramienta te dirá si:
- ✅ Los headers están configurados correctamente
- ✅ El archivo version.json existe
- ✅ Los assets tienen hash
- ✅ El sistema de detección de versión funciona

---

## 📝 Proceso de Deploy Futuro

Una vez configurado, cada vez que hagas cambios:

```bash
# 1. Actualiza la versión en .env
# Cambia: VITE_APP_VERSION=1.0.1 (incrementa el número)

# 2. Compila
npm run build

# 3. Sube dist/ a tu servidor
# (Método depende de tu plataforma)

# 4. Verifica
# Abre: https://tu-dominio.com/check-cache.html
```

---

## ❓ Preguntas Frecuentes

### P: ¿Cuánto tarda en actualizarse para los usuarios?
**R:**
- Usuarios nuevos: Inmediatamente
- Usuarios con la app abierta: Máximo 5 minutos (reciben notificación)

### P: ¿Tengo que hacer esto cada vez que haga cambios?
**R:** No. Solo necesitas:
1. Actualizar `VITE_APP_VERSION` en `.env`
2. Compilar con `npm run build`
3. Subir `dist/`

Los headers ya están configurados y no necesitas tocarlos más.

### P: ¿Qué pasa si un usuario sigue viendo versión vieja?
**R:**
1. Verifica que check-cache.html muestre todo verde
2. Si está verde, pide al usuario: `Ctrl+Shift+R` (hard reload)
3. Si persiste, el usuario debe vaciar el caché del navegador

### P: ¿Funciona en todos los navegadores?
**R:** Sí. Chrome, Firefox, Safari, Edge, todos respetan los headers HTTP.

---

## 🆘 ¿Necesitas Ayuda?

1. **Primera verificación:** Abre `/check-cache.html` en tu sitio
2. **Si hay errores rojos:** Lee `SOLUCION_CACHE.md` (más técnico)
3. **Si persiste:** Contacta al soporte de tu proveedor de hosting

---

## ✅ Checklist Final

Antes de considerar el problema resuelto:

- [ ] Compilé con `npm run build`
- [ ] Subí TODO el contenido de `dist/` al servidor
- [ ] Verifiqué que `.htaccess` o `_headers` se subió correctamente
- [ ] Abrí `/check-cache.html` y todo está en verde
- [ ] Probé con un navegador en incógnito
- [ ] Actualicé `VITE_APP_VERSION` y verifiqué que cambia

Si todos los items están marcados ✅, el sistema está funcionando correctamente.
