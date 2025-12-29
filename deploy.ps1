# Deployment script for GitHub Pages
# This script creates/updates a 'deploy' branch with only website files

# Website files to include
$websiteFiles = @(
    "genres.json",
    "index.html",
    "Logo.webp",
    "script.js",
    "style.css",
    "wordbase.tsv",
    ".gitignore"
)

Write-Host "Creating deployment branch with only website files..." -ForegroundColor Cyan

# Get current branch name
$currentBranch = git branch --show-current

# Create or checkout deploy branch
git checkout -b deploy 2>$null
if ($LASTEXITCODE -ne 0) {
    git checkout deploy
}

# Remove all files first
git rm -rf --cached . 2>$null

# Add only website files
foreach ($file in $websiteFiles) {
    if (Test-Path $file) {
        git add $file
        Write-Host "  Added: $file" -ForegroundColor Green
    } else {
        Write-Host "  Warning: $file not found" -ForegroundColor Yellow
    }
}

# Commit changes
git commit -m "Deploy: Update website files only" 2>$null

Write-Host "`nDeployment branch ready!" -ForegroundColor Green
Write-Host "To push to GitHub: git push origin deploy" -ForegroundColor Cyan
Write-Host "To return to main: git checkout $currentBranch" -ForegroundColor Cyan

