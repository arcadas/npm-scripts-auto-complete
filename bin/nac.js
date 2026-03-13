#!/usr/bin/env node
'use strict';

// nac — npm-scripts-auto-complete utility
//
// Normally you don't need this: `npm install -g` runs postinstall automatically.
// Use `nac setup` only if postinstall couldn't write to a completion directory.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PACKAGE_DIR = path.resolve(__dirname, '..');
const COMPLETIONS = {
  zsh:  path.join(PACKAGE_DIR, 'completions', 'npm-scripts.zsh'),
  bash: path.join(PACKAGE_DIR, 'completions', 'npm-scripts.bash'),
  ps1:  path.join(PACKAGE_DIR, 'completions', 'npm-scripts.ps1'),
};

const MARKER_START = '# >>> npm-scripts-auto-complete >>>';
const MARKER_END   = '# <<< npm-scripts-auto-complete <<<';
const IS_WIN = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';

// ── helpers ──────────────────────────────────────────────────────────────────

function brewPrefix() {
  try {
    return execSync('brew --prefix', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch { return null; }
}

function rcFile(shell) {
  const home = os.homedir();
  const candidates = shell === 'zsh'
    ? ['.zshrc', '.zprofile']
    : ['.bashrc', '.bash_profile', '.profile'];
  for (const f of candidates) {
    const p = path.join(home, f);
    if (fs.existsSync(p)) return p;
  }
  return path.join(home, candidates[0]);
}

function hasMarker(filePath) {
  if (!fs.existsSync(filePath)) return false;
  return fs.readFileSync(filePath, 'utf8').includes(MARKER_START);
}

function removeMarker(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(MARKER_START)) return false;
  const cleaned = content.replace(
    new RegExp(`\\n?${escRe(MARKER_START)}[\\s\\S]*?${escRe(MARKER_END)}\\n?`, 'g'),
    '\n'
  );
  fs.writeFileSync(filePath, cleaned);
  return true;
}

function appendWithMarkers(filePath, content) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (existing.includes(MARKER_START)) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `\n${MARKER_START}\n${content}\n${MARKER_END}\n`);
  return true;
}

function tryCopy(src, destDir, destName) {
  if (!fs.existsSync(destDir)) return false;
  try { fs.copyFileSync(src, path.join(destDir, destName)); return true; }
  catch { return false; }
}

