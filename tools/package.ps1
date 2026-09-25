# Builds the upload package for addons.mozilla.org: web-ext-artifacts\time-entry-<version>.zip
# Only runtime files are included, with manifest.json at the root and '/' path separators
# (Compress-Archive in Windows PowerShell writes '\' which AMO rejects).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$include = @('manifest.json', 'background.js', 'icons', 'lib', 'options', 'popup', 'shared', 'LICENSE')

$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
$outDir = Join-Path $root 'web-ext-artifacts'
New-Item -ItemType Directory -Force $outDir | Out-Null
$zipPath = Join-Path $outDir "time-entry-$($manifest.version).zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }

Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
  foreach ($item in $include) {
    $path = Join-Path $root $item
    if (-not (Test-Path $path)) { continue }
    $files = if ((Get-Item $path).PSIsContainer) { Get-ChildItem $path -Recurse -File } else { Get-Item $path }
    foreach ($f in $files) {
      $entry = $f.FullName.Substring($root.Length + 1).Replace('\', '/')
      [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, $entry, 'Optimal')
      "  + $entry"
    }
  }
} finally {
  $zip.Dispose()
}
"Created $zipPath ($([math]::Round((Get-Item $zipPath).Length / 1KB, 1)) KB)"
