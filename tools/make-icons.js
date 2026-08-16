'use strict';
// Identity generator: timer glyph (Lucide "timer", ISC license) rendered
// monochrome via signed-distance functions + supersampling. Pure Node.
// Outputs:
//   assets/icon.png                    512px preview
//   assets/icon.ico                    256/48/32/16 (PNG-compressed entries)
//   assets/installer-sidebar.bmp       164x314 wizard sidebar (glyph + brand)
//   assets/installer-header.bmp        150x57 wizard header (brand wordmark)

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ================= glyph SDF (24x24 lucide viewBox) ================= */

// Distance to line segment (with round caps).
function segDist(x, y, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 === 0 ? 0 : ((x - ax) * abx + (y - ay) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const dx = x - (ax + t * abx);
  const dy = y - (ay + t * aby);
  return Math.hypot(dx, dy);
}

// Coverage of the timer glyph at point (u,v) in 24-unit icon space.
function glyphCoverage(u, v) {
  const dTop = segDist(u, v, 10, 2, 14, 2);       // button on top
  const dHand = segDist(u, v, 12, 14, 15, 11);    // clock hand
  const dCircle = Math.abs(Math.hypot(u - 12, v - 14) - 8); // ring
  const d = Math.min(dTop, dHand, dCircle);
  return Math.max(0, Math.min(1, 0.5 + (1.0 - d))); // stroke half-width = 1, 1-unit AA
}

// Maps unit coords -> pixel coords for a canvas of given size (glyph fills 64%).
function glyphMap(size) {
  const s = Math.min((size * 0.64) / 18, (size * 0.64) / 20);
  const ox = (size - 18 * s) / 2 - 2 * s;
  const oy = (size - 20 * s) / 2 - 2 * s;
  return { s, ox, oy };
}

/* ================= rasterizer ================= */

function raster(size, opts = {}) {
  const { rounded = 0, supersample = 3 } = opts;
  const { s, ox, oy } = glyphMap(size);
  const px = Buffer.alloc(size * size * 4);
  const half = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cov = 0;
      const sub = supersample;
      for (let sy = 0; sy < sub; sy++) {
        for (let sx = 0; sx < sub; sx++) {
          const fx = x + (sx + 0.5) / sub;
          const fy = y + (sy + 0.5) / sub;
          cov += glyphCoverage((fx - ox) / s, (fy - oy) / s);
        }
      }
      cov /= sub * sub;

      let alpha = 1;
      if (rounded > 0) {
        const dx = Math.max(Math.abs(x + 0.5 - half) - (half - rounded), 0);
        const dy = Math.max(Math.abs(y + 0.5 - half) - (half - rounded), 0);
        const d = Math.hypot(dx, dy) - rounded;
        alpha = Math.max(0, Math.min(1, 0.5 - d));
      }

      const v = Math.round(255 * cov * alpha);
      const o = (y * size + x) * 4;
      px[o] = v; px[o + 1] = v; px[o + 2] = v; px[o + 3] = Math.round(255 * alpha);
    }
  }
  return px;
}

/* ================= PNG / ICO writers ================= */

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function rgbaToPng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function pngToIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + pngs.length * 16;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0; e[3] = 0;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

/* ================= BMP writer (24-bit) + 5x7 brand font ================= */

function makeBmp(width, height, draw) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const dataSize = rowSize * height;
  const buf = Buffer.alloc(54 + dataSize);
  buf.write('BM', 0, 'ascii');
  buf.writeUInt32LE(buf.length, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(dataSize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  const px = (x, y, v) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const off = 54 + (height - 1 - y) * rowSize + x * 3;
    buf[off] = v; buf[off + 1] = v; buf[off + 2] = v;
  };
  draw(px);
  return buf;
}

const FONT = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
};

const fillRect = (px, x, y, w, h, v) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px(xx, yy, v);
};
const strokeRect = (px, x, y, w, h, t, v) => {
  fillRect(px, x, y, w, t, v);
  fillRect(px, x, y + h - t, w, t, v);
  fillRect(px, x, y, t, h, v);
  fillRect(px, x + w - t, y, t, h, v);
};
const drawText = (px, text, x0, y0, scale, v) => {
  let x = x0;
  for (const ch of text) {
    const g = FONT[ch];
    if (g) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 5; c++) {
          if (g[r] & (0b10000 >> c)) fillRect(px, x + c * scale, y0 + r * scale, scale, scale, v);
        }
      }
    }
    x += 6 * scale;
  }
};

