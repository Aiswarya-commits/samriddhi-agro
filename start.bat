@echo off
REM Double-click to preview the site at http://localhost:3000 (needs Python installed)
start "" http://localhost:3000
python -m http.server 3000
