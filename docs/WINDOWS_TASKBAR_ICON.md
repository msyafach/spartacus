# Windows taskbar icon regression checks

## Fix (1.0.5)

The ICO asset, executable icon, and native window icons were valid in the
installed 1.0.4 build. A valid window icon alone does not guarantee Explorer's
grouped/pinned taskbar icon is correct.

- `main.js` passes the real, unpacked ICO path to BrowserWindow and sets the
  packaged window's AppUserModelID, relaunch icon, quoted executable command,
  and display name before it becomes visible.
- `build/installer.nsh` refreshes existing Start Menu/Desktop shortcuts even
  when electron-builder preserves shortcuts during a reinstall/upgrade. It
  assigns an explicit ICO path and the same AppUserModelID, then notifies
  Explorer. It does not delete global caches or restore user-deleted shortcuts.

## Automated checks

```sh
npm run test:windows-icon
npm run dist -- --publish never
npm run test:windows-icon -- dist/win-unpacked
```

Checks cover the actual main-process configuration, alternate install paths
including spaces, matching app IDs, development/non-Windows guards, ICO sizes,
and the built archive/unpacked icon. They do not verify Explorer's visible UI.

## Manual acceptance (Windows)

Use a test account or VM to avoid changing an active installation/profile.

1. Install 1.0.5; launch from both the Desktop and Start Menu shortcuts.
2. Check the helmet icon in the running taskbar button and Alt+Tab.
3. Pin it, close the app, then launch from the pinned button. Check the icon
   remains correct and there is no second taskbar group.
4. Reinstall over the same directory; repeat steps 1–3.
5. Uninstall and reinstall into a directory with spaces; repeat steps 1–3.
6. Verify settings/goals survive reinstall and deleted shortcuts are not
   unexpectedly restored during an upgrade.

Old taskbar pins can retain their own stale shortcut data. If a pre-existing
pin remains generic, unpin it once, launch the newly installed app from Start,
and pin the running app again. No Explorer restart or global cache purge is
required by this fix. Manual reinstall/pinning checks are still required;
they were not run against the user's active installation.
