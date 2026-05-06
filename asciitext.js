/**
 * ASCIIText — vanilla JS / ES-module port of the React Bits component.
 * Ported from https://codepen.io/JuanFuentes/pen/eYEeoyE
 * Depends on Three.js loaded as an ES module from CDN.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

// ── config (mirrors component props) ────────────────────────────────────────
const CONFIG = {
  text:            'DrHiroshima',
  enableWaves:     true,
  asciiFontSize:   8,
  textFontSize:    200,
  textColor:       '#fdf9f3',
  planeBaseHeight: 8,
};

// ── Math.map helper (used in original source) ────────────────────────────────
Math.map = (n, start, stop, start2, stop2) =>
  ((n - start) / (stop - start)) * (stop2 - start2) + start2;

const PX_RATIO = window.devicePixelRatio || 1;

// ── Shaders ──────────────────────────────────────────────────────────────────
const vertexShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uEnableWaves;
void main() {
  vUv = uv;
  float time = uTime * 5.;
  float waveFactor = uEnableWaves;
  vec3 transformed = position;
  transformed.x += sin(time + position.y) * 0.5 * waveFactor;
  transformed.y += cos(time + position.z) * 0.15 * waveFactor;
  transformed.z += sin(time + position.x) * waveFactor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}`;

const fragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform sampler2D uTexture;
void main() {
  float time = uTime;
  vec2 pos = vUv;
  float r = texture2D(uTexture, pos + cos(time * 2. - time + pos.x) * .01).r;
  float g = texture2D(uTexture, pos + tan(time * .5 + pos.x - time) * .01).g;
  float b = texture2D(uTexture, pos - cos(time * 2. + time + pos.y) * .01).b;
  float a = texture2D(uTexture, pos).a;
  gl_FragColor = vec4(r, g, b, a);
}`;

// ── AsciiFilter ───────────────────────────────────────────────────────────────
class AsciiFilter {
  constructor(renderer, { fontSize, fontFamily, charset, invert } = {}) {
    this.renderer   = renderer;
    this.invert     = invert ?? true;
    this.fontSize   = fontSize ?? 12;
    this.fontFamily = fontFamily ?? "'Courier New', monospace";
    this.charset    = charset ?? " .'`^\",;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
    this.deg        = 0;

    this.domElement = document.createElement('div');
    Object.assign(this.domElement.style, {
      position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
    });

    this.pre = document.createElement('pre');
    this.domElement.appendChild(this.pre);

    this.canvas  = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    // disable smoothing
    ['webkitImageSmoothingEnabled','mozImageSmoothingEnabled',
     'msImageSmoothingEnabled','imageSmoothingEnabled'].forEach(k => {
      if (k in this.context) this.context[k] = false;
    });
    this.domElement.appendChild(this.canvas);

    this._onMouseMove = this._onMouseMove.bind(this);
    document.addEventListener('mousemove', this._onMouseMove);
  }

  setSize(width, height) {
    this.width  = width;
    this.height = height;
    this.renderer.setSize(width, height);
    this._reset();
    this.center = { x: width / 2,  y: height / 2 };
    this.mouse  = { x: this.center.x, y: this.center.y };
  }

  _reset() {
    this.context.font = `${this.fontSize}px ${this.fontFamily}`;
    const charWidth = this.context.measureText('A').width;
    this.cols = Math.floor(this.width  / (this.fontSize * (charWidth / this.fontSize)));
    this.rows = Math.floor(this.height / this.fontSize);

    this.canvas.width  = this.cols;
    this.canvas.height = this.rows;

    Object.assign(this.pre.style, {
      fontFamily:       this.fontFamily,
      fontSize:         `${this.fontSize}px`,
      margin:           '0',
      padding:          '0',
      lineHeight:       '1em',
      position:         'absolute',
      left:             '0',
      top:              '0',
      zIndex:           '9',
      backgroundAttachment: 'fixed',
    });
  }

  render(scene, camera) {
    this.renderer.render(scene, camera);
    const { width: w, height: h } = this.canvas;
    this.context.clearRect(0, 0, w, h);
    if (w && h) this.context.drawImage(this.renderer.domElement, 0, 0, w, h);
    this._asciify(w, h);
    this._hue();
  }

  _onMouseMove(e) {
    this.mouse = { x: e.clientX * PX_RATIO, y: e.clientY * PX_RATIO };
  }

  get _dx() { return (this.mouse?.x ?? 0) - (this.center?.x ?? 0); }
  get _dy() { return (this.mouse?.y ?? 0) - (this.center?.y ?? 0); }

  _hue() {
    const deg = (Math.atan2(this._dy, this._dx) * 180) / Math.PI;
    this.deg += (deg - this.deg) * 0.075;
    this.domElement.style.filter = `hue-rotate(${this.deg.toFixed(1)}deg)`;
  }

  _asciify(w, h) {
    if (!w || !h) return;
    const imgData = this.context.getImageData(0, 0, w, h).data;
    let str = '';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (x + y * w) * 4;
        const [r, g, b, a] = [imgData[i], imgData[i+1], imgData[i+2], imgData[i+3]];
        if (a === 0) { str += ' '; continue; }
        let gray = (0.3 * r + 0.6 * g + 0.1 * b) / 255;
        let idx  = Math.floor((1 - gray) * (this.charset.length - 1));
        if (this.invert) idx = this.charset.length - idx - 1;
        str += this.charset[idx];
      }
      str += '\n';
    }
    this.pre.innerHTML = str;
  }

  dispose() {
    document.removeEventListener('mousemove', this._onMouseMove);
  }
}

// ── CanvasTxt ─────────────────────────────────────────────────────────────────
class CanvasTxt {
  constructor(txt, { fontSize = 200, fontFamily = 'Arial', color = '#fdf9f3' } = {}) {
    this.canvas  = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.txt        = txt;
    this.fontSize   = fontSize;
    this.fontFamily = fontFamily;
    this.color      = color;
    this.font       = `600 ${this.fontSize}px ${this.fontFamily}`;
  }

  resize() {
    this.context.font = this.font;
    const m = this.context.measureText(this.txt);
    this.canvas.width  = Math.ceil(m.width) + 20;
    this.canvas.height = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 20;
  }

  render() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = this.color;
    this.context.font      = this.font;
    const m    = this.context.measureText(this.txt);
    const yPos = 10 + m.actualBoundingBoxAscent;
    this.context.fillText(this.txt, 10, yPos);
  }

  get width()   { return this.canvas.width; }
  get height()  { return this.canvas.height; }
  get texture() { return this.canvas; }
}

// ── CanvAscii (main orchestrator) ─────────────────────────────────────────────
class CanvAscii {
  constructor({ text, asciiFontSize, textFontSize, textColor, planeBaseHeight, enableWaves },
              container, width, height) {
    this.textString     = text;
    this.asciiFontSize  = asciiFontSize;
    this.textFontSize   = textFontSize;
    this.textColor      = textColor;
    this.planeBaseHeight = planeBaseHeight;
    this.enableWaves    = enableWaves;
    this.container      = container;
    this.width          = width;
    this.height         = height;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    this.camera.position.z = 30;
    this.scene  = new THREE.Scene();
    this.mouse  = { x: width / 2, y: height / 2 };

    this._onMouseMove = this._onMouseMove.bind(this);
  }

  async init() {
    try {
      await document.fonts.load(`600 200px "IBM Plex Mono"`);
      await document.fonts.load(`500 12px "IBM Plex Mono"`);
    } catch (_) { /* fallback */ }
    await document.fonts.ready;
    this._setMesh();
    this._setRenderer();
  }

  _setMesh() {
    this.textCanvas = new CanvasTxt(this.textString, {
      fontSize:   this.textFontSize,
      fontFamily: 'IBM Plex Mono',
      color:      this.textColor,
    });
    this.textCanvas.resize();
    this.textCanvas.render();

    this.texture = new THREE.CanvasTexture(this.textCanvas.texture);
    this.texture.minFilter = THREE.NearestFilter;

    const aspect = this.textCanvas.width / this.textCanvas.height;
    const baseH  = this.planeBaseHeight;

    this.geometry = new THREE.PlaneGeometry(baseH * aspect, baseH, 36, 36);
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uTime:        { value: 0 },
        uTexture:     { value: this.texture },
        uEnableWaves: { value: this.enableWaves ? 1.0 : 0.0 },
      },
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  _setRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);

    this.filter = new AsciiFilter(this.renderer, {
      fontFamily: 'IBM Plex Mono',
      fontSize:   this.asciiFontSize,
      invert:     true,
    });

    // apply the purple gradient to the pre element
    Object.assign(this.filter.pre.style, {
      backgroundImage:    'linear-gradient(135deg, #d8b4fe 0%, #e879f9 50%, #c084fc 100%)',
      backgroundAttachment: 'fixed',
      webkitTextFillColor: 'transparent',
      webkitBackgroundClip: 'text',
      backgroundClip:     'text',
    });

    this.container.appendChild(this.filter.domElement);
    this.setSize(this.width, this.height);

    this.container.addEventListener('mousemove', this._onMouseMove);
    this.container.addEventListener('touchmove', this._onMouseMove);
  }

  setSize(w, h) {
    this.width  = w;
    this.height = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.filter.setSize(w, h);
    this.center = { x: w / 2, y: h / 2 };
  }

  load() {
    const tick = () => {
      this._animId = requestAnimationFrame(tick);
      this._render();
    };
    tick();
  }

  _onMouseMove(evt) {
    const e      = evt.touches ? evt.touches[0] : evt;
    const bounds = this.container.getBoundingClientRect();
    this.mouse   = { x: e.clientX - bounds.left, y: e.clientY - bounds.top };
  }

  _render() {
    const time = performance.now() * 0.001;
    this.textCanvas.render();
    this.texture.needsUpdate = true;
    this.material.uniforms.uTime.value = Math.sin(time);
    this._updateRotation();
    this.filter.render(this.scene, this.camera);
  }

  _updateRotation() {
    const x = Math.map(this.mouse.y, 0, this.height,  0.5, -0.5);
    const y = Math.map(this.mouse.x, 0, this.width,  -0.5,  0.5);
    this.mesh.rotation.x += (x - this.mesh.rotation.x) * 0.05;
    this.mesh.rotation.y += (y - this.mesh.rotation.y) * 0.05;
  }

  dispose() {
    cancelAnimationFrame(this._animId);
    this.filter?.dispose();
    if (this.filter?.domElement?.parentNode === this.container)
      this.container.removeChild(this.filter.domElement);
    this.container.removeEventListener('mousemove', this._onMouseMove);
    this.container.removeEventListener('touchmove', this._onMouseMove);
    this.scene.traverse(obj => {
      if (obj.isMesh) {
        obj.geometry.dispose();
        Object.values(obj.material).forEach(v => v?.dispose?.());
        obj.material.dispose();
      }
    });
    this.scene.clear();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }
}

// ── Mount ─────────────────────────────────────────────────────────────────────
(async () => {
  const container = document.getElementById('ascii-mount');
  if (!container) return;

  const { width, height } = container.getBoundingClientRect();

  const instance = new CanvAscii(CONFIG, container, width || container.offsetWidth, height || container.offsetHeight);
  await instance.init();
  instance.load();

  // handle resize
  const ro = new ResizeObserver(entries => {
    const { width: w, height: h } = entries[0].contentRect;
    if (w > 0 && h > 0) instance.setSize(w, h);
  });
  ro.observe(container);
})();
