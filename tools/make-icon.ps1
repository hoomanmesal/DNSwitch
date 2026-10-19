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
  # background tile: graphite, top-lit (DESIGN.md surfaces)
  $bg = RR 0 0 $S $S ($S * 0.22)
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush ([System.Drawing.Point]::new(0, 0)), ([System.Drawing.Point]::new(0, $S)), ([System.Drawing.Color]::FromArgb(43, 49, 65)), ([System.Drawing.Color]::FromArgb(10, 12, 17))
  $g.FillPath($grad, $bg)
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(36, 255, 255, 255)), ([Math]::Max(1, $S * 0.012))
  $g.DrawPath($pen, (RR ($pen.Width / 2) ($pen.Width / 2) ($S - $pen.Width) ($S - $pen.Width) ($S * 0.22)))
  # ice toggle track
  $tw = $S * 0.64; $th = $S * 0.34; $tx = ($S - $tw) / 2; $ty = ($S - $th) / 2 + $S * 0.02
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 230, 240, 255))), (RR $tx $ty $tw $th ($th / 2)))
  # ink knob on the right (on state)
  $kd = $th * 0.72; $kx = $tx + $tw - $kd - ($th - $kd) / 2; $ky = $ty + ($th - $kd) / 2
  $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 13, 22, 38))), $kx, $ky, $kd, $kd)
  # green status LED at the left of the track
  $ld = $th * 0.26; $lx = $tx + ($th - $kd) / 2 + $th * 0.14; $ly = $ty + ($th - $ld) / 2
  $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 61, 220, 132))), $lx, $ly, $ld, $ld)
  # signal arcs above the toggle (DNS "channel")
  if ($S -ge 48) {
    $ap = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 77, 214, 230)), ($S * 0.028)
    $ap.StartCap = 'Round'; $ap.EndCap = 'Round'
    foreach ($r in 0.14, 0.22) {
      $cx = $S / 2; $cy = $ty - $S * 0.05; $rr = $S * $r
      $g.DrawArc($ap, $cx - $rr, $cy - $rr, $rr * 2, $rr * 2, 225, 90)
    }
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
