# Run from this directory (c). Requires emsdk activated in this shell:
#   & C:\emsdk\emsdk_env.ps1
# then:
#   .\build.ps1

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Path "build" -Force | Out-Null

emcc scribble.c -O3 `
    -s MODULARIZE=1 `
    -s EXPORT_ES6=1 `
    -s EXPORT_NAME=createScribble `
    -s ENVIRONMENT=web `
    -s ALLOW_MEMORY_GROWTH=0 `
    -s INITIAL_MEMORY=131072 `
    -s TOTAL_STACK=16384 `
    -s FILESYSTEM=0 `
    -s ASSERTIONS=0 `
    --no-entry `
    -o build/scribble.mjs
