'use strict';

// Exercise the real main-process window configuration without starting the UI,
// updater, downloads, or touching the user's installed app/profile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
const config = require('../package.json');
const source = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const mainRequire = createRequire(path.join(root, 'main.js'));

function windowConfig(isPackaged, platform, installDir) {
  const events = [];
  let options, details, processAppId;
  const electron = {
    app: {
      isPackaged,
      setName() {},
      getName: () => config.productName,
      setAppUserModelId: id => { processAppId = id; },
      requestSingleInstanceLock: () => true,
      on() {},
      commandLine: { appendSwitch() {} },
      getPath: () => root,
      whenReady: () => ({ then() {} }),
    },
    BrowserWindow: class {
      constructor(value) {
        options = value;
        this.webContents = { setWindowOpenHandler() {} };
      }
      setAppDetails(value) { details = value; events.push('details'); }
      on() {}
      once(name) { events.push(name); }
      loadFile() {}
    },
    ipcMain: { handle() {}, on() {} },
    protocol: { registerSchemesAsPrivileged() {} },
  };
  const context = vm.createContext({
    require: name => name === 'electron' ? electron
      : name === 'electron-updater' ? { autoUpdater: {} } : mainRequire(name),
    __dirname: root,
    process: {
      platform, env: {}, on() {},
      resourcesPath: path.join(installDir, 'resources'),
      execPath: path.join(installDir, 'Spartacus.exe'),
    },
    console,
  });
  vm.runInContext(source + '\ncreateWindow();', context, { filename: 'main.js' });
  assert.equal(processAppId, config.build.appId);
  assert.equal(typeof options.icon, 'string', 'Keep the native ICO path');
  assert.equal(options.show, false, 'Configure taskbar identity before showing');
  if (isPackaged && platform === 'win32') {
    assert.equal(details.appId, config.build.appId);
    assert.equal(details.appIconPath, options.icon);
    assert.equal(details.appIconIndex, 0);
    assert.equal(details.relaunchCommand, `"${path.join(installDir, 'Spartacus.exe')}"`);
    assert.equal(details.relaunchDisplayName, config.productName);
    assert.equal(options.icon, path.join(installDir, 'resources', 'app.asar.unpacked', 'assets', 'icon.ico'));
    assert.ok(events.indexOf('details') < events.indexOf('ready-to-show'));
  } else {
    assert.equal(details, undefined, 'Do not register Electron as the installed app');
  }
  if (!isPackaged) assert.equal(options.icon, path.join(root, 'assets', 'icon.ico'));
}

windowConfig(true, 'win32', path.join(root, 'Program Files', 'Spartacus'));
windowConfig(true, 'win32', path.join(root, 'Reinstalled elsewhere', 'Spartacus'));
windowConfig(false, 'win32', root);
windowConfig(false, 'linux', root);
windowConfig(true, 'linux', root);
assert.ok(config.build.asarUnpack.includes('assets/icon.ico'));
assert.ok(config.build.files.includes('assets/**/*'));
assert.equal(config.build.win.icon, 'assets/icon.ico');
assert.equal(config.version, require('../package-lock.json').version);
assert.ok(fs.existsSync(path.join(root, config.build.nsis.include)));
const ico = fs.readFileSync(path.join(root, config.build.win.icon));
assert.equal(ico.readUInt16LE(2), 1, 'Valid ICO type');
const sizes = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ico[6 + i * 16] || 256);
for (const size of [16, 32, 48, 256]) assert.ok(sizes.includes(size), `Missing ${size}px icon`);

// Optionally check the actual build, not just its source configuration.
if (process.argv[2]) {
  const dir = path.resolve(process.argv[2]);
  const asar = require('@electron/asar');
  const archive = path.join(dir, 'resources', 'app.asar');
  assert.deepEqual(fs.readFileSync(path.join(dir, 'resources', 'app.asar.unpacked', 'assets', 'icon.ico')), ico);
  assert.equal(asar.extractFile(archive, 'main.js').toString(), source);
  assert.equal(JSON.parse(asar.extractFile(archive, 'package.json')).version, config.version);
  assert.ok(fs.existsSync(path.join(dir, 'Spartacus.exe')));
}
console.log('PASS: window/taskbar identity, reinstall paths, development guard, ICO sizes, and packaging');
