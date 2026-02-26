'use strict';
/* ============================================================
   ShaderRenderer — WebGL2 runtime compatible with ShaderToy
   Supports:
     • Single-pass (Image only)
     • Multi-pass  (Buffer A/B/C/D → Image)
     • Texture / CubeMap channel inputs (proxied via /proxy/)
     • All standard ShaderToy uniforms
   ============================================================ */

// ── GLSL boilerplate ──────────────────────────────────────────────────────────

const VERT_SRC = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG_HEADER = `#version 300 es
precision highp float;
precision highp int;
precision mediump sampler3D;

uniform vec3      iResolution;
uniform float     iTime;
uniform float     iTimeDelta;
uniform float     iFrameRate;
uniform int       iFrame;
uniform vec4      iMouse;
uniform vec4      iDate;
uniform float     iSampleRate;
uniform vec3      iChannelResolution[4];
uniform float     iChannelTime[4];

`;

const FRAG_FOOTER = `
out vec4 _fragColor;
void main() { mainImage(_fragColor, gl_FragCoord.xy); }
`;

// ── Buffer output-ID → slot (API format uses numeric IDs 37-40) ───────────────
const OUTPUT_ID_TO_SLOT = { 37: 0, 38: 1, 39: 2, 40: 3 };

// Pass name → slot (export format uses names like "Buffer A")
const PASS_NAME_TO_SLOT = { 'Buffer A': 0, 'Buffer B': 1, 'Buffer C': 2, 'Buffer D': 3 };

/**
 * Build a dynamic output-string-id → slot map from the actual renderpass data.
 * Works with both API format (numeric output ids) and export format (string ids).
 */
function buildOutputSlotMap(bufferPasses) {
  const map = {}; // String(outputId) → slotIndex
  let autoSlot = 0;
  for (const pass of bufferPasses) {
    // Determine slot: first try pass name, then auto-increment
    const namedSlot = PASS_NAME_TO_SLOT[pass.name];
    const slot = namedSlot !== undefined ? namedSlot : autoSlot;
    autoSlot = slot + 1;
    for (const out of (pass.outputs || [])) {
      map[String(out.id)] = slot;
      // Also register numeric key for API-format IDs
      if (!isNaN(Number(out.id))) map[Number(out.id)] = slot;
    }
  }
  return map;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function glErr(gl, label) {
  const e = gl.getError();
  if (e !== gl.NO_ERROR) console.warn(`[GL] ${label}: error 0x${e.toString(16)}`);
}

function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`Shader compile error:\n${log}\n\n--- source ---\n${src}`);
  }
  return sh;
}

function linkProgram(gl, vertSrc, fragSrc) {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`Program link error:\n${log}`);
  }
  return prog;
}

function getUniforms(gl, prog) {
  const locs = {};
  const names = [
    'iResolution','iTime','iTimeDelta','iFrameRate','iFrame',
    'iMouse','iDate','iSampleRate',
    'iChannelResolution','iChannelTime',
    'iChannel0','iChannel1','iChannel2','iChannel3',
  ];
  for (const n of names) locs[n] = gl.getUniformLocation(prog, n);
  return locs;
}

// ── Texture loader ────────────────────────────────────────────────────────────

function createBlackTexture(gl) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  return tex;
}

function applyTextureParams(gl, target, filter, wrap, vflip) {
  const minFilter = filter === 'mipmap'
    ? gl.LINEAR_MIPMAP_LINEAR
    : filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
  const magFilter = filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
  const wrapMode  = wrap === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE;

  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter);
  gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapMode);
  gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapMode);

  if (filter === 'mipmap') gl.generateMipmap(target);
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

async function loadTexture2D(gl, src, filter, wrap, vflip) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // placeholder until loaded
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([20, 20, 20, 255]));

  try {
    const proxySrc = `/proxy${src}`;
    const img = await loadImage(proxySrc);

    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (vflip === 'true' || vflip === true) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    applyTextureParams(gl, gl.TEXTURE_2D, filter, wrap, vflip);
    tex._width  = img.width;
    tex._height = img.height;
  } catch (err) {
    console.warn(`[renderer] texture load failed (${src}):`, err.message);
  }
  return tex;
}

