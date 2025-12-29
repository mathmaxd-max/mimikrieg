# Deployment Guide

This repository tracks all files locally, but only deploys website files to GitHub.

## Setup

1. **Track everything locally** (already done):
   - All files including Python scripts are tracked in the `main` branch
   - This gives you full version control for development

2. **Deploy only website files**:
   - Use the `deploy` branch which contains only the website files
   - Push only this branch to GitHub for hosting

## Deployment Process

### Option 1: Using the PowerShell script (Windows)
```powershell
.\deploy.ps1
git push origin deploy
```

### Option 2: Manual process
```bash
# Create/switch to deploy branch
git checkout -b deploy

# Remove all files
git rm -rf --cached .

# Add only website files
git add genres.json index.html Logo.webp script.js style.css wordbase.tsv .gitignore

# Commit
git commit -m "Deploy: Update website files"

# Push to GitHub
git push origin deploy

# Return to main branch
git checkout main
```

## Website Files
- `genres.json`
- `index.html`
- `Logo.webp`
- `script.js`
- `style.css`
- `wordbase.tsv`
- `.gitignore`

## GitHub Pages Setup

If using GitHub Pages:
1. Go to repository Settings → Pages
2. Set source to `deploy` branch
3. Your site will be hosted from the `deploy` branch only

## Workflow

1. **Development**: Work on `main` branch with all files
2. **Deploy**: Run `deploy.ps1` to update the `deploy` branch
3. **Push**: `git push origin deploy` to update the live site