// Draw the timer glyph into a BMP via the same SDF, centered at (cx, cy).
function drawGlyphBmp(px, cx, cy, sizePx, v) {
  const { s, ox, oy } = glyphMap(sizePx);
  const x0 = Math.floor(cx - sizePx / 2);
  const y0 = Math.floor(cy - sizePx / 2);
  for (let y = 0; y < sizePx; y++) {
    for (let x = 0; x < sizePx; x++) {
      let cov = 0;
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          cov += glyphCoverage((x + (sx + 0.5) / 3 - ox) / s, (y + (sy + 0.5) / 3 - oy) / s);
        }
      }
      cov /= 9;
      const out = Math.round(v * Math.max(0, Math.min(1, cov)));
      if (out > 0) px(x0 + x, y0 + y, out);
    }
  }
}

/* ================= generate everything ================= */

const BLACK = 0;
const WHITE = 255;
const GRAY = 90;

// Icon: 512 preview PNG + 256/48/32/16 ICO (rounded corners for a modern look)
const preview = raster(512, { rounded: 90, supersample: 3 });
const png512 = rgbaToPng(512, preview);
const icoSizes = [256, 48, 32, 16].map((size) => ({
  size,
  data: rgbaToPng(size, raster(size, { rounded: Math.round(size * 0.176), supersample: 3 })),
}));
const ico = pngToIco(icoSizes);

// Wizard sidebar 164x314: frame + glyph + wordmark
const sidebar = makeBmp(164, 314, (px) => {
  fillRect(px, 0, 0, 164, 314, BLACK);
  strokeRect(px, 14, 14, 136, 286, 2, GRAY);
  strokeRect(px, 22, 22, 120, 270, 1, GRAY);
  drawGlyphBmp(px, 82, 126, 64, WHITE);
  drawText(px, 'SPARTACUS', 22, 190, 2, WHITE);
  fillRect(px, 22, 208, 120, 1, GRAY);
  drawText(px, 'FOCUS', 46, 226, 1, GRAY);
});

// Wizard header 150x57: wordmark
const header = makeBmp(150, 57, (px) => {
  fillRect(px, 0, 0, 150, 57, BLACK);
  drawText(px, 'SPARTACUS', 15, 21, 2, WHITE);
  fillRect(px, 15, 40, 120, 1, GRAY);
});

const outDir = path.join(__dirname, '..', 'assets');
fs.writeFileSync(path.join(outDir, 'icon.png'), png512);
fs.writeFileSync(path.join(outDir, 'icon.ico'), ico);
fs.writeFileSync(path.join(outDir, 'installer-sidebar.bmp'), sidebar);
fs.writeFileSync(path.join(outDir, 'installer-header.bmp'), header);

/* ================= ASCII preview (sanity check) ================= */

const cols = 44;
const rows = 22;
let art = '';
for (let r = 0; r < rows; r++) {
  let line = '';
  for (let c = 0; c < cols; c++) {
    const x = Math.floor((c + 0.5) * (512 / cols));
    const y = Math.floor((r + 0.5) * (512 / rows));
    const v = preview[(y * 512 + x) * 4] / 255;
    line += v > 0.7 ? '#' : v > 0.3 ? '+' : v > 0.05 ? '.' : ' ';
  }
  art += line + '\n';
}

console.log('assets/icon.png           512px preview  (' + png512.length + ' bytes)');
console.log('assets/icon.ico           ' + icoSizes.map((s) => s.size).join('/') + ' PNG entries (' + ico.length + ' bytes)');
console.log('assets/installer-sidebar.bmp  164x314  (' + sidebar.length + ' bytes)');
console.log('assets/installer-header.bmp   150x57   (' + header.length + ' bytes)');
console.log('\nASCII preview of icon (256, downsampled):\n' + art);
