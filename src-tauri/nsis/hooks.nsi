; REST in Peace CLI — Add/remove installation directory to/from user PATH

!macro NSIS_HOOK_POSTINSTALL
  FileOpen $9 "$TEMP\rip-path-add.ps1" w
  FileWrite $9 `$$installDir = '$INSTDIR'$\r$\n`
  FileWrite $9 `$$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')$\r$\n`
  FileWrite $9 `if (-not $$userPath) { [Environment]::SetEnvironmentVariable('Path', $$installDir, 'User') }$\r$\n`
  FileWrite $9 `elseif ($$userPath.Split(';') -notcontains $$installDir) { [Environment]::SetEnvironmentVariable('Path', "$$userPath;$$installDir", 'User') }$\r$\n`
  FileClose $9
  nsExec::ExecToLog 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$TEMP\rip-path-add.ps1"'
  Delete "$TEMP\rip-path-add.ps1"
  SendMessage 0xFFFF 0x001A 0 "STR:Environment" /TIMEOUT=5000
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  FileOpen $9 "$TEMP\rip-path-remove.ps1" w
  FileWrite $9 `$$installDir = '$INSTDIR'$\r$\n`
  FileWrite $9 `$$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')$\r$\n`
  FileWrite $9 `if ($$userPath) {$\r$\n`
  FileWrite $9 `  $$newPath = ($$userPath.Split(';') | Where-Object { $$_ -ne $$installDir }) -join ';'$\r$\n`
  FileWrite $9 `  [Environment]::SetEnvironmentVariable('Path', $$newPath, 'User')$\r$\n`
  FileWrite $9 `}$\r$\n`
  FileClose $9
  nsExec::ExecToLog 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$TEMP\rip-path-remove.ps1"'
  Delete "$TEMP\rip-path-remove.ps1"
  SendMessage 0xFFFF 0x001A 0 "STR:Environment" /TIMEOUT=5000
!macroend
