param([string]$VencordPath = "$env:USERPROFILE\Downloads\Vencord")

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path "$PSScriptRoot\.."
$VencordParent = Split-Path $VencordPath -Parent

function HasCommand($Name) {
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

if (!(HasCommand "git")) { throw "Git is not installed or not in PATH" }
if (!(HasCommand "node")) { throw "Node.js is not installed or not in PATH" }
if (!(HasCommand "pnpm")) { npm install -g pnpm }

New-Item -ItemType Directory -Force -Path $VencordParent | Out-Null

if (!(Test-Path $VencordPath)) {
    Set-Location $VencordParent
    git clone https://github.com/Vendicated/Vencord
}

Set-Location $VencordPath
pnpm install --frozen-lockfile

$PluginTarget = Join-Path $VencordPath "src\userplugins\TikTokRPC"
New-Item -ItemType Directory -Force -Path $PluginTarget | Out-Null
Copy-Item (Join-Path $RepoRoot "TikTokRPC\*") $PluginTarget -Recurse -Force

& (Join-Path $RepoRoot "scripts\patch-vencord-modal.ps1") -VencordPath $VencordPath

pnpm buildWeb

Write-Host ""
Write-Host "Done:"
Write-Host (Join-Path $VencordPath "dist\chromium-unpacked")
