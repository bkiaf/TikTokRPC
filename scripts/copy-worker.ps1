$Worker = Resolve-Path (Join-Path $PSScriptRoot "..\cloudflare-worker\worker.js")
Get-Content $Worker -Raw | Set-Clipboard
Write-Host "worker.js copied to clipboard"
