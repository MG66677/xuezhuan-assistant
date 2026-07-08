# ===== 马振奥的学赚助手 - 一键部署脚本 =====
# 使用方法:
# 1. 打开 https://github.com/settings/tokens 创建 Token
#    勾选 repo 权限，生成后复制
# 2. 在 PowerShell 中运行本脚本

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
cd "C:\Users\21938\Documents\c1"

Write-Host "=== 马振奥的学赚助手 - 部署到 GitHub + Render ===" -ForegroundColor Cyan

$username = Read-Host "请输入你的 GitHub 用户名"
$token = Read-Host -AsSecureString "请输入你的 GitHub Personal Access Token"
$tokenStr = [System.Net.NetworkCredential]::new("", $token).Password
$repoName = "xuezhuan-assistant"

Write-Host "`n正在创建 GitHub 仓库..." -ForegroundColor Yellow

try {
    $body = @{name=$repoName; description="马振奥的学赚助手"; private=$false} | ConvertTo-Json
    Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method POST -Body $body -ContentType "application/json" -Headers @{Authorization="Bearer $tokenStr"} -UseBasicParsing
    Write-Host "✓ 仓库创建成功!" -ForegroundColor Green
} catch {
    Write-Host "仓库可能已存在，继续推送..." -ForegroundColor Yellow
}

git remote remove origin 2>$null
git remote add origin "https://$tokenStr@github.com/$username/$repoName.git"
git push -u origin master --force

Write-Host "`n✓ 代码已推送到 GitHub!" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：部署到 Render"
Write-Host "1. 打开 https://dashboard.render.com"
Write-Host "2. 点击 New + > Web Service"
Write-Host "3. 连接 GitHub 仓库: $username/$repoName"
Write-Host "4. 设置:"
Write-Host "   - Name: xuezhuan-assistant"
Write-Host "   - Start Command: node server.js"
Write-Host "   - 添加环境变量 DEEPSEEK_API_KEY (你的 DeepSeek API Key)"
Write-Host "5. 点击 Create Web Service"
Write-Host ""
Write-Host "部署后 Render 会给你一个 https://xxx.onrender.com 的网址"
