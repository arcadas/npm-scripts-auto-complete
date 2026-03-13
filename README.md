# npm-scripts-auto-complete

Zero-config shell tab-completion for `npm run` and `yarn` scripts, based on your project's `package.json`.

```
$ npm run <TAB>
build    -- tsc --outDir dist
dev      -- nodemon src/index.ts
lint     -- eslint src
test     -- jest --coverage
start    -- node dist/index.js

$ yarn <TAB>
build    -- tsc --outDir dist      add      -- Add a dependency
dev      -- nodemon src/index.ts   install  -- Install all dependencies
lint     -- eslint src             run      -- Run a package script
```

Works in any terminal: VSCode integrated terminal, iTerm2, macOS Terminal, Windows Terminal, etc.

## Install

```bash
npm install -g npm-scripts-auto-complete
```

**Restart your terminal** (or open a new tab), then try `npm run <TAB>` in any npm project.

No per-project setup. No `~/.zshrc` edits on macOS. Just install once and it works everywhere.

## Platform support

| Platform | Shell | Method |
|----------|-------|--------|
| macOS | zsh | Copied to `$(brew --prefix)/share/zsh/site-functions/_npm` — auto-discovered by zsh via `$fpath` |
| macOS | bash | Copied to `$(brew --prefix)/etc/bash_completion.d/` — auto-sourced by bash-completion |
| Linux | bash | Written to `~/.local/share/bash-completion/completions/` — auto-loaded by bash-completion v2.2+ (Ubuntu 16.04+) |
| Linux | zsh | Copied to a system `site-functions/` dir if writable; otherwise source line added to `~/.zshrc` |
| Windows | PowerShell 5/7 | `Register-ArgumentCompleter` block dot-sourced from your `$PROFILE` |

### macOS

Requires [Homebrew](https://brew.sh). The postinstall script auto-detects your Homebrew prefix and copies the completion files. No `~/.zshrc` changes needed.

### Linux (Ubuntu and others)

For **bash**: the completion file is written to `~/.local/share/bash-completion/completions/`. This directory is auto-loaded by `bash-completion` v2.2+, which ships with Ubuntu 16.04 and later. No `~/.bashrc` changes needed.

For **zsh**: writable system paths are tried first (e.g. `/usr/local/share/zsh/site-functions/`). If none is writable without sudo, a file is written to `~/.zsh/completions/_npm` and a single `source` line is appended to `~/.zshrc`.

Homebrew on Linux is also supported — if detected, it takes priority over the fallback paths.

### Windows (PowerShell)

The postinstall script detects your PowerShell profile path (`$PROFILE`) and appends a dot-source line that loads the completion script. Both **PowerShell 5** (Windows PowerShell) and **PowerShell 7** (`pwsh`) are supported.

After install, reload your profile or restart your terminal:
```powershell
. $PROFILE
```

Then try:
```powershell
npm run <TAB>
```

> **Note:** `cmd.exe` is not supported — use PowerShell or [Windows Terminal](https://aka.ms/terminal).

## Usage

After install, press `<TAB>` after `npm run` or after `yarn`:

```bash
# npm
npm run <TAB>      # list all scripts
npm run b<TAB>     # filter by prefix

# yarn — scripts run directly, no `run` needed
yarn <TAB>         # list scripts + yarn commands
yarn b<TAB>        # filter by prefix
yarn run <TAB>     # also works with explicit `run`
```

The completion reads `package.json` live on every `<TAB>` — it always reflects your current project. It searches upward from your working directory, so it works in subdirectories too.

On zsh, each script name is shown with its command as a description.

## Utility commands

You normally never need these, but they're available:

```bash
nac status      # show where completions are installed
nac uninstall   # remove all installed completions
nac setup       # manual install (fallback if postinstall failed)
```

## Uninstall

```bash
nac uninstall
npm uninstall -g npm-scripts-auto-complete
```

## Troubleshooting

**Completions not showing after install?**
Open a new terminal tab — the completion file is only loaded at shell startup.

**`nac status` shows "not installed"?**
Run `nac setup`. It tries the same directories and falls back to adding a `source` line to your shell config.

**Conflicts with existing npm completions? (zsh)**
This package installs a file named `_npm` in zsh's site-functions. If you previously ran `npm completion >> ~/.zshrc`, remove that block from `~/.zshrc` — the two will conflict.

**PowerShell: completions not working?**
Make sure your execution policy allows running scripts:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## License

MIT © [Peter Perger](https://github.com/arcadas)
