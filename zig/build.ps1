# Build the Zig wasm module. Requires zig 0.13+ on PATH.
#   .\build.ps1

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Path "build" -Force | Out-Null

zig build-exe scribble.zig `
    -target wasm32-freestanding `
    -fno-entry `
    -OReleaseSmall `
    --export=push `
    --export=clear `
    --export=getCount `
    --export=startSlot `
    --export=slotAt `
    --export=getX `
    --export=getY `
    --export=getConnected `
    --export=segmentAlpha

Move-Item -Force scribble.wasm build/scribble.wasm
if (Test-Path scribble.wasm.o) { Remove-Item scribble.wasm.o }
Write-Host "build/scribble.wasm — $((Get-Item build/scribble.wasm).Length) bytes"
