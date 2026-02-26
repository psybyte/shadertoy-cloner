'use strict';
/* ============================================================
   i18n — Lightweight internationalization
   Supported languages: en (default), es
   ============================================================ */

const TRANSLATIONS = {
  en: {
    // Header
    'header.subtitle':             'local server · Lively Wallpaper',
    'header.settings':             'Settings',
    'header.settings.title':       'Settings',
    'header.lang':                 'ES',

    // Clone section
    'clone.title':                 'Clone shader',
    'clone.hint':                  'Paste the URL of a public ShaderToy shader to store it locally.',
    'clone.tab.url':               'Via API URL',
    'clone.tab.import':            'Import JSON',
    'clone.url.hint':              'Requires a ShaderToy API Key (Gold account or higher).',
    'clone.url.button':            'Clone',
    'clone.import.hint':           'On shadertoy.com open your shader → ··· menu → <strong>Export</strong>. Drag the <code>.json</code> here or click to select it.',
    'clone.import.drop':           'Drag a <code>shader_XXXXXX.json</code> or click',

    // Gallery
    'gallery.title':               'Cloned shaders',
    'gallery.refresh':             'Refresh',
    'gallery.refresh.title':       'Refresh',
    'gallery.empty':               'No cloned shaders yet.',
    'gallery.empty.sub':           'Paste a URL above to get started.',

    // Shader card
    'card.open':                   'Open in Lively',
    'card.copy':                   'Copy URL',
    'card.copy.title':             'Copy URL for Lively',
    'card.delete':                 'Delete',
    'card.delete.title':           'Delete shader',
    'card.by':                     'by',

    // Settings modal
    'settings.title':              'Settings',
    'settings.close.label':        'Close',
    'settings.apikey.label':       'ShaderToy API Key',
    'settings.apikey.placeholder': 'Your shadertoy.com API key',
    'settings.apikey.configured':  '••••••••  (already configured — leave blank to keep)',
    'settings.apikey.hint':        'Get your key at <a href="https://www.shadertoy.com/profile" target="_blank" rel="noopener">shadertoy.com/profile</a> → <em>Apps</em> section → <em>Add an application</em>.<br/>Only works with <strong>public</strong> shaders.',
    'settings.port.label':         'Server port',
    'settings.port.hint':          'Restart the service for port changes to take effect.',
    'settings.baseurl.label':      'Base URL for Lively Wallpaper',
    'settings.copy':               'Copy',
    'settings.cancel':             'Cancel',
    'settings.save':               'Save',

    // Toasts & status messages
    'toast.url.copied':            'URL copied to clipboard',
    'toast.base.copied':           'Base URL copied',
    'toast.settings.saved':        'Settings saved',
    'toast.cloning.contact':       'Contacting ShaderToy API…',
    'toast.cloned.ok':             '✓ "{name}" cloned successfully ({id})',
    'toast.importing':             'Importing {filename}…',
    'toast.imported.ok':           '✓ "{name}" imported successfully ({id})',
    'toast.invalid.json':          '✗ The file is not a valid JSON.',
    'toast.drop.reset':            'Drag a <code>shader_XXXXXX.json</code> or click',
    'toast.delete.confirm':        'Delete "{name}"?',
    'toast.deleted':               '"{name}" deleted',
    'toast.cloned':                '"{name}" cloned',
    'toast.imported':              '"{name}" imported',

    // Player
    'player.loading':              'Loading shader…',
    'player.no.id':                'No shader ID specified',
    'player.not.found':            'Shader not found',
    'player.compile.error':        'Error compiling shader',

    // Renderer errors
    'renderer.no.webgl2':          'WebGL2 is not available in this browser.',
    'renderer.no.image.pass':      'The shader has no pass of type "image".',
  },

  es: {
    // Header
    'header.subtitle':             'servidor local · Lively Wallpaper',
    'header.settings':             'Configuración',
    'header.settings.title':       'Configuración',
    'header.lang':                 'EN',

    // Clone section
    'clone.title':                 'Clonar shader',
    'clone.hint':                  'Pega la URL de un shader público de ShaderToy y se almacenará en local.',
    'clone.tab.url':               'Via API URL',
    'clone.tab.import':            'Importar JSON',
    'clone.url.hint':              'Requiere API Key de ShaderToy (perfil Gold o superior).',
    'clone.url.button':            'Clonar',
    'clone.import.hint':           'En shadertoy.com abre tu shader → menú ··· → <strong>Export</strong>. Arrastra el <code>.json</code> aquí o haz clic para seleccionarlo.',
    'clone.import.drop':           'Arrastra un <code>shader_XXXXXX.json</code> o haz clic',

    // Gallery
    'gallery.title':               'Shaders clonados',
    'gallery.refresh':             'Actualizar',
    'gallery.refresh.title':       'Actualizar',
    'gallery.empty':               'No hay shaders clonados todavía.',
    'gallery.empty.sub':           'Pega una URL arriba para empezar.',

    // Shader card
    'card.open':                   'Abrir en Lively',
    'card.copy':                   'Copiar URL',
    'card.copy.title':             'Copiar URL para Lively',
    'card.delete':                 'Eliminar',
    'card.delete.title':           'Eliminar shader',
    'card.by':                     'por',

    // Settings modal
    'settings.title':              'Configuración',
    'settings.close.label':        'Cerrar',
    'settings.apikey.label':       'ShaderToy API Key',
    'settings.apikey.placeholder': 'Tu clave API de shadertoy.com',
    'settings.apikey.configured':  '••••••••  (ya configurada — deja en blanco para conservar)',
    'settings.apikey.hint':        'Obtén tu clave en <a href="https://www.shadertoy.com/profile" target="_blank" rel="noopener">shadertoy.com/profile</a> → sección <em>Apps</em> → <em>Add an application</em>.<br/>Solo funciona con shaders <strong>públicos</strong>.',
    'settings.port.label':         'Puerto del servidor',
    'settings.port.hint':          'Reinicia el servicio para que el cambio de puerto tenga efecto.',
    'settings.baseurl.label':      'URL base para Lively Wallpaper',
    'settings.copy':               'Copiar',
    'settings.cancel':             'Cancelar',
    'settings.save':               'Guardar',

    // Toasts & status messages
    'toast.url.copied':            'URL copiada al portapapeles',
    'toast.base.copied':           'URL base copiada',
    'toast.settings.saved':        'Configuración guardada',
    'toast.cloning.contact':       'Contactando con la API de ShaderToy…',
    'toast.cloned.ok':             '✓ "{name}" clonado correctamente ({id})',
    'toast.importing':             'Importando {filename}…',
    'toast.imported.ok':           '✓ "{name}" importado correctamente ({id})',
    'toast.invalid.json':          '✗ El archivo no es un JSON válido.',
    'toast.drop.reset':            'Arrastra un <code>shader_XXXXXX.json</code> o haz clic',
    'toast.delete.confirm':        '¿Eliminar "{name}"?',
    'toast.deleted':               '"{name}" eliminado',
    'toast.cloned':                '"{name}" clonado',
    'toast.imported':              '"{name}" importado',

    // Player
    'player.loading':              'Cargando shader…',
    'player.no.id':                'ID de shader no especificado',
    'player.not.found':            'No se encontró el shader',
    'player.compile.error':        'Error al compilar el shader',

    // Renderer errors
    'renderer.no.webgl2':          'WebGL2 no disponible en este navegador.',
    'renderer.no.image.pass':      'El shader no tiene pass de tipo "image".',
  },
};

const SUPPORTED_LANGS = ['en', 'es'];
const DEFAULT_LANG    = 'en';

let _currentLang = DEFAULT_LANG;

function getLang() { return _currentLang; }

function t(key, vars = {}) {
  const dict = TRANSLATIONS[_currentLang] || TRANSLATIONS[DEFAULT_LANG];
  let str = (key in dict) ? dict[key] : (TRANSLATIONS[DEFAULT_LANG][key] ?? key);
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, v);
  }
  return str;
}

function applyTranslations() {
  document.documentElement.lang = _currentLang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  });
}

function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  _currentLang = lang;
  try { localStorage.setItem('lang', lang); } catch (_) {}
  applyTranslations();
  window.dispatchEvent(new Event('langchange'));
}

// Expose globals
window.t       = t;
window.getLang = getLang;
window.setLang = setLang;

// Init: restore saved language and apply on DOM ready
(function init() {
  let saved;
  try { saved = localStorage.getItem('lang'); } catch (_) {}
  _currentLang = SUPPORTED_LANGS.includes(saved) ? saved : DEFAULT_LANG;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTranslations);
  } else {
    applyTranslations();
  }
})();
