param([string]$VencordPath = "$env:USERPROFILE\Downloads\Vencord")
if (!(Test-Path $VencordPath)) { throw "Vencord path not found: $VencordPath" }
Set-Location $VencordPath
pnpm buildWeb
