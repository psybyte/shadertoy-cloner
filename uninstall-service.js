'use strict';
/* ============================================================
   Desinstala el servicio de Windows ShaderToy Cloner.
   Ejecutar con privilegios de administrador:
     node uninstall-service.js
   ============================================================ */

const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
  name:   'ShaderToy Cloner',
  script: path.join(__dirname, 'server.js'),
});

svc.on('uninstall', () => {
  console.log('✓ Servicio desinstalado correctamente.');
});

svc.on('error', err => {
  console.error('✗ Error:', err);
});

svc.on('notinstalled', () => {
  console.warn('⚠ El servicio no estaba instalado.');
});

console.log('Desinstalando servicio...');
svc.uninstall();
