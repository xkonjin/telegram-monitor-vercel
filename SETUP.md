# Quick Setup Guide

## 🚀 Deployed Successfully!

Your Telegram Monitor + Bot system is now live at:
**https://telegram-monitor.vercel.app**

## ⚡ Quick Setup (2 steps)

### 1. Set Environment Variables
Using Vercel CLI (recommended):
```bash
# Set bot token
echo "8407357917:AAFC9YDlg0-m3WmvKUDPU-ZdNsfHIITIREs" | vercel env add TELEGRAM_BOT_TOKEN production

# Set authorized username
echo "Xkonjin" | vercel env add AUTHORIZED_USERNAME production

# Set monitoring endpoints
echo "https://telegram-monitor.vercel.app,https://plasma.to" | vercel env add MONITOR_ENDPOINTS production

# Generate and set webhook secret
openssl rand -base64 32 | vercel env add WEBHOOK_SECRET production
```

Or via Vercel Dashboard:
1. Go to [vercel.com](https://vercel.com) → Your Project → Settings → Environment Variables
2. Add these variables:
   - `TELEGRAM_BOT_TOKEN`: `8407357917:AAFC9YDlg0-m3WmvKUDPU-ZdNsfHIITIREs`
   - `AUTHORIZED_USERNAME`: `Xkonjin`
   - `MONITOR_ENDPOINTS`: `https://telegram-monitor.vercel.app,https://plasma.to`
   - `WEBHOOK_SECRET`: `[generate random string]`

### 2. Get Your Chat ID & Setup Webhook
```bash
# Send any message to your bot first, then:
curl "https://api.telegram.org/bot8407357917:AAFC9YDlg0-m3WmvKUDPU-ZdNsfHIITIREs/getUpdates"

# Look for "chat":{"id":123456789} and use that number
echo "123456789" | vercel env add TELEGRAM_CHAT_ID production

# Setup webhook (after environment variables are set)
curl "https://telegram-monitor.vercel.app/api/setup-webhook?action=set"
```

## 🎯 Test Your Setup

```bash
# Test bot status
curl https://telegram-monitor.vercel.app/api/bot

# Test system status  
curl https://telegram-monitor.vercel.app/api/status

# Send test message via Telegram
# Message your bot: /start

# Test monitoring
curl https://telegram-monitor.vercel.app/api/monitor
```

## 🤖 Bot Features

### Public Commands (anyone can use):
- `/start` - Welcome message
- `/help` - Show commands
- `/plasmabrand` - Get Plasma brand resources

### Private Commands (for @Xkonjin only):
- **Task Management**: `/addtask`, `/tasks`, `/complete`
- **Message Storage**: `/save`, `/recent`, `/search`
- **System Monitoring**: `/monitor`, `/status`, `/endpoints`
- **Data Management**: `/sync`, `/export`

### Auto Features:
- **Action Item Detection**: Automatically creates tasks from messages
- **Message Tagging**: Auto-tags messages by content
- **Context Storage**: Saves conversation context
- **Smart Responses**: Contextual replies to messages

## 📊 Monitoring Features

- **Daily Monitoring**: Automatic health checks at 9 AM UTC
- **Endpoint Monitoring**: Tracks response times and status
- **Webhook Integration**: Receives alerts from GitHub/Vercel
- **Telegram Alerts**: Real-time notifications with severity levels

## 🔧 Management URLs

- **Dashboard**: https://telegram-monitor.vercel.app
- **Bot Endpoint**: https://telegram-monitor.vercel.app/api/bot
- **Setup Webhook**: https://telegram-monitor.vercel.app/api/setup-webhook
- **System Status**: https://telegram-monitor.vercel.app/api/status
- **Vercel Project**: https://vercel.com/jin-growgamicoms-projects/telegram-monitor

## 🎉 You're All Set!

Your system now provides:
- ✅ 24/7 uptime monitoring
- ✅ Advanced Telegram bot with task management
- ✅ Message storage and context
- ✅ Webhook integrations
- ✅ Zero maintenance serverless operation

Send `/start` to your bot to begin!