'use strict';

const { app, BrowserWindow, ipcMain, protocol, session, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { Readable } = require('stream');
const { autoUpdater } = require('electron-updater');

app.setName('Spartacus');
app.setAppUserModelId('com.spartacus.focus');

// Single instance: launching the app again focuses the existing window
// instead of opening a second one.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Lightweight mode: disable Chromium services the app never uses, and cap the
// renderer V8 heap so it can never balloon.
if (process.env.SPARTACUS_LEAN !== '0') {
  app.commandLine.appendSwitch('disable-features', 'MediaRouter,SpellcheckService,OptimizationHints,Translate');
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
}

// Custom scheme used to serve extracted YouTube audio to the renderer.
protocol.registerSchemesAsPrivileged([
  { scheme: 'spartacus', privileges: { standard: true, stream: true } },
]);

const YTDLP = app.isPackaged
  ? path.join(process.resourcesPath, 'app.asar.unpacked', 'bin', 'yt-dlp.exe')
  : path.join(__dirname, 'bin', 'yt-dlp.exe');
const CACHE_DIR = path.join(app.getPath('userData'), 'audio-cache');
const CACHE_LIMIT = 400 * 1024 * 1024;

const AUDIO_EXT = {
  webm: 'audio/webm',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  opus: 'audio/ogg',
  ogg: 'audio/ogg',
  mp3: 'audio/mpeg',
  aac: 'audio/aac',
  flac: 'audio/flac',
};

// YouTube CDN endpoints vary per player client; some get throttled (403) while
// others work. Try clients in order until one succeeds.
const CLIENT_ATTEMPTS = [
  ['--extractor-args', 'youtube:player_client=android'],
  [],
  ['--extractor-args', 'youtube:player_client=web_embedded'],
];

let mainWindow = null;
const downloads = new Map(); // videoId -> { proc, promise }

function ensureCacheDir() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function runYtdlp(args, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    let proc;
    try {
      proc = spawn(YTDLP, args, { windowsHide: true });
    } catch (err) {
      reject(new Error('yt-dlp not available: ' + err.message));
      return;
    }
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { proc.kill(); } catch { /* ignore */ }
        reject(new Error('timed out — check your connection'));
      }
    }, timeoutMs);
    // Bound capture: metadata JSON is at most a few hundred KB; download logs only
    // ever need their tail for error messages.
    proc.stdout.on('data', (d) => { if (stdout.length < 4000000) stdout += d; });
    proc.stderr.on('data', (d) => { if (stderr.length < 65536) stderr += d; });
    proc.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error('yt-dlp not available: ' + err.message));
      }
    });
    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });
  });
}

function findCacheFile(id) {
  try {
    for (const f of fs.readdirSync(CACHE_DIR)) {
      if (f.startsWith(id + '.')) {
        const ext = path.extname(f).slice(1).toLowerCase();
        if (AUDIO_EXT[ext]) return { name: f, path: path.join(CACHE_DIR, f) };
      }
    }
  } catch { /* ignore */ }
  return null;
}

