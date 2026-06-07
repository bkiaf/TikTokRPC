param(
    [string]$VencordPath = "$env:USERPROFILE\Downloads\Vencord",
    [switch]$SkipWinget
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path "$PSScriptRoot\.."

function HasCommand($Name) {
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function RefreshPath {
    $MachinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$MachinePath;$UserPath;$env:APPDATA\npm;C:\Program Files\Git\bin;C:\Program Files\nodejs"
}

function InstallWithWinget($Id) {
    if ($SkipWinget) { return }
    if (!(HasCommand "winget")) { return }
    winget install --id $Id -e --source winget --accept-package-agreements --accept-source-agreements
}

RefreshPath

if (!(HasCommand "git")) {
    InstallWithWinget "Git.Git"
    RefreshPath
}

if (!(HasCommand "node")) {
    InstallWithWinget "OpenJS.NodeJS.LTS"
    RefreshPath
}

if (!(HasCommand "git")) {
    throw "Git is missing. Install Git for Windows, restart PowerShell, then run again."
}

if (!(HasCommand "node")) {
    throw "Node.js is missing. Install Node.js LTS, restart PowerShell, then run again."
}

if (!(HasCommand "npm")) {
    throw "npm is missing. Reinstall Node.js LTS, restart PowerShell, then run again."
}

if (!(HasCommand "pnpm")) {
    npm install -g pnpm
    RefreshPath
}

if (!(HasCommand "pnpm")) {
    throw "pnpm is missing. Restart PowerShell, then run again."
}

& (Join-Path $Root "scripts\setup-web.ps1") -VencordPath $VencordPath

$ExtensionPath = Join-Path $VencordPath "dist\chromium-unpacked"
Write-Host ""
Write-Host "Vencord Web build is ready:"
Write-Host $ExtensionPath
Write-Host ""
Write-Host "Open chrome://extensions or edge://extensions, enable Developer mode, then Load unpacked:"
Write-Host $ExtensionPath
try {
    Start-Process $ExtensionPath
} catch {}
