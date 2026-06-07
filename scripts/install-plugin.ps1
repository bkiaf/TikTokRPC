param(
    [string]$VencordPath = "$env:USERPROFILE\Downloads\Vencord",
    [switch]$NoInject
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $VencordPath)) {
    throw "Vencord source folder was not found: $VencordPath"
}

$PluginSource = Resolve-Path "$PSScriptRoot\..\TikTokRPC"
$PluginTarget = Join-Path $VencordPath "src\userplugins\TikTokRPC"

New-Item -ItemType Directory -Force -Path $PluginTarget | Out-Null
Copy-Item (Join-Path $PluginSource "*") $PluginTarget -Recurse -Force

& "$PSScriptRoot\patch-vencord-modal.ps1" -VencordPath $VencordPath

Set-Location $VencordPath
pnpm install --frozen-lockfile
pnpm build

if (!$NoInject) {
    pnpm inject
}

Write-Host ""
Write-Host "Done."
Write-Host "Close Discord completely, then open Discord again."
