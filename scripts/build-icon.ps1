param(
    [string]$Source = (Join-Path $PSScriptRoot "..\assets\patagonia-icon-oficial.png"),
    [string]$PngOutput = (Join-Path $PSScriptRoot "..\assets\patagonia-icon.png"),
    [string]$IcoOutput = (Join-Path $PSScriptRoot "..\assets\patagonia-oficial.ico")
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $Source))

function New-SquarePngBytes([int]$Size) {
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $stream = New-Object System.IO.MemoryStream
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

        $crop = [Math]::Min($sourceImage.Width, $sourceImage.Height)
        $sourceX = [int](($sourceImage.Width - $crop) / 2)
        $sourceY = [int](($sourceImage.Height - $crop) / 2)
        $destination = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
        $graphics.DrawImage(
            $sourceImage,
            $destination,
            $sourceX,
            $sourceY,
            $crop,
            $crop,
            [System.Drawing.GraphicsUnit]::Pixel
        )

        $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
        return [byte[]]$stream.ToArray()
    }
    finally {
        $stream.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

try {
    [System.IO.File]::WriteAllBytes($PngOutput, [byte[]](New-SquarePngBytes 512))

    $sizes = @(16, 20, 24, 32, 40, 48, 64, 128, 256)
    $images = @($sizes | ForEach-Object {
        [pscustomobject]@{
            Size = $_
            Bytes = [byte[]](New-SquarePngBytes $_)
        }
    })

    $stream = New-Object System.IO.MemoryStream
    $writer = New-Object System.IO.BinaryWriter($stream)
    try {
        $writer.Write([uint16]0)
        $writer.Write([uint16]1)
        $writer.Write([uint16]$images.Count)

        $offset = 6 + (16 * $images.Count)
        foreach ($image in $images) {
            $dimension = if ($image.Size -eq 256) { 0 } else { $image.Size }
            $writer.Write([byte]$dimension)
            $writer.Write([byte]$dimension)
            $writer.Write([byte]0)
            $writer.Write([byte]0)
            $writer.Write([uint16]1)
            $writer.Write([uint16]32)
            $writer.Write([uint32]$image.Bytes.Length)
            $writer.Write([uint32]$offset)
            $offset += $image.Bytes.Length
        }

        foreach ($image in $images) {
            $writer.Write([byte[]]$image.Bytes)
        }
        $writer.Flush()
        [System.IO.File]::WriteAllBytes($IcoOutput, $stream.ToArray())
    }
    finally {
        $writer.Dispose()
        $stream.Dispose()
    }
}
finally {
    $sourceImage.Dispose()
}

Write-Output "Icono oficial generado en 16, 20, 24, 32, 40, 48, 64, 128 y 256 px."
