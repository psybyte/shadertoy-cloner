'use strict';
/* ============================================================
   Installs ShaderToy Cloner as a Windows service.
   Run with Administrator privileges:
     node install-service.js
   ============================================================ */

const { Service } = require('node-windows');
const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

const APP_NAME = 'ShaderToy Cloner';
const APP_URL  = 'http://localhost:7700';

// ── Shortcut paths ─────────────────────────────────────────────────────────────

const APPDATA     = process.env.APPDATA     || '';
const USERPROFILE = process.env.USERPROFILE || '';

const START_MENU_DIR = path.join(APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', APP_NAME);
const START_MENU_LNK = path.join(START_MENU_DIR, `${APP_NAME}.lnk`);
const DESKTOP_LNK    = path.join(USERPROFILE, 'Desktop', `${APP_NAME}.lnk`);

// ── Icon resolution ────────────────────────────────────────────────────────────

function resolveIconLocation() {
  // Use the bundled icon.ico from the project directory
  const bundledIcon = path.join(__dirname, 'icon.ico');
  if (fs.existsSync(bundledIcon)) {
    return `${bundledIcon},0`;
  }

  // Fallback: Microsoft Edge icon (always present on Windows 10/11)
  const edgeCandidates = [
    path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env['ProgramFiles']      || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env['ProgramW6432']      || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ];
  for (const edgePath of edgeCandidates) {
    if (edgePath && fs.existsSync(edgePath)) return `${edgePath},0`;
  }

  // Last resort: globe icon from imageres.dll
  const sys32 = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32');
  return `${path.join(sys32, 'imageres.dll')},13`;
}

// ── Shortcut creation via PowerShell WScript.Shell ────────────────────────────

function createShortcut(lnkPath, iconLocation) {
  const ps1 = `
$WshShell = New-Object -ComObject WScript.Shell
$s = $WshShell.CreateShortcut('${lnkPath.replace(/'/g, "''")}')
$s.TargetPath   = 'explorer.exe'
$s.Arguments    = '${APP_URL}'
$s.Description  = 'ShaderToy Cloner - Open local web interface'
$s.IconLocation = '${iconLocation.replace(/'/g, "''")}'
$s.Save()
`.trim();

  const tmpFile = path.join(os.tmpdir(), `shadertoy-shortcut-${Date.now()}.ps1`);
  fs.writeFileSync(tmpFile, ps1, 'utf8');
  try {
    execSync(`powershell -ExecutionPolicy Bypass -File "${tmpFile}"`, { stdio: 'pipe' });
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (_) {}
  }
}

function createShortcuts() {
  const iconLocation = resolveIconLocation();

  try {
    if (!fs.existsSync(START_MENU_DIR)) {
      fs.mkdirSync(START_MENU_DIR, { recursive: true });
    }
    createShortcut(START_MENU_LNK, iconLocation);
    console.log(`  ✓ Start Menu shortcut: ${START_MENU_LNK}`);
  } catch (err) {
    console.warn(`  ⚠ Could not create Start Menu shortcut: ${err.message}`);
  }

  try {
    createShortcut(DESKTOP_LNK, iconLocation);
    console.log(`  ✓ Desktop shortcut: ${DESKTOP_LNK}`);
  } catch (err) {
    console.warn(`  ⚠ Could not create Desktop shortcut: ${err.message}`);
  }
}

// ── Windows service ────────────────────────────────────────────────────────────

const svc = new Service({
  name:        APP_NAME,
  description: `Local ShaderToy server for Lively Wallpaper (${APP_URL})`,
  script:      path.join(__dirname, 'server.js'),
  nodeOptions: [],
  wait:        2,
  grow:        0.25,
  maxRetries:  5,
  env: [
    { name: 'NODE_ENV', value: 'production' },
  ],
});

svc.on('install', () => {
  console.log('✓ Service installed. Starting...');
  svc.start();
});

svc.on('start', () => {
  console.log('✓ Service started.');
  console.log(`  → Web manager: ${APP_URL}`);
  createShortcuts();
  console.log('  → To uninstall run: node uninstall-service.js');
});

svc.on('error', (err) => {
  console.error('✗ Service error:', err);
});

svc.on('alreadyinstalled', () => {
  console.warn('⚠ Service is already installed. To reinstall, run uninstall-service.js first.');
  console.log('  Recreating shortcuts anyway...');
  createShortcuts();
});

console.log('Installing Windows service...');
console.log('(Requires Administrator privileges)');
svc.install();
