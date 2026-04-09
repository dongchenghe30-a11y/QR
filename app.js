/**
 * ColorPalette.tools — Core Application
 * ======================================
 * Modules:
 *  1. ColorMath     — HEX/RGB/HSL/HSV/CMYK conversions, luminance, contrast
 *  2. MedianCut     — Palette extraction from image pixel data
 *  3. SchemeGen     — Harmony scheme generation (complementary, analogous, etc.)
 *  4. ExportGen     — CSS / SCSS / JSON / Tailwind export
 *  5. ContrastUI    — WCAG checker + accessible suggestion generator
 *  6. Extractor     — Image upload, Canvas sampling, swatch rendering
 *  7. Generator     — Base-color picker + scheme UI
 *  8. ColorWheel    — Canvas-based color wheel visualization
 *  9. LivePreview   — Mockup rendering (web / app / cards)
 * 10. Converter     — Real-time color space converter
 * 11. Utils         — Toast, clipboard, drag-drop, event helpers
 */

'use strict';

/* =============================================
   1. ColorMath — Pure color conversion functions
   ============================================= */
const ColorMath = {

  // HEX → RGB  e.g. "#3B82F6" → {r:59,g:130,b:246}
  hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  },

  // RGB → HEX  e.g. {r:59,g:130,b:246} → "#3b82f6"
  rgbToHex({ r, g, b }) {
    return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  },

  // RGB → HSL  returns {h:0-360, s:0-100, l:0-100}
  rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) { h = 0; s = 0; }
    else {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  },

  // HSL → RGB
  hslToRgb({ h, s, l }) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  },

  // RGB → HSV  returns {h:0-360, s:0-100, v:0-100}
  rgbToHsv({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0, s = max === 0 ? 0 : d / max, v = max;
    if (d !== 0) {
      switch (max) {
        case r: h = ((g - b) / d % 6); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }
    return { h, s: Math.round(s * 100), v: Math.round(v * 100) };
  },

  // RGB → CMYK  returns {c,m,y,k} each 0-100
  rgbToCmyk({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const k = 1 - Math.max(r, g, b);
    if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
    return {
      c: Math.round((1 - r - k) / (1 - k) * 100),
      m: Math.round((1 - g - k) / (1 - k) * 100),
      y: Math.round((1 - b - k) / (1 - k) * 100),
      k: Math.round(k * 100)
    };
  },

  // Relative luminance per WCAG 2.1 spec (sRGB linearization)
  relativeLuminance({ r, g, b }) {
    const lin = v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  },

  // WCAG contrast ratio between two colors
  contrastRatio(rgb1, rgb2) {
    const L1 = this.relativeLuminance(rgb1);
    const L2 = this.relativeLuminance(rgb2);
    const lighter = Math.max(L1, L2), darker = Math.min(L1, L2);
    return parseFloat(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
  },

  // Perceived brightness (0-255)
  perceivedBrightness({ r, g, b }) {
    return Math.round(Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b));
  },

  // Best text color (black or white) for a given background
  bestTextColor(rgb) {
    return this.perceivedBrightness(rgb) > 128 ? '#1E293B' : '#FFFFFF';
  },

  // Rotate hue by degrees
  rotateHue(hex, degrees) {
    const rgb = this.hexToRgb(hex);
    const hsl = this.rgbToHsl(rgb);
    hsl.h = (hsl.h + degrees + 360) % 360;
    return this.rgbToHex(this.hslToRgb(hsl));
  },

  // Adjust lightness
  adjustLightness(hex, delta) {
    const rgb = this.hexToRgb(hex);
    const hsl = this.rgbToHsl(rgb);
    hsl.l = Math.max(5, Math.min(95, hsl.l + delta));
    return this.rgbToHex(this.hslToRgb(hsl));
  },

  // Adjust saturation
  adjustSaturation(hex, delta) {
    const rgb = this.hexToRgb(hex);
    const hsl = this.rgbToHsl(rgb);
    hsl.s = Math.max(0, Math.min(100, hsl.s + delta));
    return this.rgbToHex(this.hslToRgb(hsl));
  },

  // Validate hex string
  isValidHex(hex) {
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
  },

  // Nearest CSS named color (simplified lookup)
  cssColorName(hex) {
    const names = {
      '#ff0000':'red','#00ff00':'lime','#0000ff':'blue','#ffff00':'yellow',
      '#ff00ff':'magenta','#00ffff':'cyan','#ffffff':'white','#000000':'black',
      '#ffa500':'orange','#800080':'purple','#008000':'green','#ffc0cb':'pink',
      '#a52a2a':'brown','#808080':'gray','#c0c0c0':'silver','#000080':'navy',
      '#f5f5dc':'beige','#40e0d0':'turquoise','#ee82ee':'violet','#f0e68c':'khaki'
    };
    return names[hex.toLowerCase()] || '—';
  }
};

/* =============================================
   2. MedianCut — Extract dominant colors from image
   ============================================= */
const MedianCut = {

  // Main entry: pixels = Uint8ClampedArray (RGBA), count = desired palette size
  extract(pixels, count = 10) {
    const colors = this._samplePixels(pixels);
    if (colors.length === 0) return [];
    const boxes = this._medianCut(colors, count);
    const palette = boxes.map(box => this._averageColor(box));
    return this._sortByVibrancy(palette);
  },

  // Sample every 4th pixel, skip very dark / very light / nearly transparent
  _samplePixels(pixels) {
    const colors = [];
    for (let i = 0; i < pixels.length; i += 16) { // sample every 4th pixel (RGBA = 4 bytes each, step 4 pixels = 16 bytes)
      const r = pixels[i], g = pixels[i+1], b = pixels[i+2], a = pixels[i+3];
      if (a < 128) continue; // skip transparent
      const brightness = (r + g + b) / 3;
      if (brightness < 10 || brightness > 248) continue; // skip near black/white
      colors.push([r, g, b]);
    }
    return colors;
  },

  // Recursive median cut — splits the widest channel repeatedly
  _medianCut(colors, targetCount) {
    let boxes = [colors];
    while (boxes.length < targetCount) {
      // Find the box with the largest range
      let maxRange = -1, maxIdx = 0;
      boxes.forEach((box, i) => {
        const range = this._maxRange(box);
        if (range > maxRange) { maxRange = range; maxIdx = i; }
      });
      if (maxRange === 0) break;
      const split = this._splitBox(boxes[maxIdx]);
      boxes.splice(maxIdx, 1, ...split);
    }
    return boxes;
  },

  // Find largest RGB range in a box
  _maxRange(colors) {
    let minR=255,maxR=0,minG=255,maxG=0,minB=255,maxB=0;
    for (const [r,g,b] of colors) {
      minR=Math.min(minR,r); maxR=Math.max(maxR,r);
      minG=Math.min(minG,g); maxG=Math.max(maxG,g);
      minB=Math.min(minB,b); maxB=Math.max(maxB,b);
    }
    return Math.max(maxR-minR, maxG-minG, maxB-minB);
  },

  // Split box along widest channel at median
  _splitBox(colors) {
    let minR=255,maxR=0,minG=255,maxG=0,minB=255,maxB=0;
    for (const [r,g,b] of colors) {
      minR=Math.min(minR,r); maxR=Math.max(maxR,r);
      minG=Math.min(minG,g); maxG=Math.max(maxG,g);
      minB=Math.min(minB,b); maxB=Math.max(maxB,b);
    }
    const ranges = [maxR-minR, maxG-minG, maxB-minB];
    const ch = ranges.indexOf(Math.max(...ranges)); // 0=R, 1=G, 2=B
    colors.sort((a, b) => a[ch] - b[ch]);
    const mid = Math.floor(colors.length / 2);
    return [colors.slice(0, mid), colors.slice(mid)];
  },

  // Average color in a box
  _averageColor(colors) {
    if (!colors.length) return { r: 128, g: 128, b: 128 };
    const sum = colors.reduce((acc, [r,g,b]) => { acc.r+=r; acc.g+=g; acc.b+=b; return acc; }, {r:0,g:0,b:0});
    return { r: Math.round(sum.r/colors.length), g: Math.round(sum.g/colors.length), b: Math.round(sum.b/colors.length) };
  },

  // Sort by saturation * lightness variance (most vibrant first)
  _sortByVibrancy(palette) {
    return palette.map(rgb => {
      const hsl = ColorMath.rgbToHsl(rgb);
      const score = hsl.s * (1 - Math.abs(hsl.l - 50) / 50);
      return { ...rgb, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ r, g, b }) => ({ r, g, b }));
  }
};

/* =============================================
   3. SchemeGen — Color harmony generation
   ============================================= */
const SchemeGen = {

  descriptions: {
    'complementary':       'Colors 180° apart on the wheel. High contrast, bold energy. Best for CTAs and attention-grabbing accents.',
    'analogous':           'Colors within 30° of each other. Harmonious, natural, and easy on the eye. Great for backgrounds and illustrations.',
    'triadic':             'Three colors equally spaced at 120°. Vibrant yet balanced. Needs one dominant color to avoid chaos.',
    'split-complementary': 'Base + two colors flanking its complement (±30°). High contrast with more nuance than complementary.',
    'tetradic':            'Four colors at 90° intervals. Rich palette — use one as dominant and the others as accents sparingly.',
    'monochromatic':       'Single hue at multiple lightness and saturation levels. Elegant, controlled, and always cohesive.'
  },

  generate(baseHex, type) {
    const colors = [];
    switch (type) {
      case 'complementary':
        colors.push(baseHex, ColorMath.rotateHue(baseHex, 180));
        colors.push(ColorMath.adjustLightness(baseHex, 20), ColorMath.adjustLightness(baseHex, -20));
        colors.push(ColorMath.adjustLightness(ColorMath.rotateHue(baseHex, 180), 15));
        break;
      case 'analogous':
        colors.push(
          ColorMath.rotateHue(baseHex, -30),
          ColorMath.rotateHue(baseHex, -15),
          baseHex,
          ColorMath.rotateHue(baseHex, 15),
          ColorMath.rotateHue(baseHex, 30)
        );
        break;
      case 'triadic':
        colors.push(baseHex, ColorMath.rotateHue(baseHex, 120), ColorMath.rotateHue(baseHex, 240));
        colors.push(ColorMath.adjustLightness(baseHex, 20), ColorMath.adjustLightness(ColorMath.rotateHue(baseHex, 120), 15));
        break;
      case 'split-complementary':
        colors.push(baseHex, ColorMath.rotateHue(baseHex, 150), ColorMath.rotateHue(baseHex, 210));
        colors.push(ColorMath.adjustLightness(baseHex, 20), ColorMath.adjustLightness(ColorMath.rotateHue(baseHex, 150), 15));
        break;
      case 'tetradic':
        colors.push(baseHex, ColorMath.rotateHue(baseHex, 90), ColorMath.rotateHue(baseHex, 180), ColorMath.rotateHue(baseHex, 270));
        colors.push(ColorMath.adjustLightness(baseHex, 20));
        break;
      case 'monochromatic':
        colors.push(
          ColorMath.adjustLightness(baseHex, -30),
          ColorMath.adjustLightness(baseHex, -15),
          baseHex,
          ColorMath.adjustLightness(baseHex, 15),
          ColorMath.adjustLightness(baseHex, 30)
        );
        break;
      default:
        colors.push(baseHex);
    }
    const labels = this._labels(type);
    return colors.map((hex, i) => ({ hex, label: labels[i] || `Color ${i+1}` }));
  },

  _labels(type) {
    const map = {
      'complementary':       ['Base','Complement','Base Light','Base Dark','Comp Light'],
      'analogous':           ['-30°','-15°','Base','+15°','+30°'],
      'triadic':             ['Base','Triad 2','Triad 3','Base Light','Triad 2 Light'],
      'split-complementary': ['Base','Split 1','Split 2','Base Light','Split 1 Light'],
      'tetradic':            ['Base','Quad 2','Quad 3','Quad 4','Base Light'],
      'monochromatic':       ['Darkest','Darker','Base','Lighter','Lightest']
    };
    return map[type] || [];
  }
};

/* =============================================
   4. ExportGen — Format palette for export
   ============================================= */
const ExportGen = {

  generate(colors, format) {
    switch (format) {
      case 'css':      return this._css(colors);
      case 'scss':     return this._scss(colors);
      case 'json':     return this._json(colors);
      case 'tailwind': return this._tailwind(colors);
      default:         return '';
    }
  },

  _css(colors) {
    const vars = colors.map((c, i) => `  --color-${i+1}: ${c.hex};  /* ${c.label || 'Color '+(i+1)} */`).join('\n');
    return `:root {\n${vars}\n}`;
  },

  _scss(colors) {
    return colors.map((c, i) => `$color-${i+1}: ${c.hex};  // ${c.label || 'Color '+(i+1)}`).join('\n');
  },

  _json(colors) {
    const obj = {};
    colors.forEach((c, i) => {
      const key = (c.label || `color-${i+1}`).toLowerCase().replace(/\s+/g, '-');
      const rgb = ColorMath.hexToRgb(c.hex);
      const hsl = ColorMath.rgbToHsl(rgb);
      obj[key] = {
        hex: c.hex,
        rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
        hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
      };
    });
    return JSON.stringify(obj, null, 2);
  },

  _tailwind(colors) {
    const inner = colors.map((c, i) => {
      const key = (c.label || `color-${i+1}`).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g,'');
      return `      '${key}': '${c.hex}',`;
    }).join('\n');
    return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n${inner}\n      },\n    },\n  },\n};`;
  }
};

/* =============================================
   5. State — Global app state
   ============================================= */
const State = {
  extractedPalette: [],   // [{hex, r, g, b}]
  schemePalette: [],      // [{hex, label}]
  activeExportFormat: 'css',
  activeSchemeType: 'complementary',
  activeMockupTab: 'web',
  baseColor: '#3B82F6',
  fgColor: '#1E293B',
  bgColor: '#F8FAFC',
};

/* =============================================
   6. Utils — Helpers
   ============================================= */
const Utils = {
  toast(msg, duration = 2200) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), duration);
  },

  async copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.toast('✓ Copied to clipboard!');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.toast('✓ Copied!');
    }
  },

  el(id) { return document.getElementById(id); },

  on(id, event, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
  },

  formatHex(hex) {
    hex = hex.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    return hex.length === 4
      ? '#' + hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3]
      : hex;
  }
};

/* =============================================
   7. Extractor Module
   ============================================= */
const Extractor = {
  canvas: null,
  ctx: null,
  originalImageData: null,

  init() {
    this.canvas = Utils.el('imageCanvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    // Upload
    Utils.el('imageInput').addEventListener('change', e => {
      if (e.target.files[0]) this.loadFile(e.target.files[0]);
    });

    // Drag & drop
    const uploadArea = Utils.el('uploadArea');
    uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea.addEventListener('drop', e => {
      e.preventDefault(); uploadArea.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) this.loadFile(e.dataTransfer.files[0]);
    });
    uploadArea.addEventListener('click', () => Utils.el('imageInput').click());

    // Sample image
    Utils.el('sampleBtn').addEventListener('click', () => this.loadSampleImage());

    // Re-extract
    Utils.el('reExtractBtn').addEventListener('click', () => this.extractColors());

    // Color count change
    Utils.el('colorCount').addEventListener('change', () => this.extractColors());

    // Canvas click — eyedropper
    this.canvas.addEventListener('click', e => this.pickColorFromCanvas(e));

    // Send to generator
    Utils.el('sendToGenerator').addEventListener('click', () => {
      if (State.extractedPalette.length > 0) {
        const primary = State.extractedPalette[0];
        Generator.setBaseColor(primary.hex);
        document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
        Utils.toast('✓ Sent to Generator! Using most vibrant color as base.');
      }
    });

    // Copy all
    Utils.el('copyAllHex').addEventListener('click', () => {
      const hexes = State.extractedPalette.map(c => c.hex).join('\n');
      Utils.copyText(hexes);
    });
  },

  loadFile(file) {
    if (!file.type.startsWith('image/')) { Utils.toast('⚠ Please upload an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { Utils.toast('⚠ File too large (max 10MB)'); return; }
    const url = URL.createObjectURL(file);
    this.loadImageUrl(url);
  },

  loadSampleImage() {
    // Generate a colorful gradient sample using canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = 600; offscreen.height = 400;
    const ctx = offscreen.getContext('2d');

    // Draw a vibrant gradient to simulate a "sample" image
    const grad1 = ctx.createLinearGradient(0, 0, 600, 400);
    grad1.addColorStop(0, '#FF6B6B');
    grad1.addColorStop(0.2, '#FFA500');
    grad1.addColorStop(0.4, '#4ECDC4');
    grad1.addColorStop(0.6, '#45B7D1');
    grad1.addColorStop(0.8, '#96CEB4');
    grad1.addColorStop(1, '#FFEAA7');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, 600, 400);

    // Add circles
    const circles = [
      { x: 100, y: 100, r: 80, color: '#E74C3C' },
      { x: 300, y: 200, r: 100, color: '#3498DB' },
      { x: 500, y: 100, r: 70, color: '#2ECC71' },
      { x: 200, y: 300, r: 60, color: '#9B59B6' },
      { x: 450, y: 300, r: 90, color: '#F39C12' },
    ];
    circles.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fillStyle = c.color + 'CC';
      ctx.fill();
    });

    this.loadImageUrl(offscreen.toDataURL());
    Utils.toast('✓ Sample image loaded');
  },

  loadImageUrl(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Scale to max 800px wide for performance
      const maxW = 800;
      const scale = img.width > maxW ? maxW / img.width : 1;
      this.canvas.width = Math.round(img.width * scale);
      this.canvas.height = Math.round(img.height * scale);
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      this.originalImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

      Utils.el('uploadArea').style.display = 'none';
      Utils.el('extractorResult').style.display = 'grid';
      Utils.el('eyedropperHint').style.display = 'block';

      this.extractColors();
      URL.revokeObjectURL(url);
    };
    img.onerror = () => Utils.toast('⚠ Could not load image');
    img.src = url;
  },

  extractColors() {
    if (!this.originalImageData) return;
    const count = parseInt(Utils.el('colorCount').value);
    const pixels = this.originalImageData.data;
    const palette = MedianCut.extract(pixels, count);
    State.extractedPalette = palette.map(rgb => ({ ...rgb, hex: ColorMath.rgbToHex(rgb) }));
    this.renderPalette();
  },

  renderPalette() {
    const container = Utils.el('extractedPalette');
    container.innerHTML = '';
    State.extractedPalette.forEach((color, i) => {
      const rgb = `rgb(${color.r}, ${color.g}, ${color.b})`;
      const row = document.createElement('div');
      row.className = 'color-swatch-row';
      row.innerHTML = `
        <div class="swatch-block" style="background:${color.hex}"></div>
        <div class="swatch-info">
          <div class="swatch-hex">${color.hex.toUpperCase()}</div>
          <div class="swatch-rgb">${rgb}</div>
        </div>
        <button class="swatch-copy" data-hex="${color.hex}">Copy</button>`;
      row.querySelector('.swatch-copy').addEventListener('click', e => {
        e.stopPropagation();
        Utils.copyText(color.hex.toUpperCase());
      });
      row.addEventListener('click', () => Generator.setBaseColor(color.hex));
      container.appendChild(row);
    });

    // Update preview swatches
    this.updatePreviewSwatches();
  },

  updatePreviewSwatches() {
    const container = Utils.el('previewPaletteSwatches');
    if (!container) return;
    container.innerHTML = '';
    State.extractedPalette.forEach(color => {
      const el = document.createElement('div');
      el.className = 'preview-swatch-mini';
      el.style.background = color.hex;
      el.title = color.hex;
      el.addEventListener('click', () => {
        Utils.el('previewPrimary').value = color.hex;
      });
      container.appendChild(el);
    });
  },

  pickColorFromCanvas(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    const pixel = this.ctx.getImageData(x, y, 1, 1).data;
    const rgb = { r: pixel[0], g: pixel[1], b: pixel[2] };
    const hex = ColorMath.rgbToHex(rgb);
    const display = Utils.el('pickedColor');
    display.innerHTML = `
      <div style="width:28px;height:28px;background:${hex};border-radius:4px;border:1px solid rgba(0,0,0,.1)"></div>
      <strong>${hex.toUpperCase()}</strong>
      <span style="color:#64748B;font-size:.8rem">rgb(${rgb.r},${rgb.g},${rgb.b})</span>
      <button class="btn btn-sm btn-outline" onclick="Utils.copyText('${hex.toUpperCase()}')">Copy</button>`;
  }
};

/* =============================================
   8. Generator Module
   ============================================= */
const Generator = {
  init() {
    const picker = Utils.el('baseColorPicker');
    const hexInput = Utils.el('baseColorHex');

    picker.addEventListener('input', e => {
      State.baseColor = e.target.value;
      hexInput.value = e.target.value;
      this.updateScheme();
    });

    hexInput.addEventListener('input', e => {
      const hex = Utils.formatHex(e.target.value);
      if (ColorMath.isValidHex(hex)) {
        State.baseColor = hex;
        picker.value = hex;
        this.updateScheme();
      }
    });

    // Scheme type buttons
    document.querySelectorAll('.scheme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.scheme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        State.activeSchemeType = btn.dataset.scheme;
        this.updateScheme();
      });
    });

    // Export tabs
    document.querySelectorAll('.export-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.export-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        State.activeExportFormat = tab.dataset.format;
        this.updateExport();
      });
    });

    // Copy export
    Utils.el('copyExportBtn').addEventListener('click', () => {
      Utils.copyText(Utils.el('exportCode').textContent);
    });

    this.updateScheme();
  },

  setBaseColor(hex) {
    State.baseColor = hex;
    Utils.el('baseColorPicker').value = hex;
    Utils.el('baseColorHex').value = hex;
    this.updateScheme();
  },

  updateScheme() {
    const palette = SchemeGen.generate(State.baseColor, State.activeSchemeType);
    State.schemePalette = palette;
    this.renderSchemePalette(palette);
    this.updateExport();
    ColorWheel.draw(State.baseColor, State.activeSchemeType, palette);
    // Update description
    Utils.el('schemeDescription').textContent = SchemeGen.descriptions[State.activeSchemeType] || '';
  },

  renderSchemePalette(palette) {
    const container = Utils.el('schemePalette');
    container.innerHTML = '';
    palette.forEach(item => {
      const textColor = ColorMath.bestTextColor(ColorMath.hexToRgb(item.hex));
      const div = document.createElement('div');
      div.className = 'scheme-swatch';
      div.innerHTML = `
        <div class="scheme-swatch-color" style="background:${item.hex}"></div>
        <div class="scheme-swatch-info">
          <span class="scheme-swatch-hex">${item.hex.toUpperCase()}</span>
          <span class="scheme-swatch-label">${item.label}</span>
        </div>`;
      div.addEventListener('click', () => Utils.copyText(item.hex.toUpperCase()));
      div.title = 'Click to copy';
      container.appendChild(div);
    });
  },

  updateExport() {
    const code = ExportGen.generate(State.schemePalette, State.activeExportFormat);
    Utils.el('exportCode').textContent = code;
  }
};

/* =============================================
   9. ColorWheel — Canvas visualization
   ============================================= */
const ColorWheel = {
  init() {
    this.draw('#3B82F6', 'complementary', []);
  },

  draw(baseHex, type, palette) {
    const canvas = Utils.el('colorWheel');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = 100, cy = 100, r = 90, inner = 40;
    ctx.clearRect(0, 0, 200, 200);

    // Draw color wheel
    for (let angle = 0; angle < 360; angle++) {
      const startA = (angle - 0.5) * Math.PI / 180;
      const endA = (angle + 0.5) * Math.PI / 180;
      const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, r);
      const hsl1 = `hsl(${angle}, 100%, 50%)`;
      grad.addColorStop(0, `hsl(${angle}, 0%, 85%)`);
      grad.addColorStop(1, hsl1);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startA, endA);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Inner white circle
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    // Draw palette dots
    palette.forEach((item, i) => {
      const hsl = ColorMath.rgbToHsl(ColorMath.hexToRgb(item.hex));
      const angle = (hsl.h - 90) * Math.PI / 180;
      const dist = inner + (r - inner) * (hsl.s / 100);
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      const dotR = i === 0 ? 9 : 7;

      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = item.hex;
      ctx.fill();
      ctx.strokeStyle = i === 0 ? '#fff' : 'rgba(255,255,255,.8)';
      ctx.lineWidth = i === 0 ? 2.5 : 2;
      ctx.stroke();
    });
  }
};

/* =============================================
   10. ContrastChecker Module
   ============================================= */
const ContrastChecker = {
  init() {
    const fgPicker = Utils.el('fgColor');
    const bgPicker = Utils.el('bgColor');
    const fgHex = Utils.el('fgHex');
    const bgHex = Utils.el('bgHex');

    const syncAndCheck = () => this.check();

    fgPicker.addEventListener('input', e => { fgHex.value = e.target.value; State.fgColor = e.target.value; syncAndCheck(); });
    bgPicker.addEventListener('input', e => { bgHex.value = e.target.value; State.bgColor = e.target.value; syncAndCheck(); });

    fgHex.addEventListener('input', e => {
      const hex = Utils.formatHex(e.target.value);
      if (ColorMath.isValidHex(hex)) { fgPicker.value = hex; State.fgColor = hex; syncAndCheck(); }
    });
    bgHex.addEventListener('input', e => {
      const hex = Utils.formatHex(e.target.value);
      if (ColorMath.isValidHex(hex)) { bgPicker.value = hex; State.bgColor = hex; syncAndCheck(); }
    });

    Utils.el('checkContrastBtn').addEventListener('click', () => syncAndCheck());

    this.check();
  },

  check() {
    const fg = ColorMath.hexToRgb(State.fgColor);
    const bg = ColorMath.hexToRgb(State.bgColor);
    const ratio = ColorMath.contrastRatio(fg, bg);

    // Update preview
    const preview = Utils.el('contrastPreview');
    preview.style.background = State.bgColor;
    preview.style.color = State.fgColor;

    // Update ratio display
    Utils.el('ratioNum').textContent = ratio + ':1';

    // WCAG levels
    const levels = [
      { id: 'wcagAANormal',   req: 4.5, label: 'AA Normal' },
      { id: 'wcagAALarge',    req: 3.0, label: 'AA Large'  },
      { id: 'wcagAAANormal',  req: 7.0, label: 'AAA Normal'},
      { id: 'wcagAAALarge',   req: 4.5, label: 'AAA Large' }
    ];

    // Color the ratio number
    const ratioEl = Utils.el('ratioNum');
    if (ratio >= 7) ratioEl.style.color = '#10B981';
    else if (ratio >= 4.5) ratioEl.style.color = '#3B82F6';
    else if (ratio >= 3) ratioEl.style.color = '#F59E0B';
    else ratioEl.style.color = '#EF4444';

    levels.forEach(({ id, req }) => {
      const row = Utils.el(id);
      const badge = row.querySelector('.level-badge');
      const pass = ratio >= req;
      badge.textContent = pass ? '✓ Pass' : '✗ Fail';
      badge.className = 'level-badge ' + (pass ? 'pass' : 'fail');
    });

    // Suggest alternatives if fails AA
    if (ratio < 4.5) {
      this.suggestAlternatives(State.fgColor, State.bgColor, ratio);
    } else {
      Utils.el('accessibleSuggestions').style.display = 'none';
    }
  },

  suggestAlternatives(fgHex, bgHex, currentRatio) {
    const suggestions = [];
    const bg = ColorMath.hexToRgb(bgHex);

    // Try darker versions of fg
    for (let delta = -10; delta >= -60; delta -= 10) {
      const candidate = ColorMath.adjustLightness(fgHex, delta);
      const ratio = ColorMath.contrastRatio(ColorMath.hexToRgb(candidate), bg);
      if (ratio >= 4.5) { suggestions.push({ hex: candidate, ratio }); break; }
    }
    // Try lighter versions
    for (let delta = 10; delta <= 60; delta += 10) {
      const candidate = ColorMath.adjustLightness(fgHex, delta);
      const ratio = ColorMath.contrastRatio(ColorMath.hexToRgb(candidate), bg);
      if (ratio >= 4.5) { suggestions.push({ hex: candidate, ratio }); break; }
    }
    // Black and white always work
    const blackRatio = ColorMath.contrastRatio({ r:0,g:0,b:0 }, bg);
    const whiteRatio = ColorMath.contrastRatio({ r:255,g:255,b:255 }, bg);
    suggestions.push({ hex: '#000000', ratio: blackRatio });
    suggestions.push({ hex: '#FFFFFF', ratio: whiteRatio });

    if (suggestions.length > 0) {
      Utils.el('accessibleSuggestions').style.display = 'block';
      const list = Utils.el('suggestionList');
      list.innerHTML = '';
      [...new Map(suggestions.map(s => [s.hex, s])).values()].slice(0, 6).forEach(s => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `
          <div class="sugg-swatch" style="background:${s.hex};color:${ColorMath.bestTextColor(ColorMath.hexToRgb(s.hex))}"></div>
          <span class="sugg-text">${s.hex.toUpperCase()}</span>
          <span class="sugg-ratio">${s.ratio}:1 ✓</span>`;
        item.addEventListener('click', () => {
          Utils.el('fgColor').value = s.hex;
          Utils.el('fgHex').value = s.hex;
          State.fgColor = s.hex;
          this.check();
        });
        list.appendChild(item);
      });
    }
  }
};

/* =============================================
   11. LivePreview Module
   ============================================= */
const LivePreview = {
  init() {
    Utils.el('applyPreviewBtn').addEventListener('click', () => this.render());

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        State.activeMockupTab = btn.dataset.tab;
        this.render();
      });
    });

    this.render();
  },

  getColors() {
    return {
      primary:   Utils.el('previewPrimary').value || '#3B82F6',
      secondary: Utils.el('previewSecondary').value || '#8B5CF6',
      accent:    Utils.el('previewAccent').value || '#10B981',
      bg:        Utils.el('previewBg').value || '#F8FAFC',
      text:      Utils.el('previewText').value || '#1E293B',
    };
  },

  render() {
    const c = this.getColors();
    const frame = Utils.el('mockupFrame');
    switch (State.activeMockupTab) {
      case 'web':  frame.innerHTML = this.webMockup(c); break;
      case 'app':  frame.innerHTML = this.appMockup(c); break;
      case 'card': frame.innerHTML = this.cardsMockup(c); break;
    }
  },

  webMockup(c) {
    const textOnPrimary = ColorMath.bestTextColor(ColorMath.hexToRgb(c.primary));
    const textOnBg = c.text;
    return `
    <div class="mockup-web" style="background:${c.bg};color:${textOnBg};font-family:Inter,sans-serif;min-height:500px">
      <div class="mockup-nav" style="background:${c.primary};color:${textOnPrimary}">
        <span class="mockup-nav-logo">● BrandName</span>
        <div class="mockup-nav-links">
          <a style="color:${textOnPrimary};opacity:.85">Home</a>
          <a style="color:${textOnPrimary};opacity:.85">About</a>
          <a style="color:${textOnPrimary};opacity:.85">Services</a>
          <a style="color:${textOnPrimary};opacity:.85">Contact</a>
        </div>
      </div>
      <div class="mockup-hero-block" style="background:linear-gradient(135deg,${c.primary}22,${c.secondary}18)">
        <h2 style="color:${textOnBg}">Build Beautiful Digital Experiences</h2>
        <p style="color:${textOnBg};opacity:.7">Your palette applied to a real website layout. See how primary, secondary, and accent colors work together.</p>
        <div class="mockup-btn-row">
          <button class="mockup-btn" style="background:${c.primary};color:${textOnPrimary}">Get Started</button>
          <button class="mockup-btn" style="background:transparent;color:${c.primary};border:2px solid ${c.primary}">Learn More</button>
        </div>
      </div>
      <div class="mockup-cards" style="background:${c.bg}">
        ${[
          {title:'Design',text:'Create stunning visuals with harmonious color palettes.',icon:'🎨'},
          {title:'Develop',text:'Export clean CSS, SCSS, or JSON tokens instantly.',icon:'💻'},
          {title:'Deploy',text:'Ship accessible, WCAG-compliant designs every time.',icon:'🚀'}
        ].map(card => `
          <div class="mockup-card" style="background:${c.secondary}18;border:1px solid ${c.secondary}30">
            <div style="font-size:1.5rem;margin-bottom:8px">${card.icon}</div>
            <div class="mockup-card-title" style="color:${textOnBg}">${card.title}</div>
            <div class="mockup-card-text" style="color:${textOnBg}">${card.text}</div>
          </div>`).join('')}
      </div>
      <div style="padding:20px 28px;background:${c.accent}15;border-top:3px solid ${c.accent};margin:0 28px 28px;border-radius:8px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <strong style="color:${textOnBg}">Ready to get started?</strong>
          <p style="color:${textOnBg};opacity:.7;font-size:.85rem;margin-top:4px">Join thousands of designers who use our tool daily.</p>
        </div>
        <button class="mockup-btn" style="background:${c.accent};color:${ColorMath.bestTextColor(ColorMath.hexToRgb(c.accent))};flex-shrink:0">Sign Up Free</button>
      </div>
      <div style="background:${c.text};color:${c.bg};padding:16px 28px;font-size:.8rem;text-align:center;opacity:.9">
        © 2025 BrandName — Built with ColorPalette.tools
      </div>
    </div>`;
  },

  appMockup(c) {
    const textOnPrimary = ColorMath.bestTextColor(ColorMath.hexToRgb(c.primary));
    const textOnBg = c.text;
    const cardBg = ColorMath.adjustLightness(c.bg, -3);
    return `
    <div class="mockup-app" style="background:${c.bg};color:${textOnBg};font-family:Inter,sans-serif">
      <div class="app-status-bar" style="background:${c.primary};color:${textOnPrimary}">
        <span>9:41 AM</span><span>●●●  WiFi  100%</span>
      </div>
      <div class="app-topbar" style="background:${c.bg}">
        <span class="app-back" style="color:${c.primary}">‹</span>
        <span class="app-title" style="color:${textOnBg}">Dashboard</span>
        <div class="app-avatar" style="background:${c.primary};width:32px;height:32px;border-radius:50%;margin-left:auto;display:flex;align-items:center;justify-content:center;color:${textOnPrimary};font-weight:700;font-size:.8rem">AB</div>
      </div>
      <div class="app-banner" style="background:linear-gradient(135deg,${c.primary},${c.secondary})">
        <span class="app-banner-title" style="color:${textOnPrimary}">Welcome back!</span>
        <span class="app-banner-sub" style="color:${textOnPrimary}">Your palette preview looks great</span>
      </div>
      <div class="app-section">
        <div class="app-section-title" style="color:${textOnBg}">Quick Actions</div>
        ${[
          {icon:'🎨',label:'Color Extractor',sub:'Upload an image',color:c.primary},
          {icon:'🌈',label:'Scheme Generator',sub:'Create harmony',color:c.secondary},
          {icon:'♿',label:'Contrast Check',sub:'WCAG compliance',color:c.accent}
        ].map(item => `
          <div class="app-list-item" style="background:${cardBg}">
            <div class="app-list-icon" style="background:${item.color}22">
              <span>${item.icon}</span>
            </div>
            <div>
              <div class="app-list-label" style="color:${textOnBg}">${item.label}</div>
              <div class="app-list-sub" style="color:${textOnBg}">${item.sub}</div>
            </div>
            <span style="margin-left:auto;color:${textOnBg};opacity:.3">›</span>
          </div>`).join('')}
      </div>
      <div class="app-tab-bar" style="background:${c.bg}">
        ${['🏠 Home','🎨 Colors','⭐ Saved','👤 Profile'].map((t,i) => `
          <div class="app-tab ${i===0?'active':''}" style="color:${i===0?c.primary:textOnBg};opacity:${i===0?1:.4}">
            <span class="app-tab-icon">${t.split(' ')[0]}</span>${t.split(' ')[1]}
          </div>`).join('')}
      </div>
    </div>`;
  },

  cardsMockup(c) {
    const textOnPrimary = ColorMath.bestTextColor(ColorMath.hexToRgb(c.primary));
    const textOnBg = c.text;
    return `
    <div style="padding:24px;background:${c.bg};font-family:Inter,sans-serif;min-height:500px">
      <h3 style="margin-bottom:20px;color:${textOnBg}">UI Component Preview</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="ui-card" style="background:${c.primary};color:${textOnPrimary}">
          <div class="ui-card-tag">Revenue</div>
          <div class="ui-card-value">$48,295</div>
          <div class="ui-card-label">+12.5% this month</div>
          <div class="ui-card-bar" style="background:${textOnPrimary}30"><div class="ui-card-bar-fill" style="width:72%;background:${textOnPrimary}"></div></div>
        </div>
        <div class="ui-card" style="background:${c.secondary};color:${ColorMath.bestTextColor(ColorMath.hexToRgb(c.secondary))}">
          <div class="ui-card-tag">Users</div>
          <div class="ui-card-value">12,847</div>
          <div class="ui-card-label">+8.3% this week</div>
          <div class="ui-card-bar" style="background:rgba(255,255,255,.3)"><div class="ui-card-bar-fill" style="width:58%;background:rgba(255,255,255,.8)"></div></div>
        </div>
      </div>
      <div class="ui-card" style="background:white;border:1px solid ${c.primary}30;margin-bottom:16px">
        <div style="font-weight:700;margin-bottom:12px;color:${textOnBg}">Notifications</div>
        ${[
          {text:'New comment on your design',time:'2m ago',dot:c.primary},
          {text:'Export completed successfully',time:'15m ago',dot:c.accent},
          {text:'Palette shared with team',time:'1h ago',dot:c.secondary}
        ].map(n => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F1F5F9">
            <div style="width:8px;height:8px;border-radius:50%;background:${n.dot};flex-shrink:0"></div>
            <span style="flex:1;font-size:.85rem;color:${textOnBg}">${n.text}</span>
            <span style="font-size:.75rem;color:#94A3B8">${n.time}</span>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
        <span class="ui-badge" style="background:${c.primary}20;color:${c.primary}">Design System</span>
        <span class="ui-badge" style="background:${c.accent}20;color:${c.accent}">✓ Accessible</span>
        <span class="ui-badge" style="background:${c.secondary}20;color:${c.secondary}">WCAG AA</span>
      </div>
      <button class="ui-btn-full" style="background:${c.primary};color:${textOnPrimary}">Apply Palette to Project →</button>
    </div>`;
  }
};

/* =============================================
   12. Converter Module
   ============================================= */
const Converter = {
  init() {
    const picker = Utils.el('converterPicker');
    const hexInput = Utils.el('convHex');

    picker.addEventListener('input', e => { hexInput.value = e.target.value; this.update(e.target.value); });
    hexInput.addEventListener('input', e => {
      const hex = Utils.formatHex(e.target.value);
      if (ColorMath.isValidHex(hex)) { picker.value = hex; this.update(hex); }
    });

    this.update('#3B82F6');
  },

  update(hex) {
    if (!ColorMath.isValidHex(hex)) return;
    const rgb = ColorMath.hexToRgb(hex);
    const hsl = ColorMath.rgbToHsl(rgb);
    const hsv = ColorMath.rgbToHsv(rgb);
    const cmyk = ColorMath.rgbToCmyk(rgb);
    const lum = ColorMath.relativeLuminance(rgb);
    const bright = ColorMath.perceivedBrightness(rgb);
    const bestText = ColorMath.bestTextColor(rgb);

    Utils.el('converterSwatch').style.background = hex;
    Utils.el('convHex').value = hex.toUpperCase();
    Utils.el('convRgb').value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    Utils.el('convHsl').value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    Utils.el('convHsv').value = `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`;
    Utils.el('convCmyk').value = `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;

    Utils.el('infoLuminance').textContent = lum.toFixed(4);
    Utils.el('infoBrightness').textContent = bright + ' / 255 (' + (bright > 128 ? 'Light' : 'Dark') + ')';

    const bestTextEl = Utils.el('infoTextColor');
    bestTextEl.innerHTML = `<span style="padding:2px 10px;border-radius:4px;background:${hex};color:${bestText};font-weight:700;font-size:.8rem">${bestText === '#FFFFFF' ? 'White text' : 'Dark text'}</span>`;

    Utils.el('infoCssName').textContent = ColorMath.cssColorName(hex.toLowerCase()) || '—';
  }
};

