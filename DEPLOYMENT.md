# Deployment Guide: 24/7 Telegram Monitoring on Vercel

Complete step-by-step guide to deploy your monitoring system with zero maintenance requirements.

## 🚀 Quick Deployment (5 minutes)

### Step 1: Create GitHub Repository
```bash
# Navigate to project directory
cd /Users/001/CLAUDE/telegram-monitor-vercel

# Create GitHub repo (replace YOUR_USERNAME)
gh repo create telegram-monitor-vercel --public --description "24/7 Telegram monitoring on Vercel"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/telegram-monitor-vercel.git
git push -u origin main
```

### Step 2: Deploy to Vercel
```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy to Vercel (follow prompts)
vercel

# For production deployment
vercel --prod
```

### Step 3: Configure Environment Variables
In Vercel Dashboard (vercel.com):
1. Go to your project > Settings > Environment Variables
2. Add these variables:

| Variable | Value | Notes |
|----------|--------|-------|
| `TELEGRAM_BOT_TOKEN` | `123456789:ABC...` | From @BotFather |
| `TELEGRAM_CHAT_ID` | `123456789` | Your chat ID |
| `MONITOR_ENDPOINTS` | `https://site1.com,https://site2.com` | URLs to monitor |
| `WEBHOOK_SECRET` | `your-secret-key` | For webhook security |

### Step 4: Verify Deployment
```bash
# Test status endpoint
curl https://your-project.vercel.app/api/status

# Test Telegram delivery
curl https://your-project.vercel.app/api/status?test=telegram
```

## 🔧 Detailed Configuration

### Environment Variables Setup

#### Via Vercel CLI
```bash
# Add environment variables via CLI
vercel env add TELEGRAM_BOT_TOKEN
# Enter your bot token when prompted

vercel env add TELEGRAM_CHAT_ID
# Enter your chat ID when prompted

vercel env add MONITOR_ENDPOINTS
# Enter comma-separated URLs to monitor

vercel env add WEBHOOK_SECRET
# Enter a secure random string
```

