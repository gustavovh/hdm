interface VersionData {
  version: string;
  buildTime: string;
}

class VersionChecker {
  private checkInterval: number = 2 * 60 * 60 * 1000; // 2 horas
  private intervalId: NodeJS.Timeout | null = null;
  private currentVersion: string;
  private hasAskedToReload: boolean = false;

  constructor() {
    this.currentVersion = (window as any).APP_VERSION || '1.0.0';
    console.log(`🔖 Current app version: ${this.currentVersion}`);
  }

  start() {
    // NO revisar inmediatamente al iniciar para no interrumpir el trabajo
    // Revisar solo después de 2 horas
    this.intervalId = setInterval(() => {
      this.checkVersion();
    }, this.checkInterval);

    console.log(`✅ Version checker started (checking every ${this.checkInterval / 1000 / 60} minutes)`);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Version checker stopped');
    }
  }

  private async checkVersion() {
    try {
      const response = await fetch('/version.json', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        console.warn('Failed to fetch version.json');
        return;
      }

      const data: VersionData = await response.json();
      const serverVersion = data.version;

      console.log(`🔍 Version check - Current: ${this.currentVersion}, Server: ${serverVersion}`);

      if (serverVersion !== this.currentVersion) {
        console.log('🆕 New version detected!');
        this.notifyNewVersion(serverVersion);
      }
    } catch (error) {
      console.error('Error checking version:', error);
    }
  }

  private notifyNewVersion(newVersion: string) {
    // Solo preguntar una vez por sesión
    if (this.hasAskedToReload) {
      console.log('⏰ Already asked user to reload this session');
      return;
    }

    this.hasAskedToReload = true;

    const message =
      `Nueva versión disponible: ${newVersion}\n\n` +
      `Se recomienda recargar cuando termines tu trabajo actual.\n\n` +
      `¿Deseas recargar ahora?`;

    if (confirm(message)) {
      // Force reload, bypassing cache
      window.location.reload();
    } else {
      // No volver a preguntar en esta sesión
      console.log('⏰ User declined reload for this session');
    }
  }

  // Allow manual version check
  async checkNow() {
    await this.checkVersion();
  }
}

// Create singleton instance
export const versionChecker = new VersionChecker();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).versionChecker = versionChecker;
}
