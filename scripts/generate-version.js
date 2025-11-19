#!/usr/bin/env node
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const version = process.env.VITE_APP_VERSION || '1.0.0';

const versionData = {
  version,
  buildTime: new Date().toISOString(),
};

const distPath = resolve(__dirname, '../dist/version.json');
const publicPath = resolve(__dirname, '../public/version.json');

// Write to both public (for dev) and dist (for prod)
try {
  writeFileSync(publicPath, JSON.stringify(versionData, null, 2));
  console.log('✓ Generated public/version.json');
} catch (err) {
  console.error('Failed to generate public/version.json:', err);
}

try {
  writeFileSync(distPath, JSON.stringify(versionData, null, 2));
  console.log('✓ Generated dist/version.json');
} catch (err) {
  // dist might not exist yet during dev
  console.log('ℹ dist folder not found, skipping dist/version.json');
}
