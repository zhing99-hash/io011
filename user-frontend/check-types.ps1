# Check TypeScript types
cd "C:\Users\Administrator\.openclaw\workspace\github-repo\user-frontend"

# Test compile only api files
$npx = "npx"

# Run tsc on project but exclude problem file
& $npx tsc --noEmit --project tsconfig.app.json --skipLibCheck 2>&1 | Where-Object { $_ -notmatch "SearchProgress" } | Select-Object -First 20

Write-Host "---"
Write-Host "Check completed"