// Safe Bugsnag wrapper: inicializa sólo si hay API key y nunca lanza errores que rompan la app.
// Ajusta el require/import si usas otro SDK. Mantén este wrapper para evitar crashes en deploy previews.

let bugsnagClient: any = null;

export function initBugsnagIfNeeded() {
  // Si quieres deshabilitar en deploy previews define VITE_DISABLE_BUGSNAG=true
  if (import.meta.env.VITE_DISABLE_BUGSNAG === 'true') {
    // eslint-disable-next-line no-console
    console.info('Bugsnag disabled by VITE_DISABLE_BUGSNAG');
    return;
  }

  try {
    const key = import.meta.env.VITE_BUGSNAG_API_KEY;
    if (!key) {
      // eslint-disable-next-line no-console
      console.info('Bugsnag not initialized: VITE_BUGSNAG_API_KEY not set');
      return;
    }

    // Import dinámico para evitar romper build si el paquete no está disponible en previews.
    // Ajusta si usas @bugsnag/js, @bugsnag/react, etc.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bugsnag = require('@bugsnag/js');
    bugsnagClient = bugsnag({
      apiKey: key,
      releaseStage: import.meta.env.MODE || 'production',
    });

    // eslint-disable-next-line no-console
    console.info('Bugsnag initialized');
  } catch (err) {
    // No permitimos que Bugsnag rompa la app.
    // eslint-disable-next-line no-console
    console.warn('Bugsnag init failed (ignored):', err);
    bugsnagClient = null;
  }
}

export function notifyBugsnag(err: any, meta?: any) {
  try {
    if (bugsnagClient && typeof bugsnagClient.notify === 'function') {
      bugsnagClient.notify(err, { metaData: meta });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Bugsnag notify failed (ignored):', e);
  }
}

export default {
  init: initBugsnagIfNeeded,
  notify: notifyBugsnag,
};
