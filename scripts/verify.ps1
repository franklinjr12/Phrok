param(
  [ValidateSet("Logic", "UI", "World", "Combat", "Data", "Full")]
  [string]$Scope = "Full"
)

$ErrorActionPreference = "Stop"

function Invoke-Check {
  param(
    [string]$Name,
    [string]$Command,
    [string[]]$Arguments
  )

  Write-Host "[$Scope] $Name"
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
}

switch ($Scope) {
  "Logic" {
    Invoke-Check "Typecheck" "npm.cmd" @("run", "typecheck")
    Invoke-Check "Logic tests" "npm.cmd" @("run", "test:logic")
  }
  "UI" {
    Invoke-Check "Typecheck" "npm.cmd" @("run", "typecheck")
    Invoke-Check "UI E2E tests" "npm.cmd" @("run", "test:e2e:ui")
  }
  "World" {
    Invoke-Check "Typecheck" "npm.cmd" @("run", "typecheck")
    Invoke-Check "World logic tests" "npx.cmd" @("vitest", "run", "src/game/map", "src/game/entities")
    Invoke-Check "World E2E tests" "npm.cmd" @("run", "test:e2e:world")
  }
  "Combat" {
    Invoke-Check "Typecheck" "npm.cmd" @("run", "typecheck")
    Invoke-Check "Combat logic tests" "npx.cmd" @("vitest", "run", "src/game/systems/combatFormulas.test.ts", "src/game/systems/enemySpawning.test.ts", "src/game/systems/lootDrops.test.ts", "src/game/systems/statusEffects.test.ts")
    Invoke-Check "Combat E2E tests" "npm.cmd" @("run", "test:e2e:combat")
  }
  "Data" {
    Invoke-Check "Typecheck" "npm.cmd" @("run", "typecheck")
    Invoke-Check "Data tools tests" "npm.cmd" @("run", "test:tools")
    Invoke-Check "Data tests" "npx.cmd" @("vitest", "run", "src/game/data")
  }
  "Full" {
    Invoke-Check "Production build" "npm.cmd" @("run", "build")
    Invoke-Check "Logic tests" "npm.cmd" @("run", "test:logic")
    Invoke-Check "E2E tests" "npm.cmd" @("run", "test:e2e")
  }
}
