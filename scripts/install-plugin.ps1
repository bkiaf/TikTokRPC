param([string]$VencordPath = "$env:USERPROFILE\Downloads\Vencord")
$ErrorActionPreference = "Stop"
$PluginSource = Resolve-Path "$PSScriptRoot\..\TikTokRPC"
$PluginTarget = Join-Path $VencordPath "src\userplugins\TikTokRPC"
New-Item -ItemType Directory -Force -Path $PluginTarget | Out-Null
Copy-Item (Join-Path $PluginSource "*") $PluginTarget -Recurse -Force
& "$PSScriptRoot\patch-vencord-modal.ps1" -VencordPath $VencordPath
Set-Location $VencordPath
pnpm buildWeb
