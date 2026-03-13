#compdef npm yarn
# npm-scripts-auto-complete
# This file is installed into zsh's site-functions directory as '_npm'.
# The #compdef directive above registers it for both npm and yarn.

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

  (( ${#scripts[@]} )) && _describe 'package scripts' scripts
}

_nac_npm() {
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

_nac_yarn() {
  local -a subcmds
  subcmds=(
    'add:Add a dependency'
    'remove:Remove a dependency'
    'upgrade:Upgrade a dependency'
    'install:Install all dependencies'
    'run:Run a package script'
    'init:Create a new package.json'
    'publish:Publish package to npm'
    'info:Show information about a package'
    'list:List installed packages'
    'outdated:Check for outdated packages'
    'audit:Run a security audit'
    'link:Symlink a package folder'
    'unlink:Unlink a package'
    'cache:Manage the yarn cache'
    'config:Manage configuration'
    'global:Manage globally installed packages'
    'workspace:Run a command in a workspace'
    'workspaces:Show workspaces info'
  )

  case $CURRENT in
    2)
      # yarn runs scripts directly (e.g. `yarn build`) — show both scripts and commands
      _nac_run_scripts
      _describe 'yarn commands' subcmds
      ;;
    3)
      case ${words[2]} in
        run)
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

# Entry point — $service is set to the command being completed ('npm' or 'yarn')
_npm() {
  case "$service" in
    yarn) _nac_yarn "$@" ;;
    *)    _nac_npm "$@"  ;;
  esac
}

_npm "$@"

# When sourced directly (Linux fallback), register both completions explicitly.
# When loaded via fpath, the #compdef directive at the top handles this.
if [[ "${ZSH_EVAL_CONTEXT}" == "toplevel" ]]; then
  compdef _npm npm
  compdef _npm yarn
fi