const CUBE_FACES = [
  gl => gl.TEXTURE_CUBE_MAP_POSITIVE_X,
  gl => gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
  gl => gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
  gl => gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
  gl => gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
  gl => gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
];

async function loadTextureCube(gl, baseSrc, filter, wrap) {
  // ShaderToy cubemap src looks like "/presets/cube00_0.jpg"
  // Faces are numbered _0 to _5
  const base = baseSrc.replace(/_\d+\./, '_');
  const ext  = baseSrc.split('.').pop();
  const stem = baseSrc.replace(/\.[^.]+$/, '').replace(/_\d+$/, '');

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);

  for (let i = 0; i < 6; i++) {
    gl.texImage2D(CUBE_FACES[i](gl), 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([20, 20, 20, 255]));
  }

  await Promise.all(CUBE_FACES.map(async (faceFn, i) => {
    const faceSrc = `/proxy${stem}_${i}.${ext}`;
    try {
      const img = await loadImage(faceSrc);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
      gl.texImage2D(faceFn(gl), 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    } catch (err) {
      console.warn(`[renderer] cubemap face ${i} failed:`, err.message);
    }
  }));

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
  return tex;
}

// ── Framebuffer (double-buffered for ping-pong) ────────────────────────────────

function createDoubleBuffer(gl, w, h) {
  const make = () => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fb };
  };

  // Fallback to UNSIGNED_BYTE if RGBA32F is not available
  return { front: make(), back: make(), w, h };
}

