# ════════════════════════════════════════════════════════════════════════════════
# Buscador JSON - Environment Validation Script (Windows PowerShell)
# ════════════════════════════════════════════════════════════════════════════════
# Validates environment variables and system requirements before deployment

param(
    [switch]$Verbose = $false
)

# ─── Initialization ─────────────────────────────────────────────────────────

$script:Success = 0
$script:Warnings = 0
$script:Errors = 0

# ─── Helper Functions ───────────────────────────────────────────────────────

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
    $script:Success++
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
    $script:Errors++
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
    $script:Warnings++
}

function Write-Info {
    param([string]$Message)
    Write-Host "→ $Message" -ForegroundColor Cyan
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "═══ $Title ═══" -ForegroundColor Cyan -BackgroundColor Black
    Write-Host ""
}

function Write-Summary {
    Write-Host ""
    Write-Host "═════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "Validation Summary" -ForegroundColor Cyan
    Write-Host "═════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "✓ Passed: $($script:Success)" -ForegroundColor Green
    Write-Host "⚠ Warnings: $($script:Warnings)" -ForegroundColor Yellow
    Write-Host "✗ Errors: $($script:Errors)" -ForegroundColor Red
    Write-Host "═════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

# ─── Load Environment Variables ─────────────────────────────────────────────

function Load-EnvFile {
    if (Test-Path ".env") {
        $env:DOTENV_LOADED = $true
        Get-Content .env | ForEach-Object {
            if ($_ -match "^([^=]+)=(.*)$") {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                if (-not [string]::IsNullOrEmpty($name)) {
                    Set-Item -Path "env:$name" -Value $value -ErrorAction SilentlyContinue
                }
            }
        }
    }
}

# ─── Validation Functions ───────────────────────────────────────────────────

function Test-EnvFile {
    Write-Section "Environment File"
    
    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.example") {
            Write-Warning-Custom ".env not found, using .env.example as template"
            Copy-Item ".env.example" ".env"
            Write-Success "Created .env from .env.example"
        } else {
            Write-Error-Custom ".env file not found and .env.example not available"
            return $false
        }
    } else {
        Write-Success ".env file exists"
    }
    
    return $true
}

function Test-EnvVariables {
    Write-Section "Required Environment Variables"
    
    Load-EnvFile
    
    $requiredVars = @(
        "NEXT_PUBLIC_API_URL",
        "NODE_ENV",
        "FLASK_ENV",
        "ALLOWED_ORIGINS",
        "MAX_UPLOAD_SIZE",
        "DATABASE_URL",
        "UPLOAD_DIR"
    )
    
    foreach ($var in $requiredVars) {
        $value = Get-Item -Path "env:$var" -ErrorAction SilentlyContinue
        if ([string]::IsNullOrEmpty($value.Value)) {
            Write-Error-Custom "Missing required variable: $var"
        } else {
            Write-Success "$var is set: $($value.Value)"
        }
    }
}

function Test-Ports {
    Write-Section "Port Availability"
    
    $ports = @(3000, 4000, 8080)
    
    foreach ($port in $ports) {
        $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Warning-Custom "Port $port is already in use"
        } else {
            Write-Success "Port $port is available"
        }
    }
}

function Test-Directories {
    Write-Section "Directory Structure"
    
    $dirs = @("uploads", "data", "node_modules", "public", "app")
    
    foreach ($dir in $dirs) {
        if (Test-Path $dir) {
            Write-Success "Directory exists: $dir"
        } else {
            if ($dir -in @("uploads", "data", "node_modules")) {
                Write-Warning-Custom "Directory not found (will be created): $dir"
                New-Item -ItemType Directory -Path $dir -ErrorAction SilentlyContinue | Out-Null
            } else {
                Write-Error-Custom "Required directory not found: $dir"
            }
        }
    }
}

function Test-Files {
    Write-Section "Required Files"
    
    $files = @(
        "package.json",
        "tsconfig.json",
        "next.config.mjs",
        "tailwind.config.cjs",
        "requirements.txt",
        "server_api.py",
        "docker-compose.yml",
        "Dockerfile.frontend",
        "Dockerfile.backend"
    )
    
    foreach ($file in $files) {
        if (Test-Path $file) {
            Write-Success "File exists: $file"
        } else {
            Write-Error-Custom "Required file not found: $file"
        }
    }
}

function Test-NodeVersion {
    Write-Section "Node.js & npm"
    
    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($node) {
        $nodeVersion = & node --version
        Write-Success "Node.js installed: $nodeVersion"
        
        # Check version is 16+
        $majorVersion = [int]$nodeVersion.Substring(1).Split('.')[0]
        if ($majorVersion -lt 16) {
            Write-Warning-Custom "Node.js version $majorVersion is older than recommended (16+)"
        }
    } else {
        Write-Error-Custom "Node.js is not installed"
    }
    
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($npm) {
        $npmVersion = & npm --version
        Write-Success "npm installed: $npmVersion"
    } else {
        Write-Error-Custom "npm is not installed"
    }
    
    $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
    if ($pnpm) {
        $pnpmVersion = & pnpm --version
        Write-Success "pnpm installed: $pnpmVersion"
    } else {
        Write-Warning-Custom "pnpm is not installed (required for dependencies)"
    }
}

function Test-PythonVersion {
    Write-Section "Python"
    
    $python3 = Get-Command python3 -ErrorAction SilentlyContinue
    if ($python3) {
        $pythonVersion = & python3 --version
        Write-Success "Python3 installed: $pythonVersion"
    } else {
        $python = Get-Command python -ErrorAction SilentlyContinue
        if ($python) {
            $pythonVersion = & python --version
            Write-Success "Python installed: $pythonVersion"
        } else {
            Write-Error-Custom "Python is not installed"
        }
    }
}

