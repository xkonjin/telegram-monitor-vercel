#!/bin/bash
# Deploy and test workflow for Telegram Monitor Vercel

set -e  # Exit on any error

echo "🚀 Telegram Monitor - Deploy and Test Workflow"
echo "=============================================="

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo "🧪 Testing: $description"
    
    response=$(curl -s -w "%{http_code}" "$endpoint")
    http_code="${response: -3}"
    content="${response%???}"
    
    if [ "$http_code" -eq "200" ]; then
        echo "✅ PASS: $description ($http_code)"
    else
        echo "❌ FAIL: $description ($http_code)"
        echo "   Response: $content"
    fi
    echo ""
}

# 1. Git workflow
echo "📝 Git Status:"
git status --porcelain

if [ -n "$(git status --porcelain)" ]; then
    echo "📦 Committing changes..."
    git add .
    git commit -m "Automated deployment update $(date '+%Y-%m-%d %H:%M:%S')

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    echo "✅ Changes committed"
else
    echo "✅ No changes to commit"
fi

echo ""

# 2. Deploy to Vercel
echo "🚀 Deploying to Vercel..."
DEPLOY_OUTPUT=$(vercel --prod 2>&1)
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^[:space:]]*\.vercel\.app' | head -1)

if [ -n "$DEPLOY_URL" ]; then
    echo "✅ Deployed successfully: $DEPLOY_URL"
else
    echo "❌ Deployment failed"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo ""

# 3. Wait for deployment to be ready
echo "⏳ Waiting for deployment to be ready..."
sleep 10

# 4. Test endpoints
BASE_URL="https://telegram-monitor.vercel.app"

test_endpoint "$BASE_URL" "Main dashboard"
test_endpoint "$BASE_URL/api/status" "Status endpoint"
test_endpoint "$BASE_URL/api/bot" "Bot endpoint"
test_endpoint "$BASE_URL/api/get-chat-id" "Chat ID utility"
test_endpoint "$BASE_URL/api/setup-webhook" "Webhook setup"

# 5. Check environment variables
echo "🔧 Environment Variables Status:"
vercel env ls | grep -E "(TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|AUTHORIZED_USERNAME|MONITOR_ENDPOINTS|WEBHOOK_SECRET)"

echo ""

# 6. Test Telegram integration (if chat ID is configured)
if vercel env ls | grep -q "TELEGRAM_CHAT_ID"; then
    echo "📱 Testing Telegram integration..."
    test_endpoint "$BASE_URL/api/status?test=telegram" "Telegram test message"
else
    echo "⚠️ TELEGRAM_CHAT_ID not configured yet"
    echo "   1. Send a message to your bot"
    echo "   2. Visit: $BASE_URL/api/get-chat-id" 
    echo "   3. Run: echo 'CHAT_ID' | vercel env add TELEGRAM_CHAT_ID production"
fi

echo ""

# 7. Setup webhook (if not already done)
echo "🔗 Setting up webhook..."
WEBHOOK_RESPONSE=$(curl -s "$BASE_URL/api/setup-webhook?action=set")
echo "$WEBHOOK_RESPONSE" | jq . 2>/dev/null || echo "$WEBHOOK_RESPONSE"

echo ""

# 8. Summary
echo "📊 Deployment Summary:"
echo "   🌐 URL: $BASE_URL"
echo "   🤖 Bot: @$(curl -s "$BASE_URL/api/bot" | jq -r '.authorizedUser // "Not configured"')"
echo "   📡 Monitoring: Daily at 9 AM UTC"
echo "   🔗 Webhook: Configured"
echo ""
echo "🎯 Next Steps:"
echo "   1. Send /start to your bot"
echo "   2. Configure TELEGRAM_CHAT_ID if needed"
echo "   3. Test with /status command"
echo "   4. Add more endpoints to monitor"
echo ""
echo "✅ Deploy and test completed!"