#compdef npm
# npm-scripts-auto-complete
# This file is installed into zsh's site-functions directory as '_npm'.
# zsh auto-discovers it from $fpath — no sourcing or rc changes needed.

_nac_find_pkg() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    [[ -f "$dir/package.json" ]] && echo "$dir/package.json" && return
    dir="${dir:h}"
  done
}

_nac_run_scripts() {
  local pkg_json
  pkg_json=$(_nac_find_pkg)
  [[ -z "$pkg_json" ]] && return 1

  local -a scripts
  scripts=(${(f)"$(node -e "
const fs = require('fs');
try {
  const pkg = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  Object.entries(pkg.scripts || {}).forEach(([name, cmd]) => {
    const desc = cmd.substring(0, 70).replace(/:/g, '\\\\:');
    process.stdout.write(name + ':' + desc + '\n');
  });
} catch(e) {}
" "$pkg_json")"})

  (( ${#scripts[@]} )) && _describe 'npm scripts' scripts
}

_npm() {
  local -a subcmds
  subcmds=(
    'run:Run a package script'
    'install:Install packages'
    'uninstall:Remove packages'
    'update:Update packages'
    'test:Run tests'
    'start:Start the application'
    'publish:Publish package to npm'
    'init:Create a new package.json'
    'ci:Clean install from lockfile'
    'audit:Run a security audit'
    'outdated:Check for outdated packages'
    'version:Bump package version'
    'pack:Create a tarball'
    'link:Symlink a package globally'
    'exec:Run a command from a local package'
    'ls:List installed packages'
    'cache:Manage the npm cache'
  )

  case $CURRENT in
    2)
      _describe 'npm commands' subcmds
      ;;
    3)
      case ${words[2]} in
        # npm silently accepts these typos — cover them
        run|run-script|rum|urn)
          _nac_run_scripts
          ;;
        *)
          _default
          ;;
      esac
      ;;
    *)
      _default
      ;;
  esac
}

_npm "$@"
