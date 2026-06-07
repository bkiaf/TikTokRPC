param([string]$VencordPath = "$env:USERPROFILE\Downloads\Vencord")
$Root = Split-Path $MyInvocation.MyCommand.Path -Parent
& (Join-Path $Root "scripts\setup-desktop.ps1") -VencordPath $VencordPath
