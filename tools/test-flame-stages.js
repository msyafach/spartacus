'use strict';

const { app } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const output = path.join(__dirname, '..', 'dist', 'flame-stage-test');
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'spartacus-flame-test-')));

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run(window) {
  const wc = window.webContents;
  try {
    for (const [expected, seconds] of [['full', 1500], ['half', 750], ['ember', 120]]) {
      await wc.executeJavaScript(`localStorage.setItem('spartacus.timer', JSON.stringify({mode:'focus',activeMode:null,running:false,endAt:0,remainingByMode:{focus:${seconds},short:300,long:900}}))`);
      const loaded = new Promise((resolve) => wc.once('did-finish-load', resolve));
      wc.reload();
      await loaded;
      await delay(900);

      for (const view of ['full-window', 'mini-window']) {
        if (view === 'mini-window') {
          await wc.executeJavaScript('enterMini()');
          await delay(500);
        }
        const state = await wc.executeJavaScript(`(() => ({
          fullStage: document.getElementById('timerFire').dataset.stage,
          miniStage: document.getElementById('miniTimerFire').dataset.stage,
          fullLoaded: document.getElementById('timerFire').naturalWidth === 724,
          miniLoaded: document.getElementById('miniTimerFire').naturalWidth === 724,
          time: document.getElementById('timeDisplay').textContent,
          miniTime: document.getElementById('miniTime').textContent,
          miniMode: document.body.classList.contains('mini-mode')
        }))()`);
        if (state.fullStage !== expected || state.miniStage !== expected || !state.fullLoaded || !state.miniLoaded) {
          throw new Error(`${expected} ${view}: ${JSON.stringify(state)}`);
        }
        if (state.miniMode !== (view === 'mini-window') || state.time !== state.miniTime) {
          throw new Error(`${expected} ${view}: inconsistent time or mode ${JSON.stringify(state)}`);
        }
        const image = await wc.capturePage();
        fs.writeFileSync(path.join(output, `${expected}-${view}.png`), image.toPNG());
        console.log('[flame-test]', expected, view, state.time, 'OK');
        if (view === 'mini-window') {
          await wc.executeJavaScript('exitMini()');
          await delay(300);
        }
      }
    }
  } catch (error) {
    console.error('[flame-test] FAILED', error);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
}

app.on('browser-window-created', (_, window) => {
  window.webContents.once('did-finish-load', () => { void run(window); });
});
require('../main.js');
