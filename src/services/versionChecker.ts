interface VersionData {
  version: string;
  buildTime: string;
}

class VersionChecker {
  private checkInterval: number = 5 * 60 * 1000; // 5 minutes
  private intervalId: NodeJS.Timeout | null = null;
  private currentVersion: string;

  constructor() {
    this.currentVersion = (window as any).APP_VERSION || '1.0.0';
    console.log(`🔖 Current app version: ${this.currentVersion}`);
  }

  start() {
    // Check immediately on start
    this.checkVersion();

    // Then check every X minutes
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
    const message =
      `¡Nueva versión disponible!\n\n` +
      `Versión actual: ${this.currentVersion}\n` +
      `Nueva versión: ${newVersion}\n\n` +
      `Se recomienda recargar la página para obtener las últimas actualizaciones.\n\n` +
      `¿Deseas recargar ahora?`;

    if (confirm(message)) {
      // Force reload, bypassing cache
      window.location.reload();
    } else {
      // Ask again in 5 minutes
      console.log('⏰ User declined reload, will ask again later');
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