function Test-Dependencies {
    Write-Section "Node Dependencies"
    
    if (Test-Path "node_modules") {
        Write-Success "node_modules directory exists"
        
        if ((Test-Path "package-lock.json") -or (Test-Path "pnpm-lock.yaml")) {
            Write-Success "Lock file exists (pnpm-lock.yaml or package-lock.json)"
        } else {
            Write-Warning-Custom "Lock file not found - dependencies may be inconsistent"
        }
    } else {
        Write-Warning-Custom "node_modules not found - run 'pnpm install' or 'npm install'"
    }
    
    Write-Section "Python Dependencies"
    
    if (Test-Path "requirements.txt") {
        Write-Success "requirements.txt exists"
        
        $pip = Get-Command pip3 -ErrorAction SilentlyContinue
        if ($pip) {
            $requiredPackages = @("flask", "flask-cors", "python-dotenv")
            foreach ($pkg in $requiredPackages) {
                try {
                    $output = & pip3 show $pkg 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        Write-Success "Python package installed: $pkg"
                    } else {
                        Write-Warning-Custom "Python package not installed: $pkg"
                    }
                } catch {
                    Write-Warning-Custom "Python package not installed: $pkg"
                }
            }
        } else {
            Write-Warning-Custom "pip3 not found - cannot check Python packages"
        }
    } else {
        Write-Error-Custom "requirements.txt not found"
    }
}

function Test-Docker {
    Write-Section "Docker"
    
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    if ($docker) {
        $dockerVersion = & docker --version
        Write-Success "Docker installed: $dockerVersion"
    } else {
        Write-Error-Custom "Docker is not installed"
        return
    }
    
    $dockerCompose = Get-Command docker-compose -ErrorAction SilentlyContinue
    if ($dockerCompose) {
        $composeVersion = & docker-compose --version
        Write-Success "Docker Compose installed: $composeVersion"
    } else {
        Write-Warning-Custom "Docker Compose is not installed (may be integrated with Docker)"
    }
    
    try {
        $psOutput = & docker ps 2>&1
        Write-Success "Docker daemon is running"
    } catch {
        Write-Error-Custom "Docker daemon is not running"
    }
}

function Test-Configuration {
    Write-Section "Configuration Values"
    
    Load-EnvFile
    
    $apiUrl = Get-Item -Path "env:NEXT_PUBLIC_API_URL" -ErrorAction SilentlyContinue
    if ($apiUrl) {
        if ($apiUrl.Value -match "^https?://") {
            Write-Success "API URL: $($apiUrl.Value)"
        } else {
            Write-Error-Custom "Invalid API URL format: $($apiUrl.Value)"
        }
    }
    
    $nodeEnv = Get-Item -Path "env:NODE_ENV" -ErrorAction SilentlyContinue
    if ($nodeEnv) {
        if ($nodeEnv.Value -in @("production", "development")) {
            Write-Success "NODE_ENV is set to: $($nodeEnv.Value)"
        } else {
            Write-Warning-Custom "NODE_ENV has unusual value: $($nodeEnv.Value)"
        }
    }
    
    $flaskEnv = Get-Item -Path "env:FLASK_ENV" -ErrorAction SilentlyContinue
    if ($flaskEnv) {
        if ($flaskEnv.Value -in @("production", "development")) {
            Write-Success "FLASK_ENV is set to: $($flaskEnv.Value)"
        } else {
            Write-Warning-Custom "FLASK_ENV has unusual value: $($flaskEnv.Value)"
        }
    }
    
    $uploadSize = Get-Item -Path "env:MAX_UPLOAD_SIZE" -ErrorAction SilentlyContinue
    if ($uploadSize) {
        [long]$sizeBytes = $uploadSize.Value
        $sizeMb = [math]::Round($sizeBytes / 1048576)
        Write-Success "MAX_UPLOAD_SIZE: ${sizeMb}MB"
        
        if ($sizeMb -gt 500) {
            Write-Warning-Custom "MAX_UPLOAD_SIZE is very large (${sizeMb}MB) - ensure sufficient memory"
        }
    }
}

function Test-DiskSpace {
    Write-Section "Disk Space"
    
    try {
        $drive = Get-PSDrive -Name ((Get-Location).Drive.Name)
        $availableGB = [math]::Round($drive.Free / 1GB)
        
        if ($availableGB -lt 10) {
            Write-Warning-Custom "Limited disk space available: ${availableGB}GB (recommended: 10GB+)"
        } else {
            Write-Success "Sufficient disk space available: ${availableGB}GB"
        }
    } catch {
        Write-Warning-Custom "Cannot check disk space"
    }
}

# ─── Main Execution ────────────────────────────────────────────────────────

Write-Host ""
Write-Host "╔═════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Buscador JSON - Environment Validator     ║" -ForegroundColor Cyan
Write-Host "╚═════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Test-EnvFile
Test-EnvVariables
Test-Ports
Test-Directories
Test-Files
Test-NodeVersion
Test-PythonVersion
Test-Dependencies
Test-Docker
Test-Configuration
Test-DiskSpace

Write-Summary

if ($script:Errors -gt 0) {
    Write-Host "Critical errors found. Please fix before proceeding." -ForegroundColor Red
    exit 1
}

if ($script:Warnings -gt 0) {
    Write-Host "Warnings found. Review before deployment." -ForegroundColor Yellow
    exit 0
}

Write-Host "✓ All validations passed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run: pnpm install (or npm install)" -ForegroundColor Cyan
Write-Host "  2. Run: pip3 install -r requirements.txt" -ForegroundColor Cyan
Write-Host "  3. Run: docker-compose build" -ForegroundColor Cyan
Write-Host "  4. Run: docker-compose up -d" -ForegroundColor Cyan
Write-Host ""

exit 0