function cleanupCache() {
  try {
    const files = fs.readdirSync(CACHE_DIR).map((f) => {
      const p = path.join(CACHE_DIR, f);
      const st = fs.statSync(p);
      return { p, size: st.size, mtime: st.mtimeMs };
    });
    let total = files.reduce((s, f) => s + f.size, 0);
    if (total <= CACHE_LIMIT) return;
    files.sort((a, b) => a.mtime - b.mtime);
    for (const f of files) {
      if (total <= CACHE_LIMIT) break;
      try { fs.unlinkSync(f.p); total -= f.size; } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

/* ---------- YouTube audio extraction (via bundled yt-dlp) ---------- */

async function getVideoInfo(url) {
  try {
    const { stdout, code } = await runYtdlp([
      '-J', '--no-playlist', '--no-warnings', '--no-cache-dir', '--skip-download', url,
    ], 45000);
    if (code !== 0) throw new Error('yt-dlp failed');
    const j = JSON.parse(stdout);
    return {
      ok: true,
      data: {
        id: j.id,
        title: j.title || j.id,
        author: j.channel || j.uploader || '',
        duration: parseInt(j.duration, 10) || 0,
        url: j.webpage_url || url,
      },
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function attemptDownload(url, id, extraArgs, holder) {
  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP, [
      '-f', '251/140/bestaudio/best',  // prefer webm/opus, then m4a — audio only
      '--no-playlist',
      '--no-progress',
      '--no-warnings',
      '--no-cache-dir',
      ...extraArgs,
      '-o', path.join(CACHE_DIR, id + '.%(ext)s'),
      url,
    ], { windowsHide: true });
    holder.proc = proc;
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d; });
    proc.on('error', (err) => reject(new Error('yt-dlp not available: ' + err.message)));
    proc.on('close', (code) => {
      if (code === 0) {
        const f = findCacheFile(id);
        if (f) resolve(f.name);
        else reject(new Error('download finished but file not found'));
      } else {
        const tail = stderr.split('\n').filter(Boolean).slice(-2).join(' | ');
        reject(new Error((tail || 'download failed').slice(0, 200)));
      }
    });
  });
}

function removePartFiles(id) {
  try {
    for (const f of fs.readdirSync(CACHE_DIR)) {
      if (f.startsWith(id + '.') && f.endsWith('.part')) fs.unlinkSync(path.join(CACHE_DIR, f));
    }
  } catch { /* ignore */ }
}

async function prepareTrack(url, id) {
  const cached = findCacheFile(id);
  if (cached) return { ok: true, fileUrl: 'spartacus://audio/' + cached.name };

  const inProgress = downloads.get(id);
  if (inProgress) {
    try {
      const name = await inProgress.promise;
      return { ok: true, fileUrl: 'spartacus://audio/' + name };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // Only one extraction at a time — cancel any other active download.
  for (const [otherId, d] of downloads) {
    if (otherId !== id) {
      d.cancelled = true;
      try { d.proc && d.proc.kill(); } catch { /* ignore */ }
      downloads.delete(otherId);
    }
  }

  ensureCacheDir();
  const holder = { proc: null, cancelled: false, promise: null };
  holder.promise = (async () => {
    let lastError = new Error('download failed');
    for (const args of CLIENT_ATTEMPTS) {
      if (holder.cancelled) throw new Error('cancelled');
      try {
        return await attemptDownload(url, id, args, holder);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  })();
  downloads.set(id, holder);

  try {
    const name = await holder.promise;
    cleanupCache();
    return { ok: true, fileUrl: 'spartacus://audio/' + name };
  } catch (err) {
    removePartFiles(id);
    return { ok: false, error: err.message };
  } finally {
    downloads.delete(id);
  }
}

/* ---------- audio file serving with range support ---------- */

function parseRange(header, total) {
  if (!header || !total) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  let start;
  let end;
  if (m[1] === '') {
    const n = parseInt(m[2], 10);
    if (isNaN(n) || n <= 0) return { invalid: true };
    start = Math.max(0, total - n);
    end = total - 1;
  } else {
    start = parseInt(m[1], 10);
    end = m[2] === '' ? total - 1 : Math.min(parseInt(m[2], 10), total - 1);
  }
  if (isNaN(start) || isNaN(end) || start < 0 || start > end || start >= total) return { invalid: true };
  return { start, end };
}

async function handleAudioRequest(request) {
  let u;
  try {
    u = new URL(request.url);
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  const name = path.basename(u.pathname);
  if (!/^[A-Za-z0-9_-]{6,20}\.(webm|m4a|mp4|opus|ogg|mp3|aac|flac)$/.test(name)) {
    return new Response('Not found', { status: 404 });
  }
  const file = path.join(CACHE_DIR, name);
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const range = parseRange(request.headers.get('range'), stat.size);
  if (range && range.invalid) {
    return new Response('Bad range', { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
  }
  const start = range ? range.start : 0;
  const end = range ? range.end : stat.size - 1;
  const stream = fs.createReadStream(file, { start, end });
  const ext = path.extname(name).slice(1).toLowerCase();
  const headers = {
    'Content-Type': AUDIO_EXT[ext] || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
    'Content-Length': String(end - start + 1),
  };
  if (range) headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
  return new Response(Readable.toWeb(stream), { status: range ? 206 : 200, headers });
}

/* ---------- window ---------- */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 660,
    frame: false,
    show: false,
    backgroundColor: '#000000',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: true,
    },
  });

  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.on('focus', () => { mainWindow.flashFrame(false); });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('maximize', () => mainWindow.webContents.send('win:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('win:maximized', false));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.SMOKE_TEST) {
    const logMemory = (tag) => {
      const metrics = app.getAppMetrics();
      const total = metrics.reduce((s, m) => s + (m.memory ? m.memory.workingSetSize : 0), 0);
      console.log(`[smoke] memory ${tag} \u2014 total ${(total / 1024).toFixed(1)} MB: ` +
        metrics.map((m) => `${m.type}:${Math.round((m.memory.workingSetSize || 0) / 1024)}MB`).join(' '));
    };
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('[smoke] page loaded');
      setTimeout(() => logMemory('after-load'), 3000);
    });
    setTimeout(() => logMemory('before-quit'), 15000);
    mainWindow.webContents.on('did-fail-load', (_e, code, desc) => console.log('[smoke] FAILED TO LOAD', code, desc));
    mainWindow.webContents.on('console-message', (...args) => {
      const e = args[0];
      const msg = typeof e === 'object' && e && 'message' in e ? e.message : args.slice(1).join(' ');
      console.log('[renderer]', msg);
    });
    if (process.env.SMOKE_TEST_YT) {
      setTimeout(async () => {
        try {
          const info = await getVideoInfo(process.env.SMOKE_TEST_YT);
          if (info.ok) {
            console.log('[smoke] yt:info OK —', info.data.title.slice(0, 50), '| id', info.data.id, '| dur', info.data.duration);
            const prep = await prepareTrack(info.data.url, info.data.id);
            console.log('[smoke] yt:prepare —', prep.ok ? 'OK ' + prep.fileUrl : 'FAIL ' + prep.error);
            if (prep.ok) {
              const f = findCacheFile(info.data.id);
              console.log('[smoke] cache file —', f ? f.name + ' ' + fs.statSync(f.path).size + ' bytes' : 'MISSING');
            }
          } else {
            console.log('[smoke] yt:info FAIL —', info.error);
          }
        } catch (e) {
          console.log('[smoke] yt smoke error:', e.message);
        }
      }, 2000);
    }
    setTimeout(() => app.quit(), 30000);
  }

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

/* ---------- IPC ---------- */

ipcMain.handle('yt:info', (_e, url) => getVideoInfo(url));
ipcMain.handle('yt:prepare', (_e, { url, id }) => prepareTrack(url, id));
ipcMain.handle('yt:uncache', (_e, id) => {
  const f = findCacheFile(id);
  if (f && !downloads.has(id)) {
    try { fs.unlinkSync(f.path); } catch { /* ignore */ }
  }
  return true;
});

ipcMain.on('win:minimize', () => mainWindow && mainWindow.minimize());
ipcMain.on('win:toggle-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('win:close', () => mainWindow && mainWindow.close());
ipcMain.handle('win:isMaximized', () => mainWindow && mainWindow.isMaximized());

ipcMain.on('win:flash', (_e, on) => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.flashFrame(!!on);
});
ipcMain.on('notify', (_e, { title, body }) => {
  new Notification({ title: title || 'Spartacus', body: body || '' }).show();
});
ipcMain.handle('app:version', () => app.getVersion());

/* ---------- updates (electron-updater, packaged builds only) ---------- */

let updateReady = false;

function sendUpdateStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update:status', status);
}

function setupUpdater() {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', () => sendUpdateStatus({ state: 'downloading' }));
  autoUpdater.on('update-not-available', () => sendUpdateStatus({ state: 'none' }));
  autoUpdater.on('update-downloaded', (info) => {
    updateReady = true;
    sendUpdateStatus({ state: 'ready', version: info && info.version });
    new Notification({
      title: 'Spartacus update ready',
      body: 'Restart the app to install it.',
    }).show();
  });
  autoUpdater.on('error', (err) => sendUpdateStatus({ state: 'error', message: err && err.message }));
  // Quiet background check shortly after launch; failures are non-fatal.
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 6000);
}

ipcMain.on('updates:check', () => {
  if (!app.isPackaged) return;
  sendUpdateStatus({ state: 'checking' });
  autoUpdater.checkForUpdates().catch((e) => sendUpdateStatus({ state: 'error', message: e.message }));
});
ipcMain.on('updates:install', () => {
  if (updateReady) autoUpdater.quitAndInstall();
});
ipcMain.handle('updates:supported', () => app.isPackaged);

/* ---------- lifecycle ---------- */

app.whenReady().then(() => {
  ensureCacheDir();
  cleanupCache();
  session.defaultSession.setSpellCheckerEnabled(false);
  protocol.handle('spartacus', handleAudioRequest);
  setupUpdater();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  for (const d of downloads.values()) {
    try { d.proc.kill(); } catch { /* ignore */ }
  }
});

process.on('uncaughtException', (err) => console.error('[spartacus] uncaught:', err));
