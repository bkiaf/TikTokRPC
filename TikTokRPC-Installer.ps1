$ErrorActionPreference = "Stop"

$Root = Split-Path $MyInvocation.MyCommand.Path -Parent
$PluginSource = Join-Path $Root "TikTokRPC.plugin.js"
$PluginFolder = Join-Path $env:APPDATA "BetterDiscord\plugins"
$PluginTarget = Join-Path $PluginFolder "TikTokRPC.plugin.js"

if (!(Test-Path $PluginSource)) {
    throw "TikTokRPC.plugin.js was not found next to this installer."
}

New-Item -ItemType Directory -Force -Path $PluginFolder | Out-Null
Copy-Item $PluginSource $PluginTarget -Force

Write-Host ""
Write-Host "TikTokRPC installed to:"
Write-Host $PluginTarget
Write-Host ""
Write-Host "Open Discord, then enable it from:"
Write-Host "User Settings -> BetterDiscord -> Plugins -> TikTokRPC"
