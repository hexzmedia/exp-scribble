# Build the Go wasm module. Requires standard Go (>=1.19) on PATH.
#   .\build.ps1

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Path "build" -Force | Out-Null

$env:GOOS = "js"
$env:GOARCH = "wasm"
go build -ldflags="-s -w" -o build/scribble.wasm scribble.go

$goroot = (& go env GOROOT)
Copy-Item -Force "$goroot\misc\wasm\wasm_exec.js" "build/wasm_exec.js"

Write-Host ("build/scribble.wasm — {0:N0} bytes" -f (Get-Item build/scribble.wasm).Length)
Write-Host ("build/wasm_exec.js — {0:N0} bytes" -f (Get-Item build/wasm_exec.js).Length)
