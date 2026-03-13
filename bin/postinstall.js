#!/usr/bin/env node
'use strict';

// This script runs automatically after `npm install -g`.
// It copies completion files into system directories that zsh/bash
// already read on startup — no rc file changes needed.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PACKAGE_DIR = path.resolve(__dirname, '..');
const ZSH_SRC = path.join(PACKAGE_DIR, 'completions', 'npm-scripts.zsh');
const BASH_SRC = path.join(PACKAGE_DIR, 'completions', 'npm-scripts.bash');

function brewPrefix() {
  try {
    return execSync('brew --prefix', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function tryCopy(src, destDir, destName) {
  if (!fs.existsSync(destDir)) return false;
  try {
    fs.copyFileSync(src, path.join(destDir, destName));
    return true;
  } catch {
    return false; // not writable — skip silently
  }
}

function installZsh(brew) {
  const candidates = [
    brew && path.join(brew, 'share/zsh/site-functions'),
    '/opt/homebrew/share/zsh/site-functions',
    '/usr/local/share/zsh/site-functions',
  ].filter(Boolean);

  for (const dir of candidates) {
    if (tryCopy(ZSH_SRC, dir, '_npm')) {
      return dir;
    }
  }
  return null;
}

function installBash(brew) {
  const candidates = [
    brew && path.join(brew, 'etc/bash_completion.d'),
    '/opt/homebrew/etc/bash_completion.d',
    '/usr/local/etc/bash_completion.d',
    '/etc/bash_completion.d',
  ].filter(Boolean);

  for (const dir of candidates) {
    if (tryCopy(BASH_SRC, dir, 'npm-scripts-auto-complete')) {
      return dir;
    }
  }
  return null;
}

// --- main ---
const brew = brewPrefix();
const zshDir = installZsh(brew);
const bashDir = installBash(brew);

const succeeded = zshDir || bashDir;

if (succeeded) {
  console.log('\nnpm-scripts-auto-complete installed:');
  if (zshDir)  console.log(`  zsh:  ${zshDir}/_npm`);
  if (bashDir) console.log(`  bash: ${bashDir}/npm-scripts-auto-complete`);
  console.log('\nRestart your terminal, then try: npm run <TAB>\n');
} else {
  console.log('\nnpm-scripts-auto-complete:');
  console.log('  Auto-install skipped (no writable site-functions directory found).');
  console.log('  Run `nac setup` to complete installation manually.\n');
}
