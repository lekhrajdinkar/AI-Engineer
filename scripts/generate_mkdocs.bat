@echo off
REM Auto-generate mkdocs.yml from docs/ folder structure
REM Windows batch file wrapper for scripts/generate_mkdocs.py

setlocal enabledelayedexpansion

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    exit /b 1
)

REM Run the generator script
echo Running mkdocs generator...
python scripts\generate_mkdocs.py %*

if errorlevel 1 (
    echo Error: Failed to generate mkdocs.yml
    exit /b 1
)

mkdocs serve

echo Done!
exit /b 0

