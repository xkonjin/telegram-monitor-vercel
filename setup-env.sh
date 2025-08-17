#!/bin/bash
# Setup script for Telegram Monitor Vercel environment variables

echo "🚀 Setting up Telegram Monitor Vercel Environment Variables"
echo "=========================================================="

# Bot token from existing setup
BOT_TOKEN="8407357917:AAFC9YDlg0-m3WmvKUDPU-ZdNsfHIITIREs"

# Get chat ID
echo "📱 Getting your Telegram Chat ID..."
echo "1. Send any message to your bot in Telegram"
echo "2. Checking for messages..."

CHAT_ID=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates" | \
    grep -o '"chat":{"id":[0-9]*' | \
    head -1 | \
    grep -o '[0-9]*$')

if [ -z "$CHAT_ID" ]; then
    echo "❌ No chat ID found. Please:"
    echo "   1. Send a message to your bot first"
    echo "   2. Run this script again"
    echo ""
    echo "Or manually get your chat ID:"
    echo "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates"
    exit 1
fi

echo "✅ Found Chat ID: $CHAT_ID"
echo ""

# Set environment variables in Vercel
echo "🔧 Setting Vercel environment variables..."

echo "Setting TELEGRAM_BOT_TOKEN..."
echo "$BOT_TOKEN" | vercel env add TELEGRAM_BOT_TOKEN production

echo "Setting TELEGRAM_CHAT_ID..."
echo "$CHAT_ID" | vercel env add TELEGRAM_CHAT_ID production

echo "Setting MONITOR_ENDPOINTS..."
echo "https://telegram-monitor-vercel.vercel.app" | vercel env add MONITOR_ENDPOINTS production

echo "Setting WEBHOOK_SECRET..."
WEBHOOK_SECRET=$(openssl rand -base64 32 | tr -d '\n')
echo "$WEBHOOK_SECRET" | vercel env add WEBHOOK_SECRET production

echo ""
echo "✅ Environment variables configured!"
echo ""
echo "🔗 Your monitoring system:"
echo "   Dashboard: https://telegram-monitor.vercel.app"
echo "   Status API: https://telegram-monitor.vercel.app/api/status"
echo "   Test Telegram: https://telegram-monitor.vercel.app/api/status?test=telegram"
echo ""
echo "🎯 Next steps:"
echo "   1. Test your setup: curl https://telegram-monitor.vercel.app/api/status?test=telegram"
echo "   2. Your system will monitor daily at 9 AM UTC"
echo "   3. Add more endpoints via MONITOR_ENDPOINTS variable"
echo ""
echo "📖 Documentation: /Users/001/CLAUDE/telegram-monitor-vercel/README.md"