# =============================================================================
# Aksel Tools — Bootstrap Script
# Run this script ONCE from PowerShell inside E:\App Aksel
# Usage: .\bootstrap.ps1
# =============================================================================

Write-Host "=== Aksel Tools Bootstrap ===" -ForegroundColor Red

# Step 1: Scaffold Next.js (skip if package.json already exists)
if (-Not (Test-Path "package.json")) {
    Write-Host "[1/4] Scaffolding Next.js 14 app..." -ForegroundColor Yellow
    npx create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --yes
} else {
    Write-Host "[1/4] package.json found, skipping scaffold." -ForegroundColor Green
}

# Step 2: Install extra dependencies
Write-Host "[2/4] Installing extra dependencies..." -ForegroundColor Yellow
npm install @supabase/supabase-js @supabase/ssr iron-session bcryptjs lucide-react clsx tailwind-merge date-fns

# Step 3: Install type definitions
Write-Host "[3/4] Installing type definitions..." -ForegroundColor Yellow
npm install -D @types/bcryptjs

# Step 4: Initialize shadcn/ui
Write-Host "[4/4] Initializing shadcn/ui (select: New York style, CSS variables ON)..." -ForegroundColor Yellow
npx shadcn@latest init --yes --base-color zinc --style new-york --css-variables true

# Step 5: Add shadcn components
Write-Host "[5/5] Adding shadcn components..." -ForegroundColor Yellow
npx shadcn@latest add button input label table badge dialog select form card toaster tabs separator avatar dropdown-menu --yes

Write-Host ""
Write-Host "=== Bootstrap Complete! ===" -ForegroundColor Green
Write-Host "Run 'npm run dev' to start the development server." -ForegroundColor Cyan
