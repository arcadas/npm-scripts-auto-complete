#!/usr/bin/env node
'use strict';

// nac — utility CLI for npm-scripts-auto-complete
//
// Normally you don't need this: `npm install -g` runs postinstall automatically.
// Use `nac setup` only if postinstall couldn't find a writable directory.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PACKAGE_DIR = path.resolve(__dirname, '..');
const ZSH_SRC  = path.join(PACKAGE_DIR, 'completions', 'npm-scripts.zsh');
const BASH_SRC = path.join(PACKAGE_DIR, 'completions', 'npm-scripts.bash');
const MARKER_START = '# >>> npm-scripts-auto-complete >>>';
const MARKER_END   = '# <<< npm-scripts-auto-complete <<<';

function brewPrefix() {
  try {
    return execSync('brew --prefix', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch { return null; }
}

const brew = brewPrefix();

const ZSH_DIRS = [
  brew && path.join(brew, 'share/zsh/site-functions'),
  '/opt/homebrew/share/zsh/site-functions',
  '/usr/local/share/zsh/site-functions',
].filter(Boolean);

const BASH_DIRS = [
  brew && path.join(brew, 'etc/bash_completion.d'),
  '/opt/homebrew/etc/bash_completion.d',
  '/usr/local/etc/bash_completion.d',
  '/etc/bash_completion.d',
].filter(Boolean);

// --- helpers ---

function findInstalledFile(dirs, name) {
  for (const dir of dirs) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function findWritableDir(dirs) {
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    try { fs.accessSync(dir, fs.constants.W_OK); return dir; } catch {}
  }
  return null;
}

function sourceBlock(file) {
  return `\n${MARKER_START}\nsource "${file}"\n${MARKER_END}\n`;
}

function getShellConfig(shell) {
  const home = os.homedir();
  const files = shell === 'zsh'
    ? ['.zshrc', '.zprofile']
    : ['.bashrc', '.bash_profile', '.profile'];
  for (const f of files) {
    const p = path.join(home, f);
    if (fs.existsSync(p)) return p;
  }
  return path.join(home, files[0]);
}

// --- commands ---

function cmdStatus() {
  const zshFile  = findInstalledFile(ZSH_DIRS, '_npm');
  const bashFile = findInstalledFile(BASH_DIRS, 'npm-scripts-auto-complete');

  console.log('\nnpm-scripts-auto-complete status:\n');
  console.log(`  zsh  completion: ${zshFile  ? `installed → ${zshFile}`  : 'not found in site-functions'}`);
  console.log(`  bash completion: ${bashFile ? `installed → ${bashFile}` : 'not found in bash_completion.d'}`);

  // Check fallback rc-file installs
  for (const shell of ['zsh', 'bash']) {
    const cfg = getShellConfig(shell);
    if (fs.existsSync(cfg)) {
      const content = fs.readFileSync(cfg, 'utf8');
      if (content.includes(MARKER_START)) {
        console.log(`  ${shell} fallback:    source line present in ${cfg}`);
      }
    }
  }
  console.log();
}

function cmdSetup() {
  console.log('\nnpm-scripts-auto-complete manual setup:\n');
  let anyOk = false;

  // Try system dirs first
  const zshDir  = findWritableDir(ZSH_DIRS);
  const bashDir = findWritableDir(BASH_DIRS);

  if (zshDir) {
    fs.copyFileSync(ZSH_SRC, path.join(zshDir, '_npm'));
    console.log(`  zsh:  copied → ${zshDir}/_npm`);
    anyOk = true;
  }
  if (bashDir) {
    fs.copyFileSync(BASH_SRC, path.join(bashDir, 'npm-scripts-auto-complete'));
    console.log(`  bash: copied → ${bashDir}/npm-scripts-auto-complete`);
    anyOk = true;
  }

  // Fallback: add source line to rc files
  if (!zshDir) {
    const cfg = getShellConfig('zsh');
    const content = fs.existsSync(cfg) ? fs.readFileSync(cfg, 'utf8') : '';
    if (!content.includes(MARKER_START)) {
      fs.appendFileSync(cfg, sourceBlock(ZSH_SRC));
      console.log(`  zsh:  added source line to ${cfg}`);
      anyOk = true;
    } else {
      console.log(`  zsh:  already in ${cfg}`);
      anyOk = true;
    }
  }
  if (!bashDir) {
    const cfg = getShellConfig('bash');
    const content = fs.existsSync(cfg) ? fs.readFileSync(cfg, 'utf8') : '';
    if (!content.includes(MARKER_START)) {
      fs.appendFileSync(cfg, sourceBlock(BASH_SRC));
      console.log(`  bash: added source line to ${cfg}`);
      anyOk = true;
    } else {
      console.log(`  bash: already in ${cfg}`);
      anyOk = true;
    }
  }

  if (anyOk) {
    console.log('\nRestart your terminal, then try: npm run <TAB>\n');
  }
}

function cmdUninstall() {
  console.log('\nRemoving npm-scripts-auto-complete:\n');

  // Remove from system dirs
  const zshFile  = findInstalledFile(ZSH_DIRS, '_npm');
  const bashFile = findInstalledFile(BASH_DIRS, 'npm-scripts-auto-complete');

  if (zshFile)  { fs.unlinkSync(zshFile);  console.log(`  removed: ${zshFile}`); }
  if (bashFile) { fs.unlinkSync(bashFile); console.log(`  removed: ${bashFile}`); }

  // Remove fallback rc source lines
  for (const shell of ['zsh', 'bash']) {
    const cfg = getShellConfig(shell);
    if (!fs.existsSync(cfg)) continue;
    const content = fs.readFileSync(cfg, 'utf8');
    if (!content.includes(MARKER_START)) continue;
    const cleaned = content.replace(
      new RegExp(`\\n?${escRe(MARKER_START)}[\\s\\S]*?${escRe(MARKER_END)}\\n?`, 'g'),
      '\n'
    );
    fs.writeFileSync(cfg, cleaned);
    console.log(`  removed source line from ${cfg}`);
  }

  if (!zshFile && !bashFile) {
    console.log('  nothing to remove');
  }
  console.log('\nDone. Restart your terminal.\n');
}

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

// --- main ---
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