function tryWrite(destDir, destName, content) {
  try {
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(path.join(destDir, destName), content);
    return true;
  } catch { return false; }
}

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPsProfile() {
  for (const exe of ['pwsh', 'powershell']) {
    try {
      const p = execSync(
        `${exe} -NoProfile -NonInteractive -Command "$PROFILE"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
      if (p) return { exe, path: p };
    } catch { }
  }
  return null;
}

// ── candidate paths ───────────────────────────────────────────────────────────

function getZshDirs() {
  const brew = brewPrefix();
  const home = os.homedir();
  return [
    brew && path.join(brew, 'share/zsh/site-functions'),
    IS_MAC  ? '/opt/homebrew/share/zsh/site-functions' : null,
    IS_MAC  ? '/usr/local/share/zsh/site-functions'    : null,
    !IS_MAC ? '/home/linuxbrew/.linuxbrew/share/zsh/site-functions' : null,
    !IS_MAC ? path.join(home, '.linuxbrew/share/zsh/site-functions') : null,
    !IS_MAC ? '/usr/local/share/zsh/site-functions'    : null,
    !IS_MAC ? '/usr/share/zsh/vendor-completions'      : null,
  ].filter(Boolean);
}

function getBashDirs() {
  const brew = brewPrefix();
  const home = os.homedir();
  return [
    brew && path.join(brew, 'etc/bash_completion.d'),
    IS_MAC  ? '/opt/homebrew/etc/bash_completion.d'    : null,
    IS_MAC  ? '/usr/local/etc/bash_completion.d'       : null,
    !IS_MAC ? '/home/linuxbrew/.linuxbrew/etc/bash_completion.d' : null,
    !IS_MAC ? path.join(home, '.linuxbrew/etc/bash_completion.d') : null,
    !IS_MAC ? path.join(home, '.local/share/bash-completion/completions') : null,
    !IS_MAC ? '/etc/bash_completion.d'                 : null,
  ].filter(Boolean);
}

// ── commands ──────────────────────────────────────────────────────────────────

function cmdStatus() {
  console.log('\nnpm-scripts-auto-complete status:\n');
  const home = os.homedir();

  if (IS_WIN) {
    const ps = getPsProfile();
    if (ps) {
      const installed = hasMarker(ps.path);
      console.log(`  PowerShell (${ps.exe}): ${installed ? `installed → ${ps.path}` : `not in ${ps.path}`}`);
    } else {
      console.log('  PowerShell: not found');
    }
  } else {
    // zsh — system dirs
    let zshFile = null;
    for (const dir of getZshDirs()) {
      const p = path.join(dir, '_npm');
      if (fs.existsSync(p)) { zshFile = p; break; }
    }
    // zsh — rc fallback
    const zshUserFile = path.join(home, '.zsh', 'completions', '_npm');
    const zshRc = rcFile('zsh');

    if (zshFile) {
      console.log(`  zsh:  installed → ${zshFile}`);
    } else if (fs.existsSync(zshUserFile) && hasMarker(zshRc)) {
      console.log(`  zsh:  installed → ${zshUserFile} (sourced from ${zshRc})`);
    } else if (hasMarker(zshRc)) {
      console.log(`  zsh:  source line in ${zshRc}`);
    } else {
      console.log('  zsh:  not installed');
    }

    // bash — system dirs
    let bashFile = null;
    for (const dir of getBashDirs()) {
      const p = path.join(dir, 'npm-scripts-auto-complete');
      if (fs.existsSync(p)) { bashFile = p; break; }
    }
    const bashRc = rcFile('bash');

    const bashRcHasMarker = hasMarker(bashRc);
    if (bashFile && bashRcHasMarker) {
      console.log(`  bash: installed → ${bashFile} (sourced from ${bashRc})`);
    } else if (bashFile && IS_MAC && !bashRcHasMarker) {
      console.log(`  bash: file present but NOT sourced — run: nac setup`);
    } else if (bashRcHasMarker) {
      console.log(`  bash: source line in ${bashRc}`);
    } else {
      console.log('  bash: not installed');
    }
  }
  console.log();
}

function cmdSetup() {
  console.log('\nnpm-scripts-auto-complete manual setup:\n');
  const home = os.homedir();
  let anyOk = false;

  if (IS_WIN) {
    const ps = getPsProfile();
    if (!ps) {
      console.log('  error: PowerShell not found (tried pwsh and powershell)');
      return;
    }
    const sourceLine = `. "${COMPLETIONS.ps1.replace(/\\/g, '/')}"`;
    if (appendWithMarkers(ps.path, sourceLine)) {
      console.log(`  PowerShell: added to ${ps.path}`);
    } else {
      console.log(`  PowerShell: already in ${ps.path}`);
    }
    anyOk = true;
  } else {
    // zsh
    let zshDone = false;
    for (const dir of getZshDirs()) {
      if (tryCopy(COMPLETIONS.zsh, dir, '_npm')) {
        console.log(`  zsh:  copied → ${dir}/_npm`);
        zshDone = true;
        break;
      }
    }
    if (!zshDone) {
      const compDir = path.join(home, '.zsh', 'completions');
      const destFile = path.join(compDir, '_npm');
      if (tryWrite(compDir, '_npm', fs.readFileSync(COMPLETIONS.zsh, 'utf8'))) {
        const rc = rcFile('zsh');
        if (appendWithMarkers(rc, `source "${destFile}"`)) {
          console.log(`  zsh:  ${destFile} + source line in ${rc}`);
        } else {
          console.log(`  zsh:  ${destFile} (already in ${rc})`);
        }
        zshDone = true;
      }
    }
    if (zshDone) anyOk = true;

    // bash — copy to completion dir, then always add a source line to the rc
    // file so it works regardless of whether bash-completion is configured.
    let bashInstalled = null;
    if (IS_MAC) {
      for (const dir of getBashDirs()) {
        if (tryCopy(COMPLETIONS.bash, dir, 'npm-scripts-auto-complete')) {
          bashInstalled = path.join(dir, 'npm-scripts-auto-complete');
          console.log(`  bash: copied → ${bashInstalled}`);
          break;
        }
      }
    } else {
      const userBashDir = path.join(home, '.local/share/bash-completion/completions');
      if (tryWrite(userBashDir, 'npm-scripts-auto-complete', fs.readFileSync(COMPLETIONS.bash, 'utf8'))) {
        bashInstalled = path.join(userBashDir, 'npm-scripts-auto-complete');
        console.log(`  bash: ${bashInstalled}`);
      } else {
        for (const dir of getBashDirs()) {
          if (tryCopy(COMPLETIONS.bash, dir, 'npm-scripts-auto-complete')) {
            bashInstalled = path.join(dir, 'npm-scripts-auto-complete');
            console.log(`  bash: copied → ${bashInstalled}`);
            break;
          }
        }
      }
    }

    const bashRc = rcFile('bash');
    const bashSource = `source "${bashInstalled || COMPLETIONS.bash}"`;
    if (appendWithMarkers(bashRc, bashSource)) {
      console.log(`  bash: source line added to ${bashRc}`);
    } else {
      console.log(`  bash: already in ${bashRc}`);
    }
    anyOk = true;
  }

  if (anyOk) {
    console.log('\nRestart your terminal, then try: npm run <TAB>\n');
  }
}

function cmdUninstall() {
  console.log('\nRemoving npm-scripts-auto-complete:\n');
  const home = os.homedir();
  let anyRemoved = false;

  if (IS_WIN) {
    const ps = getPsProfile();
    if (ps && removeMarker(ps.path)) {
      console.log(`  removed source block from ${ps.path}`);
      anyRemoved = true;
    }
  } else {
    // zsh — system dirs
    for (const dir of getZshDirs()) {
      const p = path.join(dir, '_npm');
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); console.log(`  removed: ${p}`); anyRemoved = true; } catch { }
      }
    }
    // zsh — user file + rc marker
    const zshUserFile = path.join(home, '.zsh', 'completions', '_npm');
    if (fs.existsSync(zshUserFile)) {
      try { fs.unlinkSync(zshUserFile); console.log(`  removed: ${zshUserFile}`); anyRemoved = true; } catch { }
    }
    if (removeMarker(rcFile('zsh'))) {
      console.log(`  removed source block from ${rcFile('zsh')}`);
      anyRemoved = true;
    }

    // bash — all known dirs
    for (const dir of getBashDirs()) {
      const p = path.join(dir, 'npm-scripts-auto-complete');
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); console.log(`  removed: ${p}`); anyRemoved = true; } catch { }
      }
    }
    if (removeMarker(rcFile('bash'))) {
      console.log(`  removed source block from ${rcFile('bash')}`);
      anyRemoved = true;
    }
  }

  if (!anyRemoved) {
    console.log('  nothing to remove');
  }
  console.log('\nDone. Restart your terminal.\n');
}

function printHelp() {
  console.log(`
nac — npm-scripts-auto-complete

  Normally you don't need this tool.
  Just run: npm install -g npm-scripts-auto-complete
  The postinstall script handles everything automatically.

Commands:
  nac status     Show where completions are installed
  nac setup      Manually install (fallback if postinstall failed)
  nac uninstall  Remove all installed completions
  nac help       Show this message
`);
}

// ── main ──────────────────────────────────────────────────────────────────────

switch (process.argv[2] || 'help') {
  case 'status':    cmdStatus();    break;
  case 'setup':     cmdSetup();     break;
  case 'uninstall': cmdUninstall(); break;
  case 'help': case '--help': case '-h': printHelp(); break;
  default:
    console.error(`Unknown command: ${process.argv[2]}`);
    printHelp();
    process.exit(1);
}
