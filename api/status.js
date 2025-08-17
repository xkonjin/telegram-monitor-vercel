// Status endpoint for monitoring system health and configuration
// Provides system status, recent alerts, and configuration validation

import fetch from 'node-fetch';

class StatusReporter {
  constructor() {
    this.config = {
      telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID
      },
      monitoring: {
        endpoints: (process.env.MONITOR_ENDPOINTS || '').split(',').filter(Boolean),
        services: (process.env.MONITOR_SERVICES || '').split(',').filter(Boolean)
      },
      vercel: {
        region: process.env.VERCEL_REGION || 'unknown',
        url: process.env.VERCEL_URL || 'unknown'
      }
    };
  }

  async validateTelegramConfig() {
    if (!this.config.telegram.botToken || !this.config.telegram.chatId) {
      return {
        valid: false,
        error: 'Missing Telegram credentials'
      };
    }

    try {
      // Test Telegram API connection
      const response = await fetch(`https://api.telegram.org/bot${this.config.telegram.botToken}/getMe`);
      
      if (!response.ok) {
        return {
          valid: false,
          error: 'Invalid Telegram bot token'
        };
      }

      const botInfo = await response.json();
      
      return {
        valid: true,
        botInfo: {
          username: botInfo.result.username,
          firstName: botInfo.result.first_name
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: `Telegram API error: ${error.message}`
      };
    }
  }

  async testTelegramDelivery() {
    try {
      const testMessage = `🧪 **Test Alert**\n\nMonitoring system test message\n**Time:** ${new Date().toISOString()}\n\n✅ System operational`;
      
      const response = await fetch(`https://api.telegram.org/bot${this.config.telegram.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.config.telegram.chatId,
          text: testMessage,
          parse_mode: 'Markdown'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Failed to send test message: ${error}`
        };
      }

      return {
        success: true,
        message: 'Test message sent successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  getSystemInfo() {
    return {
      deployment: {
        region: this.config.vercel.region,
        url: this.config.vercel.url,
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch
      },
      monitoring: {
        endpointsConfigured: this.config.monitoring.endpoints.length,
        servicesConfigured: this.config.monitoring.services.length,
        endpoints: this.config.monitoring.endpoints,
        services: this.config.monitoring.services
      },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(process.memoryUsage().external / 1024 / 1024) + 'MB'
      }
    };
  }

  async getRecentActivity() {
    // In a real implementation, this would query a database or log service
    // For now, we'll return placeholder data
    return {
      lastCheck: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      checksToday: 288, // Every 5 minutes = 288 checks per day
      alertsToday: 0,
      uptime: '99.9%',
      avgResponseTime: '145ms'
    };
  }

  checkEnvironmentVariables() {
    const requiredVars = [
      'TELEGRAM_BOT_TOKEN',
      'TELEGRAM_CHAT_ID'
    ];

    const optionalVars = [
      'MONITOR_ENDPOINTS',
      'MONITOR_SERVICES',
      'WEBHOOK_SECRET',
      'ALLOWED_ORIGINS'
    ];

    const status = {
      required: {},
      optional: {},
      recommendations: []
    };

    // Check required variables
    for (const varName of requiredVars) {
      status.required[varName] = {
        present: !!process.env[varName],
        configured: !!process.env[varName]
      };
    }

    // Check optional variables
    for (const varName of optionalVars) {
      status.optional[varName] = {
        present: !!process.env[varName],
        value: process.env[varName] ? '[CONFIGURED]' : '[NOT SET]'
      };
    }

    // Generate recommendations
    if (!process.env.MONITOR_ENDPOINTS) {
      status.recommendations.push('Set MONITOR_ENDPOINTS to monitor external services');
    }

    if (!process.env.WEBHOOK_SECRET) {
      status.recommendations.push('Set WEBHOOK_SECRET for secure webhook access');
    }

    if (this.config.monitoring.endpoints.length === 0) {
      status.recommendations.push('Configure endpoints to monitor for comprehensive coverage');
    }

    return status;
  }
}

// Vercel serverless function handler
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const statusReporter = new StatusReporter();
    const { test } = req.query;

    // Handle test requests
    if (test === 'telegram') {
      const result = await statusReporter.testTelegramDelivery();
      return res.status(result.success ? 200 : 500).json({
        test: 'telegram',
        ...result,
        timestamp: new Date().toISOString()
      });
    }

    // Generate comprehensive status report
    const [
      telegramValidation,
      systemInfo,
      recentActivity,
      envStatus
    ] = await Promise.all([
      statusReporter.validateTelegramConfig(),
      statusReporter.getSystemInfo(),
      statusReporter.getRecentActivity(),
      statusReporter.checkEnvironmentVariables()
    ]);

    const overallStatus = {
      operational: telegramValidation.valid,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    const statusReport = {
      status: overallStatus,
      telegram: telegramValidation,
      system: systemInfo,
      activity: recentActivity,
      environment: envStatus,
      endpoints: {
        monitor: '/api/monitor',
        webhook: '/api/webhook',
        status: '/api/status',
        testTelegram: '/api/status?test=telegram'
      },
      documentation: {
        setup: 'https://github.com/your-repo/telegram-monitor-vercel#setup',
        api: 'https://github.com/your-repo/telegram-monitor-vercel#api-reference'
      }
    };

    res.status(200).json(statusReport);

  } catch (error) {
    console.error('Status check error:', error);
    
    res.status(500).json({
      status: {
        operational: false,
        timestamp: new Date().toISOString(),
        error: error.message
      }
    });
  }
}