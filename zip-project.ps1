# zip-project.ps1
# PowerShell 5.1 기본 내장 Compress-Archive 사용.
# 외부 .NET 어셈블리 의존 없음.
# VS Code task 호출: -ProjectRoot "${workspaceFolder}"
# 터미널 직접 실행: powershell.exe -ExecutionPolicy Bypass -File .\zip-project.ps1 -ProjectRoot (Get-Location).Path

param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot
)

$ProjectRoot = $ProjectRoot.TrimEnd('\', '/')

if (-not (Test-Path $ProjectRoot -PathType Container)) {
    Write-Error "폴더를 찾을 수 없습니다: $ProjectRoot"
    exit 1
}

$projectName = Split-Path -Leaf $ProjectRoot
$timestamp   = Get-Date -Format "yyyyMMdd_HHmmss"
$outputZip   = Join-Path $ProjectRoot "${projectName}_${timestamp}.zip"
$tempDir     = Join-Path $env:TEMP "zip_${timestamp}"

$excludeNames = @("node_modules", ".git", ".venv", "__pycache__", "dist", ".next")

try {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    Get-ChildItem -Path $ProjectRoot -Recurse -File | Where-Object {
        $skip = $false
        foreach ($ex in $excludeNames) {
            if ($_.FullName -like "*\$ex\*") { $skip = $true; break }
        }
        if ($_.Extension -eq ".zip") { $skip = $true }
        -not $skip
    } | ForEach-Object {
        $relative = $_.FullName.Substring($ProjectRoot.Length + 1)
        $dest     = Join-Path $tempDir $relative
        $destDir  = Split-Path $dest -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item -Path $_.FullName -Destination $dest -Force
    }

    $copiedCount = (Get-ChildItem -Path $tempDir -Recurse -File).Count
    if ($copiedCount -eq 0) {
        Write-Error "복사된 파일이 없습니다."
        exit 1
    }

    Compress-Archive -Path "$tempDir\*" -DestinationPath $outputZip -CompressionLevel Optimal

    $sizeMB = [math]::Round((Get-Item $outputZip).Length / 1MB, 2)
    Write-Host "OK  $outputZip ($sizeMB MB, $copiedCount files)" -ForegroundColor Green

} catch {
    if (Test-Path $outputZip) { Remove-Item $outputZip -Force -ErrorAction SilentlyContinue }
    Write-Error "zip 생성 실패: $_"
    exit 1

} finally {
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
}

