'use strict';
// Identity generator: renders the project-owned helmet mark as the app icon
// and uses it consistently across the Windows installer artwork.
// Run: npx electron tools/make-icons.js
// Outputs:
//   assets/icon.png                    512px preview
//   assets/icon.ico                    256/128/64/48/32/16 (PNG-compressed entries)
//   assets/installer-sidebar.bmp       164x314 wizard sidebar
//   assets/installer-header.bmp        150x57 wizard header

const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const HELMET = fs.readFileSync(path.join(ROOT, 'assets', 'helmet.svg'), 'utf8');
const DATA_URL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(HELMET);

/* ---------- PNG / ICO writers ---------- */

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
  ihdr[8] = 8;
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

/* ---------- BMP writer ---------- */

function rgbaToBmp(width, height, rgba) {
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
  for (let y = 0; y < height; y++) {
    const src = (height - 1 - y) * width * 4; // bottom-up
    const dst = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const v = rgba[src + x * 4]; // use red channel (art is grayscale)
      buf[dst + x * 3] = v;
      buf[dst + x * 3 + 1] = v;
      buf[dst + x * 3 + 2] = v;
    }
  }
  return buf;
}

/* ---------- canvas rendering ---------- */

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  await win.loadURL('about:blank');

  const renderCanvas = async (js) => {
    const px = await win.webContents.executeJavaScript(`
      new Promise((resolve) => { (async () => {
        ${js}
      })().then((data) => resolve(Array.from(data)), (e) => resolve('ERR:' + e.message));
      })
    `);
    if (typeof px === 'string') throw new Error(px);
    return Buffer.from(px);
  };

  // Rounded black square + white helmet glyph.
  const renderIcon = (size) => renderCanvas(`
    const c = document.createElement('canvas');
    c.width = ${'${s}'}; c.height = ${'${s}'};
    const ctx = c.getContext('2d');
    const r = ${'${s}'} * 0.18;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(${'${s}'}, 0, ${'${s}'}, ${'${s}'}, r);
    ctx.arcTo(${'${s}'}, ${'${s}'}, 0, ${'${s}'}, r);
    ctx.arcTo(0, ${'${s}'}, 0, 0, r);
    ctx.arcTo(0, 0, ${'${s}'}, 0, r);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ${'${s}'}, ${'${s}'});
    const img = new Image();
    img.src = ${JSON.stringify(DATA_URL)};
    await img.decode();
    const pad = ${'${s}'} * 0.13;
    ctx.drawImage(img, pad, pad, ${'${s}'} - pad * 2, ${'${s}'} - pad * 2);
    return ctx.getImageData(0, 0, ${'${s}'}, ${'${s}'}).data;
  `.split('${s}').join(size));

  const renderSidebar = () => renderCanvas(`
    const c = document.createElement('canvas');
    c.width = 164; c.height = 314;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, 164, 314);
    ctx.strokeStyle = '#626262';
    ctx.lineWidth = 1;
    ctx.strokeRect(12.5, 12.5, 139, 289);
    ctx.strokeStyle = '#343434';
    ctx.strokeRect(18.5, 18.5, 127, 277);
    const light = ctx.createLinearGradient(0, 24, 164, 204);
    light.addColorStop(0, '#161616');
    light.addColorStop(1, '#080808');
    ctx.fillStyle = light;
    ctx.fillRect(20, 20, 124, 272);
    const img = new Image();
    img.src = ${JSON.stringify(DATA_URL)};
    await img.decode();
    ctx.drawImage(img, 34, 55, 96, 96);
    ctx.fillStyle = '#fff';
    ctx.font = '600 12px "Segoe UI", sans-serif';
    ctx.letterSpacing = '2.1px';
    ctx.textAlign = 'center';
    ctx.fillText('SPARTACUS', 82, 200, 132);
    ctx.strokeStyle = '#686868';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(35, 218.5);
    ctx.lineTo(129, 218.5);
    ctx.stroke();
    ctx.fillStyle = '#aaa';
    ctx.font = '500 10px "Segoe UI", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('FOCUS', 82, 242);
    return ctx.getImageData(0, 0, 164, 314).data;
  `);

  const renderHeader = () => renderCanvas(`
    const c = document.createElement('canvas');
    c.width = 150; c.height = 57;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, 150, 57);
    const img = new Image();
    img.src = ${JSON.stringify(DATA_URL)};
    await img.decode();
    ctx.drawImage(img, 12, 10, 36, 36);
    ctx.fillStyle = '#fff';
    ctx.font = '600 11px "Segoe UI", sans-serif';
    ctx.letterSpacing = '1.2px';
    ctx.textAlign = 'left';
    ctx.fillText('SPARTACUS', 52, 31, 90);
    ctx.strokeStyle = '#5a5a5a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(52, 38.5);
    ctx.lineTo(140, 38.5);
    ctx.stroke();
    return ctx.getImageData(0, 0, 150, 57).data;
  `);

  const preview = await renderIcon(512);
  const icoSizes = [256, 128, 64, 48, 32, 16];
  const icoPngs = [];
  for (const s of icoSizes) icoPngs.push({ size: s, data: rgbaToPng(s, await renderIcon(s)) });
  const ico = pngToIco(icoPngs);
  const sidebar = rgbaToBmp(164, 314, await renderSidebar());
  const header = rgbaToBmp(150, 57, await renderHeader());

  fs.writeFileSync(path.join(ROOT, 'assets', 'icon.png'), rgbaToPng(512, preview));
  fs.writeFileSync(path.join(ROOT, 'assets', 'icon.ico'), ico);
  fs.writeFileSync(path.join(ROOT, 'assets', 'installer-sidebar.bmp'), sidebar);
  fs.writeFileSync(path.join(ROOT, 'assets', 'installer-header.bmp'), header);

  // ASCII sanity preview from the 256px render
  const small = await renderIcon(48);
  let art = '\nIcon preview (48px):\n';
  for (let y = 0; y < 48; y += 2) {
    let line = '';
    for (let x = 0; x < 48; x++) {
      const i = (y * 48 + x) * 4;
      const v = (small[i] + small[i + 1] + small[i + 2]) / 3;
      line += v > 200 ? '#' : v > 90 ? '+' : v > 30 ? '.' : ' ';
    }
    art += line + '\n';
  }
  console.log('assets/icon.png              512px (' + rgbaToPng(512, preview).length + ' bytes)');
  console.log('assets/icon.ico              ' + icoSizes.join('/') + ' (' + ico.length + ' bytes)');
  console.log('assets/installer-sidebar.bmp 164x314 (' + sidebar.length + ' bytes)');
  console.log('assets/installer-header.bmp  150x57 (' + header.length + ' bytes)');
  console.log(art);

  app.quit();
});
