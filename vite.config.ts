import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Plugin to inject environment variables into HTML
function htmlEnvPlugin(): Plugin {
  return {
    name: 'html-env-plugin',
    transformIndexHtml(html) {
      return html.replace(
        '%VITE_APP_VERSION%',
        process.env.VITE_APP_VERSION || '1.0.0'
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), htmlEnvPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  publicDir: 'public',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
});
