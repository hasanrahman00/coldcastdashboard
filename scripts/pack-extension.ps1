<#
  pack-extension.ps1
  ------------------------------------------------------------------------------
  Build the hosted Chrome-extension zip from the SINGLE SOURCE OF TRUTH
  (your cold-cast-extension repo) and drop it into this dashboard's /public
  folder as coldcast-extension.zip.

  The zip is FLAT (manifest.json at the root, forward-slash paths) so it extracts
  to one clean folder - no GitHub "-main" wrapper, no double-nesting. Everything
  in the source is included EXCEPT vcs/build junk, so a folder you add later
  (e.g. a new provider ruleset) is packaged automatically - it can't go stale.

  USAGE (from the dashboard repo root):
      powershell -ExecutionPolicy Bypass -File scripts\pack-extension.ps1
      powershell -ExecutionPolicy Bypass -File scripts\pack-extension.ps1 -Source "D:\path\cold-cast-extension"

  THEN ship it:
      git add public/coldcast-extension.zip
      git commit -m "ext vX.Y.Z"
      git push
  ------------------------------------------------------------------------------
#>
param(
    [string]$Source = "C:\Users\Hassan\Desktop\cold-cast-extension"
)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path (Join-Path $Source 'manifest.json'))) {
    throw ("No manifest.json found in '{0}' - pass the right folder with -Source." -f $Source)
}

$publicDir = (Resolve-Path (Join-Path $PSScriptRoot '..\public')).Path
$zipPath   = Join-Path $publicDir 'coldcast-extension.zip'

# Stage: copy EVERYTHING except vcs/build junk (blacklist, so new folders auto-include)
$exclude = @('.git', '_metadata', 'node_modules', '.gitignore', 'dist', '.DS_Store', 'Thumbs.db')
$stage = Join-Path $env:TEMP ("cc-ext-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage -Force | Out-Null
Get-ChildItem -Force $Source |
    Where-Object { $exclude -notcontains $_.Name -and $_.Extension -ne '.zip' } |
    ForEach-Object { Copy-Item $_.FullName -Destination $stage -Recurse -Force }

# Harden the STAGED copy (never the source): strip comments/whitespace from JS +
# scrub the manifest so the shipped extension does not self-document how it works.
# Fail-safe — if the hardener errors (e.g. esbuild missing) we WARN and ship the
# staged copy as-is, so packing can never break.
try {
    & node (Join-Path $PSScriptRoot 'harden-ext.mjs') $stage
    if ($LASTEXITCODE -ne 0) { Write-Warning ("harden-ext exited {0} - shipping un-hardened stage" -f $LASTEXITCODE) }
} catch {
    Write-Warning ("harden-ext failed: {0} - shipping un-hardened stage" -f $_.Exception.Message)
}

# Self-explanatory install note inside the zip
$installTxt = @"
COLDCAST EXTENSION - INSTALL (2 minutes)
=========================================

STEP 1 - Extract this ZIP
  Right-click the ZIP  ->  "Extract All..."  ->  Extract.
  You now have a folder called "coldcast-extension" with manifest.json inside it.

STEP 2 - Open Chrome's extensions page
  In Chrome, go to:  chrome://extensions

STEP 3 - Turn on Developer mode
  Toggle "Developer mode" ON (top-right corner).

STEP 4 - Load it
  Click "Load unpacked"  ->  select the "coldcast-extension" folder
  (the one that has manifest.json directly inside it)  ->  Select Folder.

DONE. The Coldcast icon appears in your toolbar.
Keep the folder where it is - deleting it removes the extension from Chrome.
"@
Set-Content -Path (Join-Path $stage 'INSTALL.txt') -Value $installTxt -Encoding UTF8

# Flat, forward-slash zip written straight into /public (overwrite, no delete step)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$fs = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    $bs = [char]92
    $base = (Resolve-Path $stage).Path.TrimEnd($bs) + $bs
    Get-ChildItem -Path $stage -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($base.Length).Replace($bs, '/')
        $entry = $archive.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
        # Pin entry mtime to the source file's mtime so rebuilding unchanged
        # source yields an identical zip (no noisy git diffs every run).
        $entry.LastWriteTime = $_.LastWriteTime
        $es = $entry.Open()
        $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
        $es.Write($bytes, 0, $bytes.Length)
        $es.Close()
    }
} finally {
    $archive.Dispose(); $fs.Close()
}
try { Remove-Item $stage -Recurse -Force } catch { }

$ver = (Get-Content (Join-Path $Source 'manifest.json') -Raw | ConvertFrom-Json).version
$kb  = [math]::Round((Get-Item $zipPath).Length / 1KB, 1)
Write-Host ""
Write-Host ("  OK  packed extension v{0}  ->  public/coldcast-extension.zip  ({1} KB)" -f $ver, $kb) -ForegroundColor Green
Write-Host ("  Next:  git add public/coldcast-extension.zip; git commit -m ""ext v{0}""; git push" -f $ver) -ForegroundColor Cyan
Write-Host ""
