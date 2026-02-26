'use strict';
/* ============================================================
   Dashboard — ShaderToy Cloner
   ============================================================ */

// ── Utilities ─────────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

let _toastTimer;
function toast(msg, type = 'info') {
  const el = $('toast');
  el.textContent = msg;
  el.className = `toast toast-${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function getPlayerUrl(id) {
  return `${location.origin}/shader/${id}`;
}

// ── Shader list ───────────────────────────────────────────────────────────────

const grid       = $('shader-grid');
const countBadge = $('shader-count');
const emptyState = $('empty-state');
const tpl        = $('tpl-shader-card');

const CHANNEL_LABELS = {
  texture: 'Tex',
  cubemap: 'Cube',
  buffer:  'Buf',
  video:   'Vid',
  keyboard:'Key',
  music:   'Mus',
  volume:  'Vol',
  webcam:  'Cam',
};

// Replaces all text nodes in a button while keeping the SVG icon intact
function setBtnText(btn, text) {
  const svg = btn.querySelector('svg');
  btn.innerHTML = '';
  if (svg) btn.appendChild(svg);
  btn.append(document.createTextNode('\u00A0' + text));
}

function renderCard(shader) {
  const clone = tpl.content.cloneNode(true);
  const card = clone.querySelector('.shader-card');

  const thumb = card.querySelector('.card-thumb');
  thumb.src = shader.thumbnail;
  thumb.alt = shader.name;

  const playBtn = card.querySelector('.card-btn-play');
  playBtn.href = getPlayerUrl(shader.id);
  setBtnText(playBtn, t('card.open'));

  if (shader.hasMultiPass) {
    card.querySelector('.card-badge-multipass').classList.remove('hidden');
  }

  const chanEl = card.querySelector('.card-channels');
  if (shader.channelTypes && shader.channelTypes.length) {
    chanEl.textContent = shader.channelTypes
      .map(type => CHANNEL_LABELS[type] || type)
      .join(' · ');
  }

  card.querySelector('.card-title').textContent  = shader.name;
  card.querySelector('.card-author').textContent = `${t('card.by')} ${shader.author}`;
  const desc = (shader.description || '').replace(/<[^>]+>/g, '');
  card.querySelector('.card-desc').textContent   = desc.length > 100
    ? desc.slice(0, 100) + '…'
    : desc;

  const copyBtn = card.querySelector('.card-btn-copy');
  copyBtn.title = t('card.copy.title');
  setBtnText(copyBtn, t('card.copy'));

  const deleteBtn = card.querySelector('.card-btn-delete');
  deleteBtn.title = t('card.delete.title');
  setBtnText(deleteBtn, t('card.delete'));

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(getPlayerUrl(shader.id)).then(() => {
      toast(t('toast.url.copied'), 'success');
    });
  });

  deleteBtn.addEventListener('click', async () => {
    if (!confirm(t('toast.delete.confirm', { name: shader.name }))) return;
    try {
      await apiFetch(`/api/shaders/${shader.id}`, { method: 'DELETE' });
      toast(t('toast.deleted', { name: shader.name }), 'info');
      loadShaders();
    } catch (err) {
      toast(`Error: ${err.message}`, 'error');
    }
  });

  card.dataset.id = shader.id;
  return card;
}

async function loadShaders() {
  try {
    const shaders = await apiFetch('/api/shaders');
    grid.innerHTML = '';
    countBadge.textContent = shaders.length;

    if (shaders.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
      for (const s of shaders) {
        grid.appendChild(renderCard(s));
      }
    }
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  }
}

// Re-render cards when language changes
window.addEventListener('langchange', loadShaders);

// ── Tabs (URL vs Import) ──────────────────────────────────────────────────────

const tabUrl      = $('tab-url');
const tabImport   = $('tab-import');
const panelUrl    = $('panel-url');
const panelImport = $('panel-import');

tabUrl.addEventListener('click', () => {
  tabUrl.classList.add('active');       tabUrl.setAttribute('aria-selected', 'true');
  tabImport.classList.remove('active'); tabImport.setAttribute('aria-selected', 'false');
  panelUrl.classList.remove('hidden');
  panelImport.classList.add('hidden');
});
tabImport.addEventListener('click', () => {
  tabImport.classList.add('active');  tabImport.setAttribute('aria-selected', 'true');
  tabUrl.classList.remove('active');  tabUrl.setAttribute('aria-selected', 'false');
  panelImport.classList.remove('hidden');
  panelUrl.classList.add('hidden');
});

// ── Clone ─────────────────────────────────────────────────────────────────────

const inputUrl    = $('input-url');
const btnClone    = $('btn-clone');
const cloneStatus = $('clone-status');

function setCloneStatus(msg, type) {
  cloneStatus.textContent = msg;
  cloneStatus.className   = `clone-status clone-status-${type}`;
}

function resetCloneButton() {
  btnClone.disabled = false;
  btnClone.innerHTML =
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M12 5v14M5 12h14"/>
    </svg> ${t('clone.url.button')}`;
}

