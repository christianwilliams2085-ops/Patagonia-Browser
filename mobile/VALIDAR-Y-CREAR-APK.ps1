param([ValidateSet('Prueba', 'Publicacion')][string]$Modo = 'Prueba')
$ErrorActionPreference = 'Stop'
$flutterCommand = Get-Command flutter -ErrorAction SilentlyContinue
if (-not $flutterCommand) {
    throw 'Flutter no aparece en PATH. Abrí la terminal donde compilaste el APK anterior y ejecutá este archivo allí.'
}
if ($Modo -eq 'Publicacion' -and -not (Test-Path (Join-Path $PSScriptRoot 'android\key.properties'))) {
    throw 'Falta android\key.properties para firmar con la clave original. La carpeta .signing se conserva. No crees otra clave para actualizar la aplicación instalada.'
}
$previousPreview = $env:PATAGONIA_PREVIEW
$previousCI = $env:CI
Push-Location $PSScriptRoot
try {
    $env:CI = 'true'
    $env:PATAGONIA_PREVIEW = if ($Modo -eq 'Prueba') { '1' } else { '0' }
    function Invoke-Flutter([string[]]$Arguments) {
        & $flutterCommand.Source --no-version-check --suppress-analytics @Arguments
        if ($LASTEXITCODE -ne 0) { throw "Flutter terminó con error ($LASTEXITCODE). Revisá la salida anterior." }
    }
    Invoke-Flutter -Arguments @('clean')
    Invoke-Flutter -Arguments @('pub', 'get', '--enforce-lockfile')
    Invoke-Flutter -Arguments @('analyze', '--no-pub')
    Invoke-Flutter -Arguments @('test', '--no-pub', 'test/packaged_assets_test.dart')
    Invoke-Flutter -Arguments @('test', '--no-pub')
    Invoke-Flutter -Arguments @('build', 'apk', '--release', '--no-pub')
    $output = Join-Path $PSScriptRoot 'entrega-android'
    New-Item -ItemType Directory -Path $output -Force | Out-Null
    $apk = Join-Path $output "Patagonia-Android-1.0.5-$Modo.apk"
    Copy-Item -LiteralPath 'build\app\outputs\flutter-apk\app-release.apk' -Destination $apk -Force
    Write-Host "APK creado: $apk"
    if ($Modo -eq 'Prueba') { Write-Host 'Se instala como Patagonia Pruebas, separado de la versión anterior.' }
    Get-FileHash -LiteralPath $apk -Algorithm SHA256
    explorer.exe /select,"$apk"
} finally {
    $env:PATAGONIA_PREVIEW = $previousPreview
    $env:CI = $previousCI
    Pop-Location
}
