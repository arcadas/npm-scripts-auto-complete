#!/usr/bin/env node
'use strict';

// Runs automatically on `npm install -g`.
// Installs shell completion files to the appropriate system directories
// with zero manual steps where possible.

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

// ── helpers ──────────────────────────────────────────────────────────────────

function brewPrefix() {
  try {
    return execSync('brew --prefix', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch { return null; }
}

function tryCopy(src, destDir, destName) {
  if (!fs.existsSync(destDir)) return false;
  try {
    fs.copyFileSync(src, path.join(destDir, destName));
    return true;
  } catch { return false; }
}

function tryWrite(destDir, destName, content) {
  try {
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(path.join(destDir, destName), content);
    return true;
  } catch { return false; }
}

function appendWithMarkers(filePath, content) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (existing.includes(MARKER_START)) return false; // already present
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `\n${MARKER_START}\n${content}\n${MARKER_END}\n`);
  return true;
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

// ── macOS ─────────────────────────────────────────────────────────────────────

function installMac() {
  const brew = brewPrefix();
  const results = [];

  const zshDirs = [
    brew && path.join(brew, 'share/zsh/site-functions'),
    '/opt/homebrew/share/zsh/site-functions',
    '/usr/local/share/zsh/site-functions',
  ].filter(Boolean);

  const bashDirs = [
    brew && path.join(brew, 'etc/bash_completion.d'),
    '/opt/homebrew/etc/bash_completion.d',
    '/usr/local/etc/bash_completion.d',
  ].filter(Boolean);

  for (const dir of zshDirs) {
    if (tryCopy(COMPLETIONS.zsh, dir, '_npm')) {
      results.push(`  zsh:  ${dir}/_npm`);
      break;
    }
  }
  let bashInstalled = null;
  for (const dir of bashDirs) {
    if (tryCopy(COMPLETIONS.bash, dir, 'npm-scripts-auto-complete')) {
      bashInstalled = path.join(dir, 'npm-scripts-auto-complete');
      break;
    }
  }

  // Always add a direct source line to ~/.bash_profile so bash completion works
  // regardless of whether Homebrew's bash-completion package is configured.
  const bashRc = rcFile('bash');
  const sourceLine = `source "${bashInstalled || COMPLETIONS.bash}"`;
  if (appendWithMarkers(bashRc, sourceLine)) {
    results.push(`  bash: source line added to ${bashRc}`);
  } else {
    results.push(`  bash: already in ${bashRc}`);
  }

  return results;
}

// ── Linux ─────────────────────────────────────────────────────────────────────

function installLinux() {
  const brew = brewPrefix();
  const results = [];
  const home = os.homedir();

  // zsh — try Homebrew or system paths first; fall back to sourcing in ~/.zshrc
  const zshDirs = [
    brew && path.join(brew, 'share/zsh/site-functions'),
    '/home/linuxbrew/.linuxbrew/share/zsh/site-functions',
    path.join(home, '.linuxbrew/share/zsh/site-functions'),
    '/usr/local/share/zsh/site-functions',
    '/usr/share/zsh/vendor-completions',
  ].filter(Boolean);

  let zshDone = false;
  for (const dir of zshDirs) {
    if (tryCopy(COMPLETIONS.zsh, dir, '_npm')) {
      results.push(`  zsh:  ${dir}/_npm`);
      zshDone = true;
      break;
    }
  }
  if (!zshDone) {
    // Fallback: place file in ~/.zsh/completions/ and source it from ~/.zshrc
    const compDir = path.join(home, '.zsh', 'completions');
    const destFile = path.join(compDir, '_npm');
    if (tryWrite(compDir, '_npm', fs.readFileSync(COMPLETIONS.zsh, 'utf8'))) {
      const sourceLine = `source "${destFile}"`;
      const rc = rcFile('zsh');
      if (appendWithMarkers(rc, sourceLine)) {
        results.push(`  zsh:  ${destFile} (source line added to ${rc})`);
      } else {
        results.push(`  zsh:  ${destFile} (already in ${rc})`);
      }
      zshDone = true;
    }
  }

  // bash — ~/.local/share/bash-completion/completions/ is auto-loaded by
  // bash-completion v2.2+ (Ubuntu 16.04+), no ~/.bashrc change needed.
  const bashDirs = [
    brew && path.join(brew, 'etc/bash_completion.d'),
    '/home/linuxbrew/.linuxbrew/etc/bash_completion.d',
    path.join(home, '.linuxbrew/etc/bash_completion.d'),
    path.join(home, '.local/share/bash-completion/completions'),
    '/etc/bash_completion.d',
  ].filter(Boolean);

  let bashDone = false;
  // Prefer the user-level path (no sudo needed)
  const userBashDir = path.join(home, '.local/share/bash-completion/completions');
  if (tryWrite(userBashDir, 'npm-scripts-auto-complete', fs.readFileSync(COMPLETIONS.bash, 'utf8'))) {
    results.push(`  bash: ${userBashDir}/npm-scripts-auto-complete`);
    bashDone = true;
  }
  if (!bashDone) {
    for (const dir of bashDirs) {
      if (tryCopy(COMPLETIONS.bash, dir, 'npm-scripts-auto-complete')) {
        results.push(`  bash: ${dir}/npm-scripts-auto-complete`);
        bashDone = true;
        break;
      }
    }
  }

  return results;
}

// ── Windows ───────────────────────────────────────────────────────────────────

function installWindows() {
  const results = [];
  const ps1Path = COMPLETIONS.ps1;

  // Try PowerShell 7 (pwsh) first, then fall back to PowerShell 5 (powershell)
  const psExecutables = ['pwsh', 'powershell'];

  for (const psExe of psExecutables) {
    let profilePath;
    try {
      profilePath = execSync(
        `${psExe} -NoProfile -NonInteractive -Command "$PROFILE"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
    } catch { continue; }

    if (!profilePath) continue;

    // Use forward slashes inside PS string to avoid escaping issues
    const sourceLine = `. "${ps1Path.replace(/\\/g, '/')}"`;

    try {
      if (appendWithMarkers(profilePath, sourceLine)) {
        results.push(`  ${psExe}: ${profilePath}`);
      } else {
        results.push(`  ${psExe}: already in ${profilePath}`);
      }
    } catch { continue; }

    break; // only install into one PowerShell profile
  }

  return results;
}

// ── main ──────────────────────────────────────────────────────────────────────

let installed = [];

try {
  if (process.platform === 'darwin') {
    installed = installMac();
  } else if (process.platform === 'linux') {
    installed = installLinux();
  } else if (process.platform === 'win32') {
    installed = installWindows();
  }
} catch (err) {
  // Never fail the npm install due to a completion setup error
  console.log(`\nnpm-scripts-auto-complete: postinstall warning: ${err.message}`);
  console.log('  Run `nac setup` to complete installation manually.\n');
  process.exit(0);
}

if (installed.length > 0) {
  console.log('\nnpm-scripts-auto-complete installed:');
  installed.forEach(line => console.log(line));
  console.log('\nRestart your terminal, then try: npm run <TAB>\n');
} else {
  console.log('\nnpm-scripts-auto-complete:');
  console.log('  Auto-install skipped (no suitable completion directory found).');
  console.log('  Run `nac setup` to complete installation manually.\n');
}