#### Via Vercel Dashboard
1. Visit [vercel.com](https://vercel.com)
2. Go to your project
3. Settings > Environment Variables
4. Add each variable with appropriate values

### Telegram Configuration

#### 1. Create Telegram Bot
```bash
# Message @BotFather on Telegram
/newbot

# Follow prompts to create bot
# Save the bot token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

#### 2. Get Your Chat ID
```bash
# Start chat with your bot
# Send any message to the bot

# Get updates to find your chat ID
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates

# Look for "chat":{"id":123456789} in response
# Save this number as your TELEGRAM_CHAT_ID
```

#### 3. Test Telegram Configuration
```bash
# Test via your deployed status endpoint
curl https://your-project.vercel.app/api/status?test=telegram

# Should receive test message in Telegram
```

## ⚙️ Vercel Cron Configuration

The cron job is configured in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/monitor",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

This runs monitoring every 5 minutes automatically. No additional setup required!

## 🔗 GitHub Integration

### Automated Deployment
1. Connect GitHub repo to Vercel (done during initial deployment)
2. Every push to `main` branch auto-deploys
3. Pull requests get preview deployments

### GitHub Actions Monitoring
Add webhook to your other repositories:
1. Go to repo Settings > Webhooks
2. Add webhook URL: `https://your-project.vercel.app/api/webhook`
3. Content type: `application/json`
4. Secret: Your `WEBHOOK_SECRET` value
5. Events: Workflow runs, Issues, Deployments

## 📊 Monitoring Configuration

### Website/API Monitoring
```bash
# Set multiple endpoints to monitor
MONITOR_ENDPOINTS=https://yoursite.com,https://api.yourservice.com,https://admin.yourapp.com
```

### Custom Monitoring Thresholds
Edit `/api/monitor.js` to customize:
```javascript
const config = {
  thresholds: {
    responseTime: 5000,     // 5 seconds
    errorRate: 0.05,        // 5% error rate
    uptimeThreshold: 0.99   // 99% uptime
  }
};
```

## 🚨 Alert Configuration

### Severity Levels
- **🚨 Critical**: Total outages, system failures
- **⚠️ High**: Service degradation, errors
- **📢 Medium**: Performance issues, warnings
- **ℹ️ Low**: Informational updates

### Custom Alert Rules
Modify monitoring logic in `/api/monitor.js`:
```javascript
// Example: Alert if response time > 3 seconds
if (healthCheck.responseTime > 3000) {
  await this.sendTelegramAlert(
    `Slow response from ${endpoint}`,
    'medium',
    `Response time: ${healthCheck.responseTime}ms`
  );
}
```

## 🔐 Security Configuration

### Webhook Security
```bash
# Generate secure webhook secret
openssl rand -base64 32
# Use this as your WEBHOOK_SECRET
```

### CORS Configuration
```bash
# Restrict API access to specific origins
ALLOWED_ORIGINS=https://yourdomain.com,https://dashboard.yourapp.com
```

## 📈 Scaling & Performance

### Function Limits
- **Execution Time**: 30 seconds max per function
- **Memory**: 1GB limit on Pro plan
- **Invocations**: 100GB-hours per month on free plan

### Optimization Tips
1. **Batch Monitoring**: Check multiple endpoints in parallel
2. **Timeout Management**: Set appropriate fetch timeouts
3. **Error Handling**: Graceful degradation on API failures
4. **Rate Limiting**: Space out Telegram messages

## 🛠️ Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start Vercel dev server
vercel dev

# Test locally
curl http://localhost:3000/api/status
```

### Testing
```bash
# Test monitoring function
curl -X POST http://localhost:3000/api/monitor

# Test webhook with sample data
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{"message": "Test alert", "severity": "medium"}'
```

### Deployment
```bash
# Deploy changes
git add .
git commit -m "Update monitoring configuration"
git push

# Vercel auto-deploys from GitHub
# Check deployment status at vercel.com
```

## 📊 Monitoring Dashboard

### Real-time Status
```bash
# Get comprehensive status
curl https://your-project.vercel.app/api/status | jq

# Sample response:
{
  "status": {
    "operational": true,
    "timestamp": "2025-08-17T16:00:00Z"
  },
  "telegram": {
    "valid": true,
    "botInfo": {
      "username": "your_monitor_bot"
    }
  },
  "system": {
    "deployment": {
      "region": "iad1",
      "url": "your-project.vercel.app"
    },
    "monitoring": {
      "endpointsConfigured": 3
    }
  }
}
```

### Health Checks
```bash
# Manual monitoring trigger
curl -X POST https://your-project.vercel.app/api/monitor

# View Vercel function logs
vercel logs --follow
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Telegram Not Working
```bash
# Check bot token
curl https://api.telegram.org/bot<TOKEN>/getMe

# Verify chat ID
curl https://your-project.vercel.app/api/status?test=telegram
```

#### 2. Cron Not Running
- Check Vercel dashboard > Functions > Cron
- Verify function isn't timing out (30s limit)
- Check environment variables are set

#### 3. Environment Variables Missing
```bash
# List all environment variables
vercel env ls

# Pull environment variables locally
vercel env pull .env.local
```

#### 4. Function Timeouts
- Reduce number of endpoints monitored
- Increase timeout in `vercel.json`
- Optimize monitoring logic

### Debug Commands
```bash
# Check deployment status
vercel ls

# View function logs
vercel logs

# Inspect environment
vercel env ls

# Test specific endpoint
curl -v https://your-project.vercel.app/api/status
```

## 🔄 Maintenance

### Updates
1. **Automatic**: Vercel auto-deploys from GitHub pushes
2. **Dependencies**: Update via `npm update` and commit
3. **Configuration**: Update environment variables in Vercel dashboard

### Monitoring the Monitor
- Check Vercel dashboard regularly
- Monitor function invocation counts
- Review error logs for issues
- Test Telegram delivery weekly

### Backup Configuration
```bash
# Export environment variables
vercel env pull .env.backup

# Backup repository
git clone https://github.com/YOUR_USERNAME/telegram-monitor-vercel.git backup/
```

## ✅ Post-Deployment Checklist

- [ ] GitHub repository created and connected
- [ ] Vercel deployment successful
- [ ] Environment variables configured
- [ ] Telegram bot token and chat ID set
- [ ] Test message received successfully
- [ ] Monitoring endpoints configured
- [ ] Webhook secret set for security
- [ ] Cron job verified in Vercel dashboard
- [ ] Status endpoint returning healthy status
- [ ] Manual monitoring test successful
- [ ] Webhook test successful
- [ ] Documentation updated with your URLs

## 🎯 Next Steps

1. **Add More Endpoints**: Expand monitoring coverage
2. **Custom Alerts**: Add business-specific monitoring
3. **Integration**: Connect with other services via webhooks
4. **Dashboard**: Build custom monitoring dashboard
5. **Analytics**: Track uptime and performance metrics

Your 24/7 monitoring system is now live and requires zero maintenance! 🚀