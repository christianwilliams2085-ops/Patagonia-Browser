param(
    [switch]$Test
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$raiz = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$paquete = Get-Content -LiteralPath (Join-Path $raiz "package.json") -Raw | ConvertFrom-Json

if ($Test) {
    $identidad = "PatagoniaBrowser.Test"
    $editor = "CN=Patagonia Browser Test"
    $editorVisible = "Patagonia Browser Test"
} else {
    $identidad = $env:PATAGONIA_MSIX_IDENTITY_NAME
    $editor = $env:PATAGONIA_MSIX_PUBLISHER
    $editorVisible = $env:PATAGONIA_MSIX_PUBLISHER_DISPLAY_NAME
    if ([string]::IsNullOrWhiteSpace($identidad) -or
        [string]::IsNullOrWhiteSpace($editor) -or
        [string]::IsNullOrWhiteSpace($editorVisible)) {
        throw "Faltan los valores de Partner Center: PATAGONIA_MSIX_IDENTITY_NAME, PATAGONIA_MSIX_PUBLISHER y PATAGONIA_MSIX_PUBLISHER_DISPLAY_NAME. Para un candidato usa npm run make:msix:test."
    }
}

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
    throw "Node.js no esta instalado."
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "npm no esta instalado."
}
if (-not ${env:ProgramFiles(x86)}) {
    throw "Windows SDK no detectado (falta ProgramFiles(x86))."
}
$sdkRaiz = Join-Path ${env:ProgramFiles(x86)} "Windows Kits\10\bin"
$makeAppx = $null
if (Test-Path -LiteralPath $sdkRaiz -PathType Container) {
    $versionesSdk = Get-ChildItem -LiteralPath $sdkRaiz -Directory |
        Sort-Object -Property Name -Descending
    foreach ($versionSdk in $versionesSdk) {
        $candidato = Join-Path $versionSdk.FullName "x64\makeappx.exe"
        if (Test-Path -LiteralPath $candidato -PathType Leaf) {
            $makeAppx = $candidato
            break
        }
    }
}
if (-not $makeAppx) {
    throw "Falta makeappx.exe de Windows SDK x64. Instala el Windows 10/11 SDK antes de generar MSIX."
}

$iconoOrigen = Join-Path $raiz "assets\patagonia-icon.png"
if (-not (Test-Path -LiteralPath $iconoOrigen -PathType Leaf)) {
    throw "Falta el icono fuente: assets\patagonia-icon.png"
}

Push-Location $raiz
try {
    Write-Host "1/5 Empaquetando Patagonia Browser con Electron Forge..."
    & npm.cmd run package:windows
    if ($LASTEXITCODE -ne 0) { throw "Fallo el empaquetado Electron Forge." }

    $origen = Join-Path $raiz "out-oficial\Patagonia Browser-win32-x64"
    $ejecutable = Join-Path $origen "Patagonia Browser.exe"
    if (-not (Test-Path -LiteralPath $ejecutable -PathType Leaf)) {
        throw "No se encontro Patagonia Browser.exe en $origen"
    }

    $destino = Join-Path $raiz "dist\msix"
    $stage = Join-Path $raiz "dist\msix-stage"
    if (Test-Path -LiteralPath $stage) {
        Remove-Item -LiteralPath $stage -Recurse -Force
    }
    New-Item -ItemType Directory -Path $stage -Force | Out-Null
    New-Item -ItemType Directory -Path $destino -Force | Out-Null

    Write-Host "2/5 Preparando archivos sin alterar el instalador EXE..."
    Get-ChildItem -LiteralPath $origen -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $stage -Recurse -Force
    }

    $recursos = Join-Path $stage "MSIXAssets"
    New-Item -ItemType Directory -Path $recursos -Force | Out-Null

    Add-Type -AssemblyName System.Drawing
    $imagen = [System.Drawing.Image]::FromFile($iconoOrigen)
    try {
        foreach ($item in @(
            @{ Archivo = "StoreLogo.png"; Tamano = 50 },
            @{ Archivo = "Square44x44Logo.png"; Tamano = 44 },
            @{ Archivo = "Square150x150Logo.png"; Tamano = 150 }
        )) {
            $tamano = [int]$item.Tamano
            $bitmap = New-Object System.Drawing.Bitmap($tamano, $tamano)
            $grafico = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $grafico.Clear([System.Drawing.Color]::Transparent)
                $grafico.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $escala = [Math]::Min($tamano / [double]$imagen.Width, $tamano / [double]$imagen.Height)
                $ancho = [int][Math]::Round($imagen.Width * $escala)
                $alto = [int][Math]::Round($imagen.Height * $escala)
                $x = [int][Math]::Floor(($tamano - $ancho) / 2)
                $y = [int][Math]::Floor(($tamano - $alto) / 2)
                $grafico.DrawImage($imagen, $x, $y, $ancho, $alto)
                $rutaPng = Join-Path $recursos $item.Archivo
                $bitmap.Save($rutaPng, [System.Drawing.Imaging.ImageFormat]::Png)
            } finally {
                $grafico.Dispose()
                $bitmap.Dispose()
            }
        }
    } finally {
        $imagen.Dispose()
    }

    Write-Host "3/5 Generando AppxManifest.xml..."
    $manifest = Join-Path $stage "AppxManifest.xml"
    & node.exe (Join-Path $raiz "scripts\msix-manifest.cjs") $manifest $identidad $editor $editorVisible
    if ($LASTEXITCODE -ne 0) { throw "No se pudo generar el manifest MSIX." }

    $sufijo = if ($Test) { "TEST-UNSIGNED" } else { "STORE-UNSIGNED" }
    $nombre = "Patagonia-Browser-$($paquete.version)-Windows-x64-$sufijo.msix"
    $salida = Join-Path $destino $nombre

    Write-Host "4/5 Creando MSIX con Windows SDK..."
    & $makeAppx pack /d $stage /p $salida /o
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $salida -PathType Leaf)) {
        throw "makeappx.exe no pudo crear el MSIX."
    }

    Write-Host "5/5 Verificando estructura del paquete..."
    $verificar = Join-Path $raiz "dist\msix-verify"
    if (Test-Path -LiteralPath $verificar) {
        Remove-Item -LiteralPath $verificar -Recurse -Force
    }
    & $makeAppx unpack /p $salida /d $verificar /o
    if ($LASTEXITCODE -ne 0 -or
        -not (Test-Path -LiteralPath (Join-Path $verificar "AppxManifest.xml")) -or
        -not (Test-Path -LiteralPath (Join-Path $verificar "Patagonia Browser.exe"))) {
        throw "La verificacion de integridad/estructura de MSIX fallo."
    }
    $hash = Get-FileHash -LiteralPath $salida -Algorithm SHA256
    Set-Content -LiteralPath "$salida.sha256" -Value "$($hash.Hash)  $nombre" -Encoding ASCII
    Write-Host "MSIX SIN FIRMA creado: $salida"
    Write-Host "SHA256: $($hash.Hash)"
    if ($Test) {
        Write-Warning "IDENTIDAD DE PRUEBA. No presentar este MSIX a Microsoft Store ni instalarlo sin firmarlo con un certificado de desarrollo confiable."
    } else {
        Write-Warning "MSIX SIN FIRMA. Verifica la identidad de Partner Center y envia el paquete para certificacion/firma de Microsoft Store."
    }
} finally {
    Pop-Location
}
