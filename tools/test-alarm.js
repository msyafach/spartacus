'use strict';
// Renders the focus-complete alarm to a WAV (offline, no audio output) so its
// waveform can be analyzed: no clipping, smooth envelope, correct pitches.
// Run: npx electron tools/test-alarm.js

const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const RENDERER = `<!DOCTYPE html><html><body><script>
const ctx = new OfflineAudioContext(2, 44100 * 8, 44100);
const BELL_PARTIALS = [
  { ratio: 1.0, gain: 1.0 },
  { ratio: 2.76, gain: 0.5 },
  { ratio: 5.4, gain: 0.22 },
  { ratio: 8.93, gain: 0.1 },
];
function scheduleBell(c, freq, t, amp, pan) {
  const g = c.createGain();
  const p = c.createStereoPanner();
  p.pan.value = pan;
  g.connect(p);
  p.connect(c.destination);
  const dur = 2.6;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(amp, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const part of BELL_PARTIALS) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * part.ratio;
    const og = c.createGain();
    og.gain.value = part.gain;
    o.connect(og);
    og.connect(g);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}
const melody = [523.25, 659.25, 783.99, 1046.5];
const pans = [-0.35, 0.3, -0.2, 0.35];
const amps = [0.26, 0.26, 0.26, 0.32];
[261.63, 392.0].forEach((f) => {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.value = f;
  const g = ctx.createGain();
  const t = 0.05;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.07, t + 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 6.5);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t);
  o.stop(t + 6.6);
});
let t = 0.05;
for (let rep = 0; rep < 3; rep++) {
  for (let i = 0; i < melody.length; i++) {
    scheduleBell(ctx, melody[i], t, amps[i], pans[i]);
    t += 0.24;
  }
  t += 0.75;
}
ctx.startRendering().then((buf) => {
  const { ipcRenderer } = require('electron');
  ipcRenderer.send('alarm-result', {
    L: Array.from(buf.getChannelData(0)),
    R: Array.from(buf.getChannelData(1)),
    sampleRate: buf.sampleRate,
  });
});
</script></body></html>`;

app.whenReady().then(() => {
  ipcMain.once('alarm-result', (e, { L, R, sampleRate }) => {
    const n = L.length;
    const dataSize = n * 2 * 2;
    const wav = Buffer.alloc(44 + dataSize);
    wav.write('RIFF', 0, 'ascii');
    wav.writeUInt32LE(36 + dataSize, 4);
    wav.write('WAVE', 8, 'ascii');
    wav.write('fmt ', 12, 'ascii');
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(2, 22);
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(sampleRate * 4, 28);
    wav.writeUInt16LE(4, 32);
    wav.writeUInt16LE(16, 34);
    wav.write('data', 36, 'ascii');
    wav.writeUInt32LE(dataSize, 40);
    let off = 44;
    for (let i = 0; i < n; i++) {
      wav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), off);
      wav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), off + 2);
      off += 4;
    }
    const out = path.join(process.env.TEMP || '/tmp', 'alarm-test.wav');
    fs.writeFileSync(out, wav);
    console.log('[alarm-test] rendered', out, '| samples:', n, '| bytes:', wav.length);
    app.quit();
  });

  const win = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(RENDERER));
  setTimeout(() => { console.error('[alarm-test] timeout'); app.exit(1); }, 20000);
});
