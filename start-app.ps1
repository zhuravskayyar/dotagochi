param(
    [switch]$NoBrowser,
    [switch]$Game
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:Path = "$(Join-Path $projectRoot '.tools\bin');$env:Path"
$serverUrl = 'http://127.0.0.1:3001/api/health'
$clientUrl = 'http://127.0.0.1:5173'
$studioUrl = "$clientUrl/animation-studio"

function Update-ProjectFromGit {
    if (-not (Test-Path (Join-Path $projectRoot '.git'))) {
        return
    }

    Write-Host 'Checking GitHub for team updates...'
    $previousGitTerminalPrompt = $env:GIT_TERMINAL_PROMPT
    Push-Location $projectRoot
    try {
        $localChanges = & git status --porcelain 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Warning 'Git status failed. Starting the current local version.'
            return
        }
        if ($localChanges) {
            Write-Warning 'Local changes found. Automatic pull was skipped to protect your work.'
            return
        }

        $env:GIT_TERMINAL_PROMPT = '0'
        & git pull --ff-only origin main
        if ($LASTEXITCODE -ne 0) {
            Write-Warning 'Could not receive GitHub updates. Starting the current local version.'
        }
    }
    finally {
        if ($null -eq $previousGitTerminalPrompt) {
            Remove-Item Env:\GIT_TERMINAL_PROMPT -ErrorAction SilentlyContinue
        }
        else {
            $env:GIT_TERMINAL_PROMPT = $previousGitTerminalPrompt
        }
        Pop-Location
    }
}

Update-ProjectFromGit

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

$localCommit = (& git -C $projectRoot rev-parse --short HEAD 2>$null)
if (-not $localCommit) {
    $localCommit = 'unknown'
}
else {
    $localCommit = $localCommit.Trim()
}
$resolvedProjectRoot = (Resolve-Path $projectRoot).Path
$sha256 = [System.Security.Cryptography.SHA256]::Create()
try {
    $rootBytes = [System.Text.Encoding]::UTF8.GetBytes($resolvedProjectRoot)
    $hashBytes = $sha256.ComputeHash($rootBytes)
    $localInstance = -join ($hashBytes[0..7] | ForEach-Object { $_.ToString('x2') })
}
finally {
    $sha256.Dispose()
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

function Get-ServerMetadata {
    try {
        $metadata = Invoke-RestMethod -Uri $serverUrl -TimeoutSec 2
        if (
            $metadata.app -ne 'dota-tamagotchi' -or
            -not $metadata.instance -or
            -not $metadata.commit -or
            -not $metadata.pid
        ) {
            return $null
        }
        return $metadata
    }
    catch {
        return $null
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

if ($serverRunning) {
    $serverMetadata = Get-ServerMetadata
    if (-not $serverMetadata) {
        throw 'Port 3001 is occupied by an old or unknown server. Stop it once and run Studio again.'
    }
    if ($serverMetadata.instance -ne $localInstance) {
        throw 'Port 3001 is used by another Dota Tamagotchi project. Stop it before starting this copy.'
    }
    if ($serverMetadata.commit -ne $localCommit) {
        Write-Host 'Restarting the backend after a project update...'
        Stop-Process -Id ([int]$serverMetadata.pid) -ErrorAction Stop

        $restartDeadline = [DateTime]::UtcNow.AddSeconds(10)
        do {
            Start-Sleep -Milliseconds 500
            $serverRunning = Test-AppEndpoint -Url $serverUrl
            if (-not $serverRunning) {
                break
            }
            $serverMetadata = Get-ServerMetadata
            if (
                $serverMetadata -and
                $serverMetadata.instance -eq $localInstance -and
                $serverMetadata.commit -eq $localCommit
            ) {
                break
            }
        } while ([DateTime]::UtcNow -lt $restartDeadline)

        if ($serverRunning -and (
            -not $serverMetadata -or
            $serverMetadata.instance -ne $localInstance -or
            $serverMetadata.commit -ne $localCommit
        )) {
            throw 'The old backend did not stop or reload within 10 seconds.'
        }
    }
}

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
