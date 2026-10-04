$ErrorActionPreference = "Stop"

$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repo

Write-Host ""
Write-Host "========================================="
Write-Host " SHORTSAI GITHUB AUTO START"
Write-Host "========================================="

if (-not (Test-Path ".git")) {
    throw "Git repository not found: $repo"
}

# Runtime/private files are intentionally ignored by Git and remain local.
git fetch origin main
if ($LASTEXITCODE -ne 0) { throw "git fetch failed" }

$current = (git branch --show-current).Trim()
if ($current -ne "main") {
    Write-Host "[AUTO UPDATE] Switching to main"
    git checkout main
    if ($LASTEXITCODE -ne 0) { throw "git checkout main failed" }
}

$local = (git rev-parse HEAD).Trim()
$remote = (git rev-parse origin/main).Trim()

if ($local -ne $remote) {
    Write-Host "[AUTO UPDATE] New GitHub main detected"
    git reset --hard origin/main
    if ($LASTEXITCODE -ne 0) { throw "git update failed" }
    Write-Host "[AUTO UPDATE] COMPLETE : $remote"
} else {
    Write-Host "[AUTO UPDATE] ALREADY LATEST : $local"
}

Write-Host "[SHORTSAI] START"
npm start
