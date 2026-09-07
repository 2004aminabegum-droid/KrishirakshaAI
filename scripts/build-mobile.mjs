#!/usr/bin/env node
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 [KrishiRakshak AI] Starting Native Mobile Build Pipeline...');

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

// Step 1: Next.js static export
console.log('⚙️  Step 1/2: Exporting Next.js static production bundle (CAPACITOR_BUILD=true)...');
const buildRes = spawnSync(npxCmd, ['next', 'build'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    CAPACITOR_BUILD: 'true'
  }
});

if (buildRes.status !== 0) {
  console.error(`❌ Next.js static export failed with exit code ${buildRes.status}`);
  process.exit(buildRes.status || 1);
}

console.log('✅ Next.js static assets built in /out');

// Step 2: Capacitor Sync
const androidDir = path.join(rootDir, 'android');
if (existsSync(androidDir)) {
  console.log('📱 Step 2/2: Syncing web bundle & plugins to Native Android project...');
  const syncRes = spawnSync(npxCmd, ['cap', 'sync', 'android'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
  });

  if (syncRes.status !== 0) {
    console.error(`❌ Capacitor sync failed with exit code ${syncRes.status}`);
    process.exit(syncRes.status || 1);
  }
  console.log('🎉 Android Native Project sync complete!');
} else {
  console.log('📱 Android platform not yet initialized. Will sync once initialized.');
}
