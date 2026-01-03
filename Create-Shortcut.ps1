# Creates a desktop shortcut for Auto-Claude
# Right-click and select "Run with PowerShell"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = "$DesktopPath\Auto-Claude.lnk"
$TargetPath = Join-Path $ScriptDir "START-AUTO-CLAUDE.bat"
$IconPath = Join-Path $ScriptDir "auto-claude-ui\resources\icon.ico"
$WorkingDir = $ScriptDir

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = $WorkingDir
if (Test-Path $IconPath) {
    $Shortcut.IconLocation = $IconPath
}
$Shortcut.Description = "Launch Auto-Claude UI (Development Mode)"
$Shortcut.Save()

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Desktop Shortcut Created!" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "A shortcut to Auto-Claude has been created on your desktop." -ForegroundColor Green
Write-Host ""
Write-Host "Double-click 'Auto-Claude' on your desktop to:" -ForegroundColor Yellow
Write-Host "  - Automatically set up Python environment" -ForegroundColor White
Write-Host "  - Install all dependencies" -ForegroundColor White
Write-Host "  - Start Docker containers (if available)" -ForegroundColor White
Write-Host "  - Launch the Auto-Claude UI" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
