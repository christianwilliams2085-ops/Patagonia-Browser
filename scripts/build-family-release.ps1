$ErrorActionPreference = "Stop"

$raiz = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$paquete = Get-Content -LiteralPath (Join-Path $raiz "package.json") -Raw | ConvertFrom-Json
$version = $paquete.version
$destino = [IO.Path]::GetFullPath((Join-Path $raiz "dist\PARA COMPARTIR - PATAGONIA $version"))
$portatil = [IO.Path]::GetFullPath((Join-Path $raiz "dist\Patagonia Browser-win32-x64"))
$instaladorOrigen = [IO.Path]::GetFullPath((Join-Path $raiz "out-oficial\make\squirrel.windows\x64\Patagonia-Browser-Setup.exe"))

if (-not $destino.StartsWith($raiz, [StringComparison]::OrdinalIgnoreCase)) {
    throw "La carpeta de entrega quedó fuera del proyecto."
}
if (-not (Test-Path -LiteralPath $instaladorOrigen -PathType Leaf)) { throw "Falta crear el instalador." }
if (-not (Test-Path -LiteralPath (Join-Path $portatil "Patagonia Browser.exe") -PathType Leaf)) { throw "Falta crear la versión portátil." }

New-Item -ItemType Directory -Path $destino -Force | Out-Null

$instalador = Join-Path $destino "Patagonia-Browser-Setup-$version-Windows-x64.exe"
$zip = Join-Path $destino "Patagonia-Browser-Portable-$version-Windows-x64.zip"
$icono = Join-Path $destino "Icono oficial Patagonia.png"
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
Copy-Item -LiteralPath $instaladorOrigen -Destination $instalador -Force
Copy-Item -LiteralPath (Join-Path $raiz "assets\patagonia-icon.png") -Destination $icono -Force

Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory(
    $portatil,
    $zip,
    [IO.Compression.CompressionLevel]::Optimal,
    $false
)

$guia = @"
PATAGONIA BROWSER $version — VERSIÓN PARA LA FAMILIA

OPCIÓN RECOMENDADA
1. Cerrá una versión anterior de Patagonia Browser si está abierta.
2. Abrí Patagonia-Browser-Setup-$version-Windows-x64.exe.
3. Windows puede mostrar "Editor desconocido" porque esta edición familiar todavía no tiene firma comercial.
4. Al terminar, Patagonia Browser se abrirá y quedará instalado para tu usuario.

VERSIÓN PORTÁTIL
Extraé Patagonia-Browser-Portable-$version-Windows-x64.zip completo y abrí Patagonia Browser.exe.
No ejecutes el programa directamente desde el ZIP.

PROTECCIÓN
El bloqueo de anuncios y rastreadores viene activado. El escudo muestra los bloqueos de la página actual.
Si un sitio no funciona correctamente, abrí el escudo y elegí "Desactivar en este sitio". Podés volver a activarlo desde el mismo botón.

SISTEMA
Windows de 64 bits.
"@
$guiaRuta = Join-Path $destino "LEEME - Como instalar.txt"
Get-ChildItem -LiteralPath $destino -File -Filter "LEEME - *instalar.txt" | Where-Object {
    $_.FullName -ne $guiaRuta
} | Remove-Item -Force
Set-Content -LiteralPath $guiaRuta -Value $guia -Encoding UTF8

$hashes = @($instalador, $zip, $icono) | ForEach-Object {
    $hash = Get-FileHash -LiteralPath $_ -Algorithm SHA256
    "$($hash.Hash.ToLowerInvariant())  $([IO.Path]::GetFileName($_))"
}
Set-Content -LiteralPath (Join-Path $destino "SHA256.txt") -Value ($hashes -join "`r`n") -Encoding ASCII

Write-Output "Entrega familiar $version creada en:"
Write-Output $destino
