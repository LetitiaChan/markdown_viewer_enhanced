# pack.ps1 — Markdown Viewer Enhanced 打包脚本 (PowerShell 版)
# 通过临时目录 + Compress-Archive 保留目录结构

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

# 读取版本号
$manifest = Get-Content "$root\manifest.json" -Raw | ConvertFrom-Json
$version = $manifest.version
$zipName = "markdown_viewer_enhanced-v$version.zip"
$zipPath = Join-Path $root $zipName

Write-Host "Pack v$version ..." -ForegroundColor Cyan

# 删除旧 zip
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
    Write-Host "  Removed old $zipName" -ForegroundColor Yellow
}

# 解析 .packignore
$rules = Get-Content "$root\.packignore" | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') }
$excludeDirs = @()
$excludeFiles = @()
$excludePatterns = @()

foreach ($rule in $rules) {
    if ($rule.EndsWith('/')) {
        $excludeDirs += $rule.TrimEnd('/')
    } elseif ($rule.Contains('*')) {
        $excludePatterns += $rule
    } else {
        $excludeFiles += $rule
    }
}

# 创建临时目录
$tmpDir = Join-Path $env:TEMP "mve_pack_$(Get-Random)"
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null

# 收集并复制文件到临时目录（保留目录结构）
$count = 0
$allFiles = Get-ChildItem -Path $root -Recurse -File

foreach ($f in $allFiles) {
    $rel = $f.FullName.Substring($root.Length + 1).Replace('\', '/')
    $skip = $false

    # 排除隐藏文件/目录
    foreach ($part in $rel.Split('/')) {
        if ($part.StartsWith('.')) { $skip = $true; break }
    }
    if ($skip) { continue }

    # 排除目录
    foreach ($d in $excludeDirs) {
        if ($rel -like "$d/*" -or $rel -eq $d) { $skip = $true; break }
    }
    if ($skip) { continue }

    # 排除具体文件
    foreach ($ef in $excludeFiles) {
        if ($rel -eq $ef) { $skip = $true; break }
    }
    if ($skip) { continue }

    # 排除通配符模式
    foreach ($p in $excludePatterns) {
        if ($rel -like $p -or $f.Name -like $p) { $skip = $true; break }
    }
    if ($skip) { continue }

    # 复制到临时目录
    $destPath = Join-Path $tmpDir $rel.Replace('/', '\')
    $destDir = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Copy-Item $f.FullName $destPath
    $count++
}

# 打包
Compress-Archive -Path "$tmpDir\*" -DestinationPath $zipPath -Force

# 清理临时目录
Remove-Item $tmpDir -Recurse -Force

# 报告
$info = Get-Item $zipPath
Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Write-Host "  File:  $zipName" -ForegroundColor Green
Write-Host "  Size:  $([math]::Round($info.Length/1KB)) KB" -ForegroundColor Green
Write-Host "  Files: $count" -ForegroundColor Green