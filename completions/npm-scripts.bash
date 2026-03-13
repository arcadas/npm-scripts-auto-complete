# npm-scripts-auto-complete — bash completion
# Installed into bash-completion.d — sourced automatically by bash-completion.

_nac_find_pkg() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/package.json" ]]; then
      echo "$dir/package.json"
      return
    fi
    dir="$(dirname "$dir")"
  done
}

_nac_npm_complete() {
  local cur="${COMP_WORDS[COMP_CWORD]}"
  local sub="${COMP_WORDS[1]}"

  if [[ "$COMP_CWORD" -eq 1 ]]; then
    local subcmds="run install uninstall update test start publish init ci audit outdated version pack link exec ls cache"
    COMPREPLY=($(compgen -W "$subcmds" -- "$cur"))
    return
  fi

  if [[ "$COMP_CWORD" -eq 2 ]] && [[ "$sub" == "run" || "$sub" == "run-script" ]]; then
    local pkg_json
    pkg_json=$(_nac_find_pkg)
    if [[ -n "$pkg_json" ]]; then
      local scripts
      scripts=$(node -e "
const fs = require('fs');
try {
  const pkg = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  console.log(Object.keys(pkg.scripts || {}).join(' '));
} catch(e) {}
" "$pkg_json")
      COMPREPLY=($(compgen -W "$scripts" -- "$cur"))
    fi
    return
  fi

  COMPREPLY=($(compgen -f -- "$cur"))
}

complete -F _nac_npm_complete npm
