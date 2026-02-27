; ============================================================
;  ShaderToy Cloner – Windows Installer (NSIS)
;  Build:  makensis /DVERSION=x.y.z installer\installer.nsi
;
;  Before invoking makensis the workflow copies:
;    icon.ico               → installer\icon.ico
;    dist\shadertoy-cloner.exe → installer\shadertoy-cloner.exe
;  so that every File/Icon reference here is a plain filename
;  with no ".." navigation (NSIS sets CWD to the .nsi directory
;  and does not normalise paths containing "..").
; ============================================================

Unicode True

; ── Defines ──────────────────────────────────────────────────────────────────

!ifndef VERSION
  !define VERSION "1.0.0"
!endif

!define APP_NAME     "ShaderToy Cloner"
!define APP_EXE      "shadertoy-cloner.exe"
!define SERVICE_NAME "ShaderToy Cloner"
!define APP_URL      "http://localhost:7700"
!define PUBLISHER    "ShaderToy Cloner"
!define REGKEY       "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"

; ── Includes ─────────────────────────────────────────────────────────────────

!include "MUI2.nsh"
!include "LogicLib.nsh"

; ── General ──────────────────────────────────────────────────────────────────

RequestExecutionLevel admin
Name             "${APP_NAME} ${VERSION}"

; Output goes one level up into the dist\ folder that already exists.
; NSIS handles forward slashes and the ..\ here because OutFile is an output
; path resolved by the OS, not an NSIS include/File read operation.
OutFile          "..\dist\ShaderToy-Cloner-Setup-${VERSION}.exe"

InstallDir       "$PROGRAMFILES64\${APP_NAME}"
InstallDirRegKey HKLM "${REGKEY}" "InstallLocation"
BrandingText     "${APP_NAME} ${VERSION}"

; ── MUI Settings ─────────────────────────────────────────────────────────────

!define MUI_ABORTWARNING
!define MUI_ICON    "icon.ico"
!define MUI_UNICON  "icon.ico"

!define MUI_WELCOMEPAGE_TITLE  "Welcome to ${APP_NAME} ${VERSION} Setup"
!define MUI_WELCOMEPAGE_TEXT   "This will install ${APP_NAME} on your computer as a Windows service that starts automatically with Windows.$\r$\n$\r$\nOnce installed, open http://localhost:7700 in your browser to manage your shaders.$\r$\n$\r$\nClick Next to continue."

!define MUI_FINISHPAGE_RUN           "explorer.exe"
!define MUI_FINISHPAGE_RUN_PARAMETERS "${APP_URL}"
!define MUI_FINISHPAGE_RUN_TEXT      "Open ShaderToy Cloner in browser"
!define MUI_FINISHPAGE_SHOWREADME    ""

; ── Pages ─────────────────────────────────────────────────────────────────────

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; ── Languages ────────────────────────────────────────────────────────────────

!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Spanish"

; ============================================================
;  Install
; ============================================================