function resizeDoubleBuffer(gl, db, w, h) {
  for (const buf of [db.front, db.back]) {
    gl.bindTexture(gl.TEXTURE_2D, buf.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
  }
  db.w = w; db.h = h;
}

// ── Main class ────────────────────────────────────────────────────────────────

class ShaderRenderer {
  constructor(canvas) {
    this.canvas = canvas;

    const gl = canvas.getContext('webgl2', {
      antialias: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error('WebGL2 no disponible en este navegador.');

    // Check float texture support
    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');

    this.gl = gl;
    this._quad    = null;
    this._passes  = [];    // { prog, uniforms, inputs, outputSlot, isImage }
    this._buffers = [];    // double-buffers indexed by slot (0=BufA … 3=BufD)
    this._texCache = {};   // src → WebGLTexture

    this._t0       = performance.now() / 1000;
    this._lastT    = this._t0;
    this._frame    = 0;
    this._mouse    = [0, 0, 0, 0];

    this._setupQuad();
    this._setupMouse();
    this._setupResize();
    this._resize();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  async load(shaderData) {
    const gl = this.gl;
    const renderpass = shaderData.Shader.renderpass;

    const commonPass = renderpass.find(p => p.type === 'common');
    const commonCode = commonPass ? commonPass.code : '';
    const bufferPasses = renderpass.filter(p => p.type === 'buffer');
    const soundPasses  = renderpass.filter(p => p.type === 'sound');   // ignored for now
    const imagePass    = renderpass.find(p => p.type === 'image');

    if (!imagePass) throw new Error('El shader no tiene pass de tipo "image".');

    // Build dynamic output-id → slot map (handles both API and export formats)
    const outSlotMap = buildOutputSlotMap(bufferPasses);
    this._outSlotMap = outSlotMap;

    // Allocate double-buffers for each buffer pass output
    for (const pass of bufferPasses) {
      for (const out of (pass.outputs || [])) {
        const slot = outSlotMap[String(out.id)];
        if (slot !== undefined && !this._buffers[slot]) {
          this._buffers[slot] = createDoubleBuffer(gl, gl.drawingBufferWidth, gl.drawingBufferHeight);
        }
      }
    }

    // Pre-load static textures (all passes)
    const allPasses = [...bufferPasses, imagePass];
    for (const pass of allPasses) {
      for (const inp of (pass.inputs || [])) {
        if (inp.type === 'texture' || inp.type === 'cubemap') {
          if (!this._texCache[inp.src]) {
            this._texCache[inp.src] = inp.type === 'cubemap'
              ? await loadTextureCube(gl, inp.src, inp.filter, inp.wrap)
              : await loadTexture2D(gl, inp.src, inp.filter, inp.wrap, inp.vflip);
          }
        }
      }
    }

    // Compile each pass
    this._passes = [];
    for (const pass of [...bufferPasses, imagePass]) {
      const channelSamplerTypes = this._resolveChannelTypes(pass.inputs || []);
      const fragSrc = this._buildFrag(pass.code, commonCode, channelSamplerTypes);

      let prog;
      try {
        prog = linkProgram(gl, VERT_SRC, fragSrc);
      } catch (err) {
        console.error(`[renderer] compile error in pass "${pass.name}":`, err.message);
        throw err;
      }

      const uniforms = getUniforms(gl, prog);

      let outputSlot = null;
      if (pass.type === 'buffer') {
        for (const out of (pass.outputs || [])) {
          const s = outSlotMap[String(out.id)];
          if (s !== undefined) { outputSlot = s; break; }
        }
      }

      this._passes.push({
        name: pass.name,
        inputs: pass.inputs || [],
        prog,
        uniforms,
        outputSlot,
        isImage: pass.type === 'image',
      });
    }
  }

  render() {
    const gl = this.gl;
    const now    = performance.now() / 1000;
    const iTime  = now - this._t0;
    const iDelta = now - this._lastT;
    this._lastT  = now;

    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;

    const d = new Date();
    const iDate = [
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000,
    ];

    for (const pass of this._passes) {
      const { prog, uniforms, inputs, outputSlot, isImage } = pass;

      if (isImage) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, w, h);
      } else if (outputSlot !== null && this._buffers[outputSlot]) {
        const db = this._buffers[outputSlot];
        gl.bindFramebuffer(gl.FRAMEBUFFER, db.back.fb);
        gl.viewport(0, 0, db.w, db.h);
      } else {
        continue;
      }

      gl.useProgram(prog);

      // ── Standard uniforms ─────────────────────────────────────────────────
      if (uniforms.iResolution)     gl.uniform3f(uniforms.iResolution, w, h, 1);
      if (uniforms.iTime)           gl.uniform1f(uniforms.iTime, iTime);
      if (uniforms.iTimeDelta)      gl.uniform1f(uniforms.iTimeDelta, iDelta);
      if (uniforms.iFrameRate)      gl.uniform1f(uniforms.iFrameRate, 1 / (iDelta || 1/60));
      if (uniforms.iFrame)          gl.uniform1i(uniforms.iFrame, this._frame);
      if (uniforms.iMouse)          gl.uniform4fv(uniforms.iMouse, this._mouse);
      if (uniforms.iDate)           gl.uniform4fv(uniforms.iDate, iDate);
      if (uniforms.iSampleRate)     gl.uniform1f(uniforms.iSampleRate, 44100);

      // ── Channel uniforms ──────────────────────────────────────────────────
      const chanRes  = new Float32Array(12); // vec3 x 4
      const chanTime = new Float32Array(4);

      for (let ch = 0; ch < 4; ch++) {
        const inp = inputs.find(i => i.channel === ch);
        const texUnit = ch; // texture units 0–3

        gl.activeTexture(gl.TEXTURE0 + texUnit);

        if (!inp) {
          gl.bindTexture(gl.TEXTURE_2D, null);
          continue;
        }

        let boundTex = null;
        let texTarget = gl.TEXTURE_2D;

        if (inp.type === 'texture' || inp.type === 'cubemap') {
          const cached = this._texCache[inp.src];
          texTarget = inp.type === 'cubemap' ? gl.TEXTURE_CUBE_MAP : gl.TEXTURE_2D;
          if (cached) {
            gl.bindTexture(texTarget, cached);
            boundTex = cached;
          }
        } else if (inp.type === 'buffer') {
          // Map input id to buffer slot via the dynamic output-slot map
          const slot = (this._outSlotMap || {})[String(inp.id)];
          if (slot !== undefined && this._buffers[slot]) {
            const db = this._buffers[slot];
            gl.bindTexture(gl.TEXTURE_2D, db.front.tex);
            boundTex = db.front.tex;
            chanRes[ch * 3]     = db.w;
            chanRes[ch * 3 + 1] = db.h;
            chanRes[ch * 3 + 2] = 1;
          }
        } else if (inp.type === 'keyboard') {
          // Bind a black texture; keyboard input not supported
          gl.bindTexture(gl.TEXTURE_2D, null);
        }

        if (uniforms[`iChannel${ch}`] !== null) {
          gl.uniform1i(uniforms[`iChannel${ch}`], texUnit);
        }

        if (boundTex && (inp.type === 'texture')) {
          const t = this._texCache[inp.src];
          if (t && t._width) {
            chanRes[ch * 3]     = t._width;
            chanRes[ch * 3 + 1] = t._height;
            chanRes[ch * 3 + 2] = 1;
          }
        }
      }

      if (uniforms.iChannelResolution) gl.uniform3fv(uniforms.iChannelResolution, chanRes);
      if (uniforms.iChannelTime)       gl.uniform1fv(uniforms.iChannelTime, chanTime);

      // ── Draw fullscreen quad ──────────────────────────────────────────────
      gl.bindVertexArray(this._quad.vao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);

      // Ping-pong: swap front/back for buffer passes
      if (!isImage && outputSlot !== null && this._buffers[outputSlot]) {
        const db = this._buffers[outputSlot];
        [db.front, db.back] = [db.back, db.front];
      }
    }

    this._frame++;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  _resolveChannelTypes(inputs) {
    const types = ['sampler2D', 'sampler2D', 'sampler2D', 'sampler2D'];
    for (const inp of inputs) {
      const ch = inp.channel;
      if (ch >= 0 && ch <= 3) {
        if (inp.type === 'cubemap')       types[ch] = 'samplerCube';
        else if (inp.type === 'volume')   types[ch] = 'sampler3D';
        else                              types[ch] = 'sampler2D';
      }
    }
    return types;
  }

  _buildFrag(userCode, commonCode, channelTypes) {
    const chanDecls = channelTypes
      .map((t, i) => `uniform ${t} iChannel${i};`)
      .join('\n');
    return FRAG_HEADER + chanDecls + '\n\n' + commonCode + '\n\n' + userCode + FRAG_FOOTER;
  }

  _setupQuad() {
    const gl = this.gl;
    const verts = new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1,
    ]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this._quad = { buf, vao };
  }

  _setupMouse() {
    const cv = this.canvas;
    let down = false;
    cv.addEventListener('mousedown', e => {
      down = true;
      const r = cv.getBoundingClientRect();
      const x = (e.clientX - r.left) * (cv.width / r.width);
      const y = cv.height - (e.clientY - r.top) * (cv.height / r.height);
      this._mouse[0] = x; this._mouse[1] = y;
      this._mouse[2] = x; this._mouse[3] = y;
    });
    cv.addEventListener('mousemove', e => {
      if (!down) return;
      const r = cv.getBoundingClientRect();
      this._mouse[0] = (e.clientX - r.left) * (cv.width / r.width);
      this._mouse[1] = cv.height - (e.clientY - r.top) * (cv.height / r.height);
    });
    cv.addEventListener('mouseup', () => {
      down = false;
      this._mouse[2] = -Math.abs(this._mouse[2]);
      this._mouse[3] = -Math.abs(this._mouse[3]);
    });
  }

  _setupResize() {
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const gl = this.gl;
    const w = this.canvas.clientWidth  || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width  = w;
    this.canvas.height = h;

    // Resize all double-buffers to match
    for (const db of this._buffers) {
      if (db) resizeDoubleBuffer(gl, db, w, h);
    }
  }
}
