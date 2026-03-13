# npm-scripts-auto-complete

Zero-config shell tab-completion for `npm run`, based on your project's `package.json`.

```
$ npm run <TAB>
build    -- tsc --outDir dist
dev      -- nodemon src/index.ts
lint     -- eslint src
test     -- jest --coverage
start    -- node dist/index.js
```

Works in any terminal: VSCode integrated terminal, iTerm2, macOS Terminal, etc.

## Requirements

- macOS with [Homebrew](https://brew.sh)
- Node.js ≥ 14
- zsh (default macOS shell) or bash

## Install

```bash
npm install -g npm-scripts-auto-complete
```

That's it. The installer automatically copies completion scripts into Homebrew's shell completion directories — no changes to `~/.zshrc` or any other config file.

**Restart your terminal** (or open a new tab), then try `npm run <TAB>` in any npm project.

## How it works

On install, a `postinstall` script copies two files:

| Shell | Destination |
|-------|-------------|
| zsh   | `$(brew --prefix)/share/zsh/site-functions/_npm` |
| bash  | `$(brew --prefix)/etc/bash_completion.d/npm-scripts-auto-complete` |

These directories are already part of the shell's completion search path (via Homebrew). No manual sourcing is needed.

At completion time, the script walks up the directory tree from `$PWD` to find the nearest `package.json` and reads its `scripts` section live — so it always reflects your current project.

## Usage

After install, just use `npm run` as normal and press `<TAB>`:

```bash
# In any npm project directory (or subdirectory):
npm run <TAB>          # list all scripts
npm run b<TAB>         # filter by prefix
```

Zsh also shows the script command as a description next to each name.

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

**`nac status` shows "not found"?**
Your Homebrew site-functions directory might differ. Run `nac setup` to install manually; it will fall back to adding a `source` line to `~/.zshrc` / `~/.bashrc`.

**Conflicts with existing npm completions?**
This package installs a file named `_npm` in zsh's site-functions. If you previously ran `npm completion >> ~/.zshrc`, remove that block from `~/.zshrc` — the two will conflict.

## License

MIT © [Peter Perger](https://github.com/arcadas)
