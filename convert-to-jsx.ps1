# convert-to-jsx.ps1
Write-Host "🚀 Converting .js files to .jsx..." -ForegroundColor Green

$basePath = "D:\freelanceflow - Copy\client\src"

# Directories to convert (excluding node_modules)
$directories = @(
    "$basePath\pages",
    "$basePath\components",
    "$basePath\context",
    "$basePath\services",
    "$basePath\utils"
)

$convertedCount = 0

foreach ($dir in $directories) {
    if (Test-Path $dir) {
        $files = Get-ChildItem -Path $dir -Filter "*.js" -Recurse
        foreach ($file in $files) {
            # Skip non-React files
            if ($file.Name -match "^(index|setupTests|reportWebVitals|serviceWorker)") {
                Write-Host "⏭️ Skipping: $($file.FullName)" -ForegroundColor Yellow
                continue
            }
            
            # Check if file contains JSX
            $content = Get-Content -Path $file.FullName -Raw
            if ($content -match "<[A-Za-z]") {
                $newPath = $file.FullName -replace '\.js$', '.jsx'
                Rename-Item -Path $file.FullName -NewName $newPath
                Write-Host "✅ Converted: $($file.Name) → $([System.IO.Path]::GetFileName($newPath))" -ForegroundColor Green
                $convertedCount++
            } else {
                Write-Host "⏭️ Skipping (no JSX): $($file.Name)" -ForegroundColor Yellow
            }
        }
    }
}

Write-Host "`n✅ Conversion complete! Converted $convertedCount files." -ForegroundColor Green