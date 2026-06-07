param([string]$VencordPath = "$env:USERPROFILE\Downloads\Vencord")
$Root = Split-Path $MyInvocation.MyCommand.Path -Parent
& (Join-Path $Root "scripts\setup-windows.ps1") -VencordPath $VencordPath
