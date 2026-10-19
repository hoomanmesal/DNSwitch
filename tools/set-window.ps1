param([int]$W, [int]$H)
Add-Type @"
using System; using System.Runtime.InteropServices;
public class W32 {
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int ht, bool r);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr h);
  public struct RECT { public int L, T, R, B; }
}
"@
$p = Get-Process electron,DNSwitch* -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { Write-Output 'NOWINDOW'; exit 1 }
$hwnd = $p.MainWindowHandle
[W32]::ShowWindow($hwnd, 1) | Out-Null
if ($W -gt 0) { [W32]::MoveWindow($hwnd, 20, 20, $W, $H, $true) | Out-Null }
Start-Sleep -Milliseconds 400
$r = New-Object W32+RECT; [W32]::GetWindowRect($hwnd, [ref]$r) | Out-Null
Write-Output ("{0}x{1} dpi={2}" -f ($r.R - $r.L), ($r.B - $r.T), [W32]::GetDpiForWindow($hwnd))
