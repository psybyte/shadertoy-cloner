'use strict';
/* ============================================================
   Uninstalls the ShaderToy Cloner Windows service.
   Run with Administrator privileges:
     node uninstall-service.js
   ============================================================ */

const { Service } = require('node-windows');
const path = require('path');
const fs   = require('fs');

const APP_NAME = 'ShaderToy Cloner';

// ── Shortcut paths ─────────────────────────────────────────────────────────────

const APPDATA     = process.env.APPDATA     || '';
const USERPROFILE = process.env.USERPROFILE || '';

const START_MENU_DIR = path.join(APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', APP_NAME);
const START_MENU_LNK = path.join(START_MENU_DIR, `${APP_NAME}.lnk`);
const DESKTOP_LNK    = path.join(USERPROFILE, 'Desktop', `${APP_NAME}.lnk`);

// Also clean up legacy .url shortcuts from older installs
const START_MENU_URL = path.join(START_MENU_DIR, `${APP_NAME}.url`);
const DESKTOP_URL    = path.join(USERPROFILE, 'Desktop', `${APP_NAME}.url`);

function removeShortcuts() {
  const filesToRemove = [START_MENU_LNK, START_MENU_URL, DESKTOP_LNK, DESKTOP_URL];

  for (const f of filesToRemove) {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    } catch (err) {
      console.warn(`  ⚠ Could not remove ${f}: ${err.message}`);
    }
  }

  try {
    if (fs.existsSync(START_MENU_DIR)) fs.rmdirSync(START_MENU_DIR);
    console.log('  ✓ Start Menu shortcut removed.');
  } catch (err) {
    console.warn(`  ⚠ Could not remove Start Menu folder: ${err.message}`);
  }

  try {
    if (!fs.existsSync(DESKTOP_LNK) && !fs.existsSync(DESKTOP_URL)) {
      console.log('  ✓ Desktop shortcut removed.');
    }
  } catch (_) {}
}

// ── Windows service ────────────────────────────────────────────────────────────

const svc = new Service({
  name:   APP_NAME,
  script: path.join(__dirname, 'server.js'),
});

svc.on('uninstall', () => {
  console.log('✓ Service uninstalled successfully.');
  removeShortcuts();
});

svc.on('error', err => {
  console.error('✗ Error:', err);
});

svc.on('notinstalled', () => {
  console.warn('⚠ Service was not installed.');
  console.log('  Cleaning up shortcuts anyway...');
  removeShortcuts();
});

console.log('Uninstalling service...');
svc.uninstall();
