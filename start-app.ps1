param(
    [switch]$NoBrowser,
    [switch]$Game
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverUrl = 'http://127.0.0.1:3001/api/health'
$clientUrl = 'http://127.0.0.1:5173'
$studioUrl = "$clientUrl/animation-studio"

Write-Host 'Checking and installing project dependencies...'
Push-Location $projectRoot
try {
    & npm.cmd install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed with exit code $LASTEXITCODE."
    }

    & npm.cmd run sync:animations
    if ($LASTEXITCODE -ne 0) {
        throw "Animation registry sync failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}

function Test-AppEndpoint {
    param([string]$Url)

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    }
    catch {
        return $false
    }
}

function Start-AppService {
    param(
        [string]$Script,
        [string]$Title
    )

    $command = "title $Title && npm run $Script"
    Start-Process -FilePath "$env:WINDIR\System32\cmd.exe" `
        -ArgumentList '/k', $command `
        -WorkingDirectory $projectRoot
}

$serverRunning = Test-AppEndpoint -Url $serverUrl
$clientRunning = Test-AppEndpoint -Url $clientUrl

if (-not $serverRunning) {
    Write-Host 'Starting backend...'
    Start-AppService -Script 'dev:server' -Title 'Dota Tamagotchi - Server'
}
else {
    Write-Host 'Backend is already running on port 3001.'
}

if (-not $clientRunning) {
    Write-Host 'Starting client...'
    Start-AppService -Script 'dev:client' -Title 'Dota Tamagotchi - Client'
}
else {
    Write-Host 'Client is already running on port 5173.'
}

$deadline = [DateTime]::UtcNow.AddSeconds(45)
do {
    $clientReady = Test-AppEndpoint -Url $clientUrl
    if ($clientReady) {
        break
    }

    Start-Sleep -Seconds 1
} while ([DateTime]::UtcNow -lt $deadline)

if (-not $clientReady) {
    Write-Error 'Client did not become available on port 5173 within 45 seconds.'
}

if (-not $NoBrowser) {
    $launchUrl = if ($Game) { $clientUrl } else { $studioUrl }
    Start-Process $launchUrl
}