btnClone.addEventListener('click', async () => {
  const url = inputUrl.value.trim();
  if (!url) { inputUrl.focus(); return; }

  btnClone.disabled    = true;
  btnClone.textContent = t('clone.url.button') + '…';
  setCloneStatus(t('toast.cloning.contact'), 'loading');

  try {
    const { name, id } = await apiFetch('/api/clone', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    setCloneStatus(t('toast.cloned.ok', { name, id }), 'success');
    inputUrl.value = '';
    toast(t('toast.cloned', { name }), 'success');
    loadShaders();
  } catch (err) {
    setCloneStatus(`✗ ${err.message}`, 'error');
    toast(`Error: ${err.message}`, 'error');
  } finally {
    resetCloneButton();
  }
});

inputUrl.addEventListener('keydown', e => {
  if (e.key === 'Enter') btnClone.click();
});

$('btn-refresh').addEventListener('click', loadShaders);

// ── Import JSON ───────────────────────────────────────────────────────────────

const dropZone      = $('drop-zone');
const inputJsonFile = $('input-json-file');
const dropLabel     = $('drop-label');

async function importShaderJson(jsonText, filename) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    setCloneStatus(t('toast.invalid.json'), 'error');
    return;
  }

  setCloneStatus(t('toast.importing', { filename: filename || 'shader' }), 'loading');
  try {
    const { name, id } = await apiFetch('/api/import', {
      method: 'POST',
      body: JSON.stringify(parsed),
    });
    setCloneStatus(t('toast.imported.ok', { name, id }), 'success');
    dropLabel.innerHTML = t('clone.import.drop');
    toast(t('toast.imported', { name }), 'success');
    loadShaders();
  } catch (err) {
    setCloneStatus(`✗ ${err.message}`, 'error');
    toast(`Error: ${err.message}`, 'error');
  }
}

inputJsonFile.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  dropLabel.textContent = file.name;
  const reader = new FileReader();
  reader.onload = ev => importShaderJson(ev.target.result, file.name);
  reader.readAsText(file);
  inputJsonFile.value = '';
});

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  dropLabel.textContent = file.name;
  const reader = new FileReader();
  reader.onload = ev => importShaderJson(ev.target.result, file.name);
  reader.readAsText(file);
});

// ── Settings modal ────────────────────────────────────────────────────────────

const modalSettings = $('modal-settings');
const inputApiKey   = $('input-apikey');
const inputPort     = $('input-port');
const baseUrlEl     = $('base-url');

async function openSettings() {
  try {
    const s = await apiFetch('/api/settings');
    inputApiKey.value = '';
    inputApiKey.placeholder = s.apiKeyConfigured
      ? t('settings.apikey.configured')
      : t('settings.apikey.placeholder');
    inputPort.value = s.port || 7700;
    baseUrlEl.textContent = `${location.origin}/shader/`;
  } catch (_) {}
  modalSettings.classList.remove('hidden');
  inputApiKey.focus();
}

$('btn-settings').addEventListener('click', openSettings);
$('close-settings').addEventListener('click', () => modalSettings.classList.add('hidden'));
$('cancel-settings').addEventListener('click', () => modalSettings.classList.add('hidden'));

$('save-settings').addEventListener('click', async () => {
  const apiKey = inputApiKey.value.trim();
  const port   = Number(inputPort.value);

  const body = { port };
  if (apiKey) body.apiKey = apiKey;

  try {
    await apiFetch('/api/settings', { method: 'POST', body: JSON.stringify(body) });
    modalSettings.classList.add('hidden');
    toast(t('toast.settings.saved'), 'success');
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  }
});

$('btn-copy-base').addEventListener('click', () => {
  navigator.clipboard.writeText(baseUrlEl.textContent).then(() => {
    toast(t('toast.base.copied'), 'success');
  });
});

// Close modal clicking outside
modalSettings.addEventListener('click', e => {
  if (e.target === modalSettings) modalSettings.classList.add('hidden');
});

// ── Language switcher ─────────────────────────────────────────────────────────

$('btn-lang').addEventListener('click', () => {
  setLang(getLang() === 'en' ? 'es' : 'en');
});

// ── Init ──────────────────────────────────────────────────────────────────────

loadShaders();
