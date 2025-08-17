# Telegram Monitor Vercel

24/7 Telegram monitoring system deployed on Vercel serverless infrastructure. No local computer required - runs entirely in the cloud with automated GitHub deployment.

## 🚀 Features

- **Serverless Monitoring**: Runs on Vercel with automatic scaling
- **Scheduled Checks**: Automated monitoring every 5 minutes via Vercel cron
- **Telegram Alerts**: Instant notifications for critical issues
- **Webhook Support**: Receive alerts from external services (GitHub, Vercel, custom)
- **Status Dashboard**: Real-time system status and health checks
- **Zero Maintenance**: No server management required

## 🏗️ Architecture

```
Vercel Serverless Functions:
├── /api/monitor.js      # Main monitoring logic (cron: every 5 min)
├── /api/webhook.js      # Webhook receiver for external alerts
├── /api/status.js       # System status and health dashboard
└── /api/test.js         # Test endpoints for validation
```

## ⚡ Quick Deploy

### 1. Fork & Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/telegram-monitor-vercel.git
cd telegram-monitor-vercel
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create `.env.local` for development:
```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
MONITOR_ENDPOINTS=https://your-site.com,https://api.your-service.com
WEBHOOK_SECRET=your-secret-key-here
```

### 4. Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
vercel env add TELEGRAM_BOT_TOKEN
vercel env add TELEGRAM_CHAT_ID
# ... add all other variables
```

## 🔧 Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | `123456789:ABC...` |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID | `123456789` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONITOR_ENDPOINTS` | Comma-separated URLs to monitor | `""` |
| `MONITOR_SERVICES` | Services to check (future use) | `""` |
| `WEBHOOK_SECRET` | Secret for webhook authentication | `"your-secret-key-here"` |
| `ALLOWED_ORIGINS` | CORS origins for API access | `"*"` |

## 📡 API Endpoints

### Monitoring
- `GET /api/status` - System status and health check
- `GET /api/status?test=telegram` - Test Telegram delivery
- `POST /api/monitor` - Manual monitoring trigger (also runs via cron)

### Webhooks
- `POST /api/webhook` - Receive external alerts
  - Supports GitHub Actions, Vercel deployments, custom alerts
  - Requires `X-Webhook-Secret` header or `secret` in body

### Example Webhook Usage
```bash
# Send custom alert
curl -X POST https://your-monitor.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret-key-here" \
  -d '{
    "message": "Database backup failed",
    "severity": "high",
    "source": "Backup Service",
    "context": "Error: Connection timeout after 30s"
  }'
```

## 🔍 Monitoring Features

### Automated Checks (Every 5 Minutes)
- **Endpoint Health**: HTTP status, response time monitoring
- **Vercel Status**: Function health and memory usage
- **Alert Generation**: Intelligent severity-based notifications

### Alert Severities
- **🚨 Critical**: System failures, total outages
- **⚠️ High**: Service degradation, errors
- **📢 Medium**: Performance issues, warnings  
- **ℹ️ Low**: Informational updates

### Response Time Monitoring
- Alerts for slow responses (>5s by default)
- Tracks response times for all configured endpoints
- Memory usage monitoring for Vercel functions

## 🔐 Security Features

- **Webhook Authentication**: Secret-based request validation
- **CORS Protection**: Configurable origin restrictions
- **Environment Isolation**: Secure credential management
- **Audit Trail**: All alerts logged with timestamps

## 🎯 Telegram Setup

### 1. Create Telegram Bot
1. Message @BotFather on Telegram
2. Send `/newbot` and follow instructions
3. Save the bot token

### 2. Get Chat ID
1. Start a chat with your bot
2. Send any message
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find your chat ID in the response

### 3. Test Configuration
```bash
# Test via status endpoint
curl https://your-monitor.vercel.app/api/status?test=telegram
```

## 📊 GitHub Actions Integration

Add webhook to your GitHub repository:
1. Go to Settings > Webhooks
2. Add webhook URL: `https://your-monitor.vercel.app/api/webhook`
3. Set secret to your `WEBHOOK_SECRET`
4. Select events: Workflow runs, Issues, Deployments

## 🚀 Vercel Deployment Integration

Configure Vercel webhook:
1. Project Settings > Git > Deploy Hooks
2. Add webhook: `https://your-monitor.vercel.app/api/webhook`
3. Automatic deployment monitoring

## 📈 Monitoring Dashboard

Access real-time status:
```bash
# System overview
curl https://your-monitor.vercel.app/api/status

# Example response:
{
  "status": {
    "operational": true,
    "timestamp": "2025-08-17T16:00:00.000Z"
  },
  "telegram": {
    "valid": true,
    "botInfo": {
      "username": "your_bot",
      "firstName": "Monitor Bot"
    }
  },
  "system": {
    "deployment": {
      "region": "iad1",
      "url": "your-monitor.vercel.app"
    },
    "monitoring": {
      "endpointsConfigured": 2,
      "endpoints": ["https://site1.com", "https://api.site2.com"]
    }
  }
}
```

## 🔄 Cron Schedule

Monitoring runs automatically via Vercel cron:
- **Frequency**: Every 5 minutes (`*/5 * * * *`)
- **Function**: `/api/monitor`
- **Timeout**: 30 seconds max
- **Retry**: Automatic on failure

## 🛠️ Development

### Local Development
```bash
# Start Vercel dev server
npm run dev

# Test monitoring locally
curl http://localhost:3000/api/monitor

# Test webhook locally
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": "Test alert", "severity": "medium"}'
```

### Custom Monitoring Logic
Extend `/api/monitor.js` to add:
- Database connection checks
- Custom API health checks
- Business metric monitoring
- Performance thresholds

## 📝 Example Use Cases

### 1. Website Uptime Monitoring
```bash
MONITOR_ENDPOINTS=https://yoursite.com,https://api.yourservice.com
```

### 2. CI/CD Pipeline Monitoring
- GitHub Actions webhook alerts
- Vercel deployment notifications
- Build failure alerts

### 3. Custom Service Monitoring
```javascript
// Add to monitor.js
async function checkCustomService() {
  const response = await fetch('https://api.yourservice.com/health');
  const data = await response.json();
  
  if (data.status !== 'healthy') {
    await this.sendTelegramAlert(
      `Custom service unhealthy: ${data.message}`,
      'high',
      'Custom Health Check'
    );
  }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Telegram not working**
   - Check bot token and chat ID
   - Test with: `/api/status?test=telegram`
   - Verify bot has permission to send messages

2. **Cron not running**
   - Check Vercel cron configuration in dashboard
   - Verify function isn't timing out (30s limit)
   - Check function logs in Vercel dashboard

3. **Webhooks failing**
   - Verify webhook secret matches
   - Check request format and headers
   - Review function logs for errors

### Debug Mode
```bash
# Check system status
curl https://your-monitor.vercel.app/api/status

# Manual monitoring trigger
curl -X POST https://your-monitor.vercel.app/api/monitor

# Test webhook
curl -X POST https://your-monitor.vercel.app/api/webhook \
  -H "X-Webhook-Secret: your-secret" \
  -d '{"message": "Debug test"}'
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📞 Support

- **Issues**: GitHub Issues
- **Documentation**: This README
- **Status**: Check `/api/status` endpoint

---

**Perfect for**: DevOps teams, solo developers, startups needing reliable 24/7 monitoring without server management overhead.