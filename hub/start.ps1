# AICart Hub Startup Script
# PowerShell script for Windows

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AICart Hub Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "[1/4] Checking Docker status..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
    Write-Host "      [OK] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "      [FAIL] Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Start database services
Write-Host "[2/4] Starting PostgreSQL and Redis..." -ForegroundColor Yellow
docker-compose up -d postgres redis
if ($LASTEXITCODE -ne 0) {
    Write-Host "      [FAIL] Failed to start databases" -ForegroundColor Red
    exit 1
}
Write-Host "      [OK] Database services started" -ForegroundColor Green

# Wait for database
Write-Host "[3/4] Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check database connection
$maxRetries = 10
$retry = 0
$dbReady = $false
while ($retry -lt $maxRetries) {
    try {
        $pgCheck = docker exec aicart-postgres pg_isready -U aicart 2>&1
        if ($pgCheck -match "accepting connections") {
            Write-Host "      [OK] PostgreSQL is ready" -ForegroundColor Green
            $dbReady = $true
            break
        }
    } catch {
        # Continue retrying
    }
    
    $retry++
    if ($retry -ge $maxRetries) {
        break
    }
    Start-Sleep -Seconds 2
}

if (-not $dbReady) {
    Write-Host "      [FAIL] Database connection timeout" -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
Write-Host "[4/4] Checking Node.js dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "      -> Installing dependencies for the first time..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "      [FAIL] Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}
Write-Host "      [OK] Dependencies ready" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All services are ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting Hub service..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan
Write-Host "  - Hub API:    http://localhost:8080" -ForegroundColor White
Write-Host "  - Health:     http://localhost:8080/health" -ForegroundColor White
Write-Host "  - PostgreSQL: localhost:5432" -ForegroundColor White
Write-Host "  - Redis:      localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start Hub service
npm run dev