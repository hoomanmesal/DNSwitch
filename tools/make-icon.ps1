Add-Type -AssemblyName System.Drawing
$out = Join-Path $PSScriptRoot '..\assets'
New-Item -ItemType Directory -Force $out | Out-Null

function New-Icon([int]$S) {
  $bmp = New-Object System.Drawing.Bitmap $S, $S
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.Clear([System.Drawing.Color]::Transparent)

  function RR($x, $y, $w, $h, $r) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $p.AddArc($x, $y, $d, $d, 180, 90); $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90); $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $p.CloseFigure(); $p
  }
  # background tile
  $bg = RR 0 0 $S $S ($S * 0.22)
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush ([System.Drawing.Point]::new(0, 0)), ([System.Drawing.Point]::new($S, $S)), ([System.Drawing.Color]::FromArgb(91, 140, 255)), ([System.Drawing.Color]::FromArgb(53, 208, 186))
  $g.FillPath($grad, $bg)
  # toggle track
  $tw = $S * 0.66; $th = $S * 0.34; $tx = ($S - $tw) / 2; $ty = ($S - $th) / 2
  $track = RR $tx $ty $tw $th ($th / 2)
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(235, 255, 255, 255))), $track)
  # knob (right = on)
  $kd = $th * 0.74; $kx = $tx + $tw - $kd - ($th - $kd) / 2; $ky = $ty + ($th - $kd) / 2
  $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 30, 60, 140))), $kx, $ky, $kd, $kd)
  # DNS dots on the left of the track
  $dd = $th * 0.14
  foreach ($i in 0..2) {
    $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 91, 140, 255))), $tx + $th * 0.3 + $i * $dd * 2.2, $ty + ($th - $dd) / 2, $dd, $dd)
  }
  $g.Dispose(); $bmp
}

$sizes = 16, 32, 48, 64, 128, 256
$pngs = @{}
foreach ($s in $sizes) {
  $b = New-Icon $s
  $ms = New-Object System.IO.MemoryStream
  $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $pngs[$s] = $ms.ToArray()
  if ($s -eq 256) { $b.Save((Join-Path $out 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png) }
  $b.Dispose()
}

# ICO container with embedded PNGs
$fs = [System.IO.File]::Create((Join-Path $out 'icon.ico'))
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
foreach ($s in $sizes) {
  $dim = if ($s -ge 256) { 0 } else { $s }
  $bw.Write([byte]$dim); $bw.Write([byte]$dim); $bw.Write([byte]0); $bw.Write([byte]0)
  $bw.Write([uint16]1); $bw.Write([uint16]32); $bw.Write([uint32]$pngs[$s].Length); $bw.Write([uint32]$offset)
  $offset += $pngs[$s].Length
}
foreach ($s in $sizes) { $bw.Write($pngs[$s]) }
$bw.Close(); $fs.Close()
Write-Output 'icon generated'