// Simple View Switching
function switchView(viewName) {
  // Hide all views
  var views = document.getElementsByClassName('tool-view');
  for (var i = 0; i < views.length; i++) {
    views[i].style.display = 'none';
  }

  // Show target view
  var target = document.getElementById(viewName);
  if (target) {
    target.style.display = 'block';
  }

  // Update nav button states
  var navBtns = document.getElementsByClassName('nav-btn');
  for (var j = 0; j < navBtns.length; j++) {
    if (navBtns[j].getAttribute('data-tool') === viewName) {
      navBtns[j].classList.add('active');
    } else {
      navBtns[j].classList.remove('active');
    }
  }

  window.scrollTo(0, 0);
}

function initViewRouter() {
  // Nav buttons in header
  var navBtns = document.getElementsByClassName('nav-btn');
  for (var i = 0; i < navBtns.length; i++) {
    navBtns[i].onclick = function() {
      var tool = this.getAttribute('data-tool');
      switchView(tool);
    };
  }

  // Show extractor by default (not home)
  switchView('extractor');
}

/* =============================================
   13. Bootstrap — Initialize everything
   ============================================= */
document.addEventListener('DOMContentLoaded', function() {
  initViewRouter();
  Extractor.init();
  Generator.init();
  ColorWheel.init();
  ContrastChecker.init();
  LivePreview.init();
  Converter.init();

  console.log('%cColorPalette.tools initialized ✓', 'color:#3B82F6;font-weight:700;font-size:14px');
});
