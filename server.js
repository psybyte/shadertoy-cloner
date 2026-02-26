'use strict';

const express = require('express');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const DEFAULT_PORT = 7700;

// When bundled with pkg the snapshot filesystem is read-only, so data files
// must live next to the executable on the real filesystem.
const BASE_DIR  = process.pkg ? path.dirname(process.execPath) : __dirname;
const DATA_DIR     = path.join(BASE_DIR, 'data');
const SHADERS_DIR  = path.join(DATA_DIR, 'shaders');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

fs.ensureDirSync(SHADERS_DIR);

let settings = { apiKey: '', port: DEFAULT_PORT };

if (fs.existsSync(SETTINGS_FILE)) {
  try {
    settings = { ...settings, ...fs.readJsonSync(SETTINGS_FILE) };
  } catch (_) {}
}

// ── Settings ──────────────────────────────────────────────────────────────────

app.get('/api/settings', (_req, res) => {
  res.json({
    apiKeyConfigured: Boolean(settings.apiKey),
    port: settings.port,
  });
});

app.post('/api/settings', (req, res) => {
  const { apiKey, port } = req.body;
  if (apiKey !== undefined) settings.apiKey = apiKey;
  if (port)                 settings.port  = Number(port);
  fs.writeJsonSync(SETTINGS_FILE, settings, { spaces: 2 });
  res.json({ success: true });
});

// ── Shader CRUD ───────────────────────────────────────────────────────────────

app.get('/api/shaders', (_req, res) => {
  try {
    const files = fs.readdirSync(SHADERS_DIR).filter(f => f.endsWith('.json'));
    const list = files.map(f => {
      const data = fs.readJsonSync(path.join(SHADERS_DIR, f));
      const info = data.Shader.info;
      const passes = data.Shader.renderpass || [];
      const hasMultiPass = passes.filter(p => p.type === 'buffer').length > 0;
      const channelTypes = [...new Set(
        passes.flatMap(p => (p.inputs || []).map(i => i.type))
      )].filter(Boolean);
      return {
        id:          info.id,
        name:        info.name,
        author:      info.username,
        description: info.description,
        likes:       info.likes,
        viewed:      info.viewed,
        thumbnail:   `https://www.shadertoy.com/media/shaders/${info.id}.jpg`,
        hasMultiPass,
        channelTypes,
        clonedAt:    data._clonedAt || null,
      };
    });
    list.sort((a, b) => (b.clonedAt || '').localeCompare(a.clonedAt || ''));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/shaders/:id', (req, res) => {
  const file = path.join(SHADERS_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Shader not found' });
  res.json(fs.readJsonSync(file));
});

app.delete('/api/shaders/:id', (req, res) => {
  const file = path.join(SHADERS_DIR, `${req.params.id}.json`);
  if (fs.existsSync(file)) fs.removeSync(file);
  res.json({ success: true });
});

// ── Import (exported JSON from ShaderToy) ────────────────────────────────────

/**
 * ShaderToy exports a "bare" format:  { ver, info, renderpass }
 * The API returns a wrapped format:   { Shader: { ver, info, renderpass } }
 * We normalise everything to the wrapped form internally.
 */
function normalizeShaderJson(raw) {
  if (raw && raw.Shader && raw.Shader.info && raw.Shader.renderpass) {
    return raw; // already API format
  }
  if (raw && raw.ver && raw.info && raw.renderpass) {
    return { Shader: raw }; // bare export format
  }
  throw new Error('Unrecognized JSON format. Export the shader from ShaderToy and try again.');
}

app.post('/api/import', (req, res) => {
  try {
    const normalized = normalizeShaderJson(req.body);
    const info = normalized.Shader.info;

    if (!info || !info.id) {
      return res.status(400).json({ error: 'The JSON does not contain a valid info.id field.' });
    }

    normalized._clonedAt = new Date().toISOString();
    normalized._importedFrom = 'local-export';

    fs.writeJsonSync(path.join(SHADERS_DIR, `${info.id}.json`), normalized, { spaces: 2 });
    res.json({ success: true, id: info.id, name: info.name });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Clone ─────────────────────────────────────────────────────────────────────

app.post('/api/clone', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  if (!settings.apiKey) {
    return res.status(400).json({
      error: 'API key not configured. Open Settings and add your ShaderToy API key.',
    });
  }

  const match = url.match(/shadertoy\.com\/view\/([a-zA-Z0-9]+)/i);
  if (!match) {
    return res.status(400).json({
      error: 'Invalid URL. Expected: https://www.shadertoy.com/view/XXXXXXXX',
    });
  }

  const id = match[1];

  try {
    const apiUrl = `https://www.shadertoy.com/api/v1/shaders/${id}?key=${settings.apiKey}`;
    const { data } = await axios.get(apiUrl, { timeout: 15000 });

    if (data.Error) {
      return res.status(400).json({ error: `ShaderToy API: ${data.Error}` });
    }

    data._clonedAt = new Date().toISOString();
    fs.writeJsonSync(path.join(SHADERS_DIR, `${id}.json`), data, { spaces: 2 });

    res.json({ success: true, id, name: data.Shader.info.name });
  } catch (err) {
    const msg = err.response
      ? `ShaderToy API responded with ${err.response.status}`
      : err.message;
    res.status(500).json({ error: `Clone failed: ${msg}` });
  }
});

// ── Media proxy (textures, cubemaps from shadertoy CDN) ───────────────────────

app.get('/proxy/*', async (req, res) => {
  const resourcePath = req.params[0];
  const remoteUrl = `https://www.shadertoy.com/${resourcePath}`;

  try {
    const response = await axios.get(remoteUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.shadertoy.com/',
        'Origin': 'https://www.shadertoy.com',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'same-origin',
        'Cache-Control': 'no-cache',
      },
    });
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(response.data));
  } catch (err) {
    const status = err.response ? err.response.status : 502;
    const message = err.response
      ? `Upstream returned ${err.response.status} for ${remoteUrl}`
      : `Proxy error: ${err.message}`;
    console.warn(`[proxy] ${message}`);
    res.status(status).json({ error: message });
  }
});

// ── Player route (SPA fallback) ───────────────────────────────────────────────

app.get('/shader/:id', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = settings.port || DEFAULT_PORT;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`ShaderToy Cloner  →  http://localhost:${PORT}`);
  console.log(`Data directory    →  ${DATA_DIR}`);
});
