# serve.ps1 — local preview for the SLED Use Case Library app.
# Serves the app/ folder over http://localhost:8080 so fetch() can load the
# dummy CSV (file:// blocks fetch). Run from SLEDEdge/app/ or pass -Root.
#
#   pwsh ./serve.ps1            # serves the current folder on port 8080
#   pwsh ./serve.ps1 -Port 9090
#
# In the browser open: http://localhost:8080/  (serves index.html)
# The app auto-detects local mode and reads the seed JSON in data/.

param(
  [int]$Port = 8080,
  [string]$Root = $PSScriptRoot
)

Add-Type -AssemblyName System.Net.HttpListener -ErrorAction SilentlyContinue
$listener = [System.Net.HttpListener]::new()
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Serving '$Root' at $prefix" -ForegroundColor Green
Write-Host "Open: ${prefix}index.html   (Ctrl+C to stop)" -ForegroundColor Cyan

$mime = @{
  '.html'='text/html'; '.aspx'='text/html'; '.css'='text/css';
  '.js'='application/javascript'; '.json'='application/json';
  '.csv'='text/csv'; '.png'='image/png'; '.svg'='image/svg+xml'
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
    $path = Join-Path $Root $rel
    if (Test-Path $path -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($path)
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404: $rel")
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.Close()
  }
} finally {
  $listener.Stop()
}
