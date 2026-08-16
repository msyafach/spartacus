'use strict';
// Captures feature screenshots for the README. Boots the real app with an
// isolated user-data dir (never touches real settings/queue) and drives it
// through each feature, capturing via webContents.capturePage().
// Run: npx electron tools/screenshot.js

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

process.env.SHOTS_DIR = path.join(__dirname, '..', 'screenshots');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'spartacus-shots-')));

require('../main.js');
