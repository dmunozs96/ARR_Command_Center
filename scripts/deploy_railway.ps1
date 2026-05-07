param(
    [ValidateSet("frontend", "backend")]
    [string]$Service = "frontend",
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if ($Service -eq "frontend") {
    $railwayService = "frontend-web"
    $deployPath = "app/frontend"
    if (-not $Message) {
        $Message = "Deploy frontend"
    }
} else {
    $railwayService = "backend-api"
    $deployPath = "."
    if (-not $Message) {
        $Message = "Deploy backend"
    }
}

Push-Location $repoRoot
try {
    if ($Service -eq "frontend") {
        railway.cmd up $deployPath --path-as-root --service $railwayService --environment production --message $Message
    } else {
        railway.cmd up --service $railwayService --environment production --message $Message
    }
} finally {
    Pop-Location
}
