# npm-scripts-auto-complete — PowerShell completion
# Provides tab completion for `npm run` and `yarn` scripts using the nearest package.json.
# Dot-sourced from $PROFILE by the postinstall script.

# ── shared helper ─────────────────────────────────────────────────────────────

function _NacFindPkgJson {
    $dir = (Get-Location).Path
    while ($dir) {
        $candidate = Join-Path $dir 'package.json'
        if (Test-Path $candidate) { return $candidate }
        $parent = Split-Path $dir -Parent
        if ($parent -eq $dir) { break }
        $dir = $parent
    }
    return $null
}

function _NacScriptCompletions {
    param($wordToComplete)
    $pkgJson = _NacFindPkgJson
    if (-not $pkgJson) { return }
    try {
        $pkg = Get-Content $pkgJson -Raw | ConvertFrom-Json
        if (-not $pkg.scripts) { return }
        $pkg.scripts.PSObject.Properties |
            Where-Object { $_.Name -like "$wordToComplete*" } |
            ForEach-Object {
                $desc = $_.Value
                if ($desc.Length -gt 70) { $desc = $desc.Substring(0, 70) + '...' }
                [System.Management.Automation.CompletionResult]::new(
                    $_.Name, $_.Name, 'ParameterValue', $desc
                )
            }
    } catch { }
}

# ── npm ───────────────────────────────────────────────────────────────────────

Register-ArgumentCompleter -Native -CommandName npm -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)

    $words = $commandAst.ToString().Trim() -split '\s+'

    # Only complete the script name: `npm run <TAB>` or `npm run-script <TAB>`
    if ($words.Count -lt 2) { return }
    if ($words[1] -notin @('run', 'run-script')) { return }
    if ($words.Count -gt 3) { return }

    _NacScriptCompletions $wordToComplete
}

# ── yarn ──────────────────────────────────────────────────────────────────────

Register-ArgumentCompleter -Native -CommandName yarn -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)

    $words = $commandAst.ToString().Trim() -split '\s+'

    # Built-in yarn subcommands that are NOT script names
    $builtins = @('add','remove','upgrade','install','info','list','outdated',
                  'audit','publish','init','link','unlink','cache','config',
                  'global','workspace','workspaces')

    # Show scripts for:
    #   `yarn <TAB>`                  — run script directly
    #   `yarn <partial><TAB>`         — partial script name (not a known builtin)
    #   `yarn run <TAB>`              — explicit run subcommand
    #   `yarn run <partial><TAB>`
    $showScripts = (
        $words.Count -le 1 -or
        ($words.Count -eq 2 -and $words[1] -notin $builtins) -or
        ($words[1] -eq 'run' -and $words.Count -le 3)
    )

    if (-not $showScripts) { return }

    _NacScriptCompletions $wordToComplete
}
