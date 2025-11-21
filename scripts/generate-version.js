#!/usr/bin/env node
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const version = process.env.VITE_APP_VERSION || '1.0.0';
const timestamp = Date.now();

const versionData = {
  version,
  buildTime: new Date().toISOString(),
  timestamp,
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

// Add timestamp to index.html to bust cache
const indexPath = resolve(__dirname, '../dist/index.html');
if (existsSync(indexPath)) {
  try {
    let html = readFileSync(indexPath, 'utf-8');

    // Add timestamp as meta tag
    const metaTag = `<meta name="build-timestamp" content="${timestamp}" />`;
    html = html.replace('</head>', `    ${metaTag}\n  </head>`);

    // Add cache buster to script and link tags
    html = html.replace(
      /(<script[^>]+src=")([^"]+)(")/g,
      `$1$2?v=${timestamp}$3`
    );
    html = html.replace(
      /(<link[^>]+href=")([^"]+\.css)(")/g,
      `$1$2?v=${timestamp}$3`
    );

    writeFileSync(indexPath, html);
    console.log('✓ Added cache busters to dist/index.html');
  } catch (err) {
    console.error('Failed to modify index.html:', err);
  }
}
