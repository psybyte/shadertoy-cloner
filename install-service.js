'use strict';
/* ============================================================
   Instala ShaderToy Cloner como servicio de Windows.
   Ejecutar con privilegios de administrador:
     node install-service.js
   ============================================================ */

const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
  name:        'ShaderToy Cloner',
  description: 'Servidor local de ShaderToy para Lively Wallpaper (http://localhost:7700)',
  script:      path.join(__dirname, 'server.js'),
  nodeOptions: [],
  wait:        2,      // segundos antes de reintentar si falla
  grow:        0.25,   // factor de crecimiento del tiempo de espera
  maxRetries:  5,
  env: [
    { name: 'NODE_ENV', value: 'production' },
  ],
});

svc.on('install', () => {
  console.log('✓ Servicio instalado. Iniciando...');
  svc.start();
});

svc.on('start', () => {
  console.log('✓ Servicio iniciado.');
  console.log('  → Gestor web: http://localhost:7700');
  console.log('  → Para desinstalar ejecuta: node uninstall-service.js');
});

svc.on('error', (err) => {
  console.error('✗ Error en el servicio:', err);
});

svc.on('alreadyinstalled', () => {
  console.warn('⚠ El servicio ya está instalado. Para reinstalar, ejecuta primero uninstall-service.js');
});

console.log('Instalando servicio de Windows...');
console.log('(Requiere privilegios de Administrador)');
svc.install();
