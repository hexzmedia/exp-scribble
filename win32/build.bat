@echo off
setlocal

REM Activate MSVC x64 environment, then compile a single-file Win32 exe.
REM Adjust the vcvars64.bat path if your Visual Studio install differs.

set "VCVARS=C:\Program Files\Microsoft Visual Studio\18\Enterprise\VC\Auxiliary\Build\vcvars64.bat"
if not exist "%VCVARS%" (
    echo Could not find vcvars64.bat at %VCVARS%
    exit /b 1
)
call "%VCVARS%" >nul

if not exist build mkdir build

cl /nologo /EHsc /O2 /W3 /MT /std:c++17 ^
   /Fo:build\ /Fe:build\scribble.exe ^
   scribble.cpp
if errorlevel 1 exit /b %errorlevel%

for %%I in (build\scribble.exe) do echo build\scribble.exe -- %%~zI bytes
