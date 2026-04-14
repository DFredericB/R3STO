@echo off
REM Deploy uniquement pro.r3sto.ch (landing B2B) via le script PS1 global
REM Ajoute le flag -SitesOnly pour sauter API + App + Demo
powershell.exe -ExecutionPolicy Bypass -File "%~dp0DEPLOY-TOUT-R3STO.ps1" -SitesOnly