Section "Install" SecMain

  SetOutPath "$INSTDIR"

  ; ── Stop and remove previous service (graceful, ignore errors) ──────────────

  IfFileExists "$INSTDIR\nssm.exe" 0 try_sc_stop
    ExecWait '"$INSTDIR\nssm.exe" stop "${SERVICE_NAME}"'
    ExecWait '"$INSTDIR\nssm.exe" remove "${SERVICE_NAME}" confirm'
    Sleep 1500
    Goto copy_files
  try_sc_stop:
    ExecWait 'sc stop "${SERVICE_NAME}"'
    ExecWait 'sc delete "${SERVICE_NAME}"'
    Sleep 1500

  ; ── Copy files (all staged in installer\ by the workflow) ───────────────────

  copy_files:
  File "${APP_EXE}"
  File "nssm.exe"
  File "icon.ico"

  ; ── Copy public\ web assets (express.static reads from real filesystem) ─────

  SetOutPath "$INSTDIR\public"
  File /r "public\"
  SetOutPath "$INSTDIR"

  ; ── Create data directories ─────────────────────────────────────────────────

  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\shaders"

  ; ── Register Windows service via NSSM ───────────────────────────────────────

  ExecWait '"$INSTDIR\nssm.exe" install "${SERVICE_NAME}" "$INSTDIR\${APP_EXE}"'
  ExecWait '"$INSTDIR\nssm.exe" set "${SERVICE_NAME}" AppDirectory "$INSTDIR"'
  ExecWait '"$INSTDIR\nssm.exe" set "${SERVICE_NAME}" DisplayName "${APP_NAME}"'
  ExecWait '"$INSTDIR\nssm.exe" set "${SERVICE_NAME}" Description "Local ShaderToy server for Lively Wallpaper (${APP_URL})"'
  ExecWait '"$INSTDIR\nssm.exe" set "${SERVICE_NAME}" Start SERVICE_AUTO_START'
  ExecWait '"$INSTDIR\nssm.exe" set "${SERVICE_NAME}" AppEnvironmentExtra "NODE_ENV=production"'
  ExecWait '"$INSTDIR\nssm.exe" set "${SERVICE_NAME}" AppStdout "$INSTDIR\service.log"'
  ExecWait '"$INSTDIR\nssm.exe" set "${SERVICE_NAME}" AppStderr "$INSTDIR\service-error.log"'
  ExecWait '"$INSTDIR\nssm.exe" set "${SERVICE_NAME}" AppRotateFiles 1'
  ExecWait '"$INSTDIR\nssm.exe" set "${SERVICE_NAME}" AppRotateBytes 1048576'
  ExecWait '"$INSTDIR\nssm.exe" start "${SERVICE_NAME}"'

  ; ── Start Menu shortcuts ────────────────────────────────────────────────────

  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" \
    "$WINDIR\explorer.exe" "${APP_URL}" "$INSTDIR\icon.ico" 0
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk" \
    "$INSTDIR\Uninstall.exe"

  ; ── Desktop shortcut ────────────────────────────────────────────────────────

  CreateShortcut "$DESKTOP\${APP_NAME}.lnk" \
    "$WINDIR\explorer.exe" "${APP_URL}" "$INSTDIR\icon.ico" 0

  ; ── Write uninstaller ───────────────────────────────────────────────────────

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; ── Add/Remove Programs registry entry ─────────────────────────────────────

  WriteRegStr   HKLM "${REGKEY}" "DisplayName"          "${APP_NAME}"
  WriteRegStr   HKLM "${REGKEY}" "UninstallString"       '"$INSTDIR\Uninstall.exe"'
  WriteRegStr   HKLM "${REGKEY}" "QuietUninstallString"  '"$INSTDIR\Uninstall.exe" /S'
  WriteRegStr   HKLM "${REGKEY}" "InstallLocation"       "$INSTDIR"
  WriteRegStr   HKLM "${REGKEY}" "DisplayIcon"           "$INSTDIR\icon.ico"
  WriteRegStr   HKLM "${REGKEY}" "Publisher"             "${PUBLISHER}"
  WriteRegStr   HKLM "${REGKEY}" "DisplayVersion"        "${VERSION}"
  WriteRegStr   HKLM "${REGKEY}" "URLInfoAbout"          "https://github.com"
  WriteRegDWORD HKLM "${REGKEY}" "NoModify"              1
  WriteRegDWORD HKLM "${REGKEY}" "NoRepair"              1

SectionEnd

; ============================================================
;  Uninstall
; ============================================================

Section "Uninstall"

  ; ── Stop and remove service first ───────────────────────────────────────────

  IfFileExists "$INSTDIR\nssm.exe" 0 try_sc_remove
    ExecWait '"$INSTDIR\nssm.exe" stop "${SERVICE_NAME}"'
    ExecWait '"$INSTDIR\nssm.exe" remove "${SERVICE_NAME}" confirm'
    Sleep 1500
    Goto remove_files
  try_sc_remove:
    ExecWait 'sc stop "${SERVICE_NAME}"'
    ExecWait 'sc delete "${SERVICE_NAME}"'
    Sleep 1500

  ; ── Remove files ────────────────────────────────────────────────────────────

  remove_files:
  Delete "$INSTDIR\${APP_EXE}"
  Delete "$INSTDIR\nssm.exe"
  Delete "$INSTDIR\icon.ico"
  Delete "$INSTDIR\service.log"
  Delete "$INSTDIR\service-error.log"
  Delete "$INSTDIR\Uninstall.exe"

  ; Remove web assets folder.
  RMDir /r "$INSTDIR\public"

  ; Data folder is intentionally kept so shaders and settings are preserved.
  ; Users can delete %PROGRAMFILES%\ShaderToy Cloner\data manually if desired.

  RMDir "$INSTDIR"

  ; ── Remove shortcuts ────────────────────────────────────────────────────────

  Delete "$SMPROGRAMS\${APP_NAME}\*.*"
  RMDir  "$SMPROGRAMS\${APP_NAME}"
  Delete "$DESKTOP\${APP_NAME}.lnk"

  ; ── Remove registry entries ─────────────────────────────────────────────────

  DeleteRegKey HKLM "${REGKEY}"

SectionEnd
