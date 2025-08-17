// Vercel serverless function for system monitoring
// Replaces Python server_monitor.py for cloud deployment

import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

class CloudMonitor {
  constructor() {
    this.config = {
      telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID
      },
      thresholds: {
        responseTime: 5000, // ms
        errorRate: 0.05, // 5%
        uptimeThreshold: 0.99 // 99%
      },
      endpoints: (process.env.MONITOR_ENDPOINTS || '').split(',').filter(Boolean),
      services: (process.env.MONITOR_SERVICES || '').split(',').filter(Boolean)
    };
  }

  async sendTelegramAlert(message, severity = 'medium', context = '') {
    if (!this.config.telegram.botToken || !this.config.telegram.chatId) {
      console.error('Telegram credentials not configured');
      return false;
    }

    const severityEmojis = {
      critical: '🚨',
      high: '⚠️',
      medium: '📢',
      low: 'ℹ️'
    };

    const emoji = severityEmojis[severity] || '📢';
    const timestamp = new Date().toISOString();
    
    let telegramMessage = `${emoji} **${severity.toUpperCase()}** Alert\n\n`;
    telegramMessage += `**Message:** ${message}\n`;
    telegramMessage += `**Time:** ${timestamp}\n`;
    
    if (context) {
      telegramMessage += `**Context:** ${context}\n`;
    }
    
    telegramMessage += `\n🤖 Sent from Vercel Monitor`;

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.config.telegram.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.config.telegram.chatId,
          text: telegramMessage,
          parse_mode: 'Markdown'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Telegram API error:', error);
        return false;
      }

      console.log('Alert sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending Telegram alert:', error);
      return false;
    }
  }

  async checkEndpointHealth(url) {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Vercel-Monitor/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        url,
        status: response.status,
        responseTime,
        healthy: response.ok && responseTime < this.config.thresholds.responseTime,
        error: null
      };
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        url,
        status: 0,
        responseTime,
        healthy: false,
        error: error.message
      };
    }
  }

  async checkVercelDeploymentStatus() {
    // Check current deployment health
    try {
      const deploymentInfo = {
        region: process.env.VERCEL_REGION || 'unknown',
        deploymentUrl: process.env.VERCEL_URL || 'unknown',
        timestamp: new Date().toISOString()
      };

      // Basic health check - if this function runs, Vercel is working
      return {
        healthy: true,
        info: deploymentInfo,
        error: null
      };
    } catch (error) {
      return {
        healthy: false,
        info: null,
        error: error.message
      };
    }
  }

  async runMonitoringCheck() {
    console.log('Starting monitoring check at', new Date().toISOString());
    
    const results = {
      timestamp: new Date().toISOString(),
      vercel: null,
      endpoints: [],
      alerts: []
    };

    // Check Vercel deployment health
    results.vercel = await this.checkVercelDeploymentStatus();
    if (!results.vercel.healthy) {
      const alert = {
        message: 'Vercel deployment health check failed',
        severity: 'critical',
        context: results.vercel.error
      };
      results.alerts.push(alert);
      await this.sendTelegramAlert(alert.message, alert.severity, alert.context);
    }

    // Check configured endpoints
    for (const endpoint of this.config.endpoints) {
      if (!endpoint.trim()) continue;
      
      const healthCheck = await this.checkEndpointHealth(endpoint);
      results.endpoints.push(healthCheck);

      if (!healthCheck.healthy) {
        const alert = {
          message: `Endpoint ${endpoint} is unhealthy`,
          severity: healthCheck.status === 0 ? 'critical' : 'high',
          context: `Status: ${healthCheck.status}, Response time: ${healthCheck.responseTime}ms, Error: ${healthCheck.error || 'N/A'}`
        };
        results.alerts.push(alert);
        await this.sendTelegramAlert(alert.message, alert.severity, alert.context);
      } else if (healthCheck.responseTime > this.config.thresholds.responseTime * 0.8) {
        // Warning for slow responses (80% of threshold)
        const alert = {
          message: `Endpoint ${endpoint} responding slowly`,
          severity: 'medium',
          context: `Response time: ${healthCheck.responseTime}ms (threshold: ${this.config.thresholds.responseTime}ms)`
        };
        results.alerts.push(alert);
        await this.sendTelegramAlert(alert.message, alert.severity, alert.context);
      }
    }

    // Check memory usage (Vercel function limits)
    const memoryUsage = process.memoryUsage();
    const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
    
    if (memoryMB > 900) { // Vercel has 1GB limit for Pro plan
      const alert = {
        message: 'High memory usage in monitoring function',
        severity: 'medium',
        context: `Memory usage: ${memoryMB.toFixed(2)}MB`
      };
      results.alerts.push(alert);
      await this.sendTelegramAlert(alert.message, alert.severity, alert.context);
    }

    console.log(`Monitoring check completed. Found ${results.alerts.length} issues.`);
    return results;
  }
}

// Vercel serverless function handler
export default async function handler(req, res) {
  // Set CORS headers for browser access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const monitor = new CloudMonitor();
    const results = await monitor.runMonitoringCheck();
    
    // Return monitoring results
    res.status(200).json({
      success: true,
      timestamp: results.timestamp,
      summary: {
        vercelHealthy: results.vercel?.healthy,
        endpointsChecked: results.endpoints.length,
        alertsGenerated: results.alerts.length,
        healthyEndpoints: results.endpoints.filter(e => e.healthy).length
      },
      details: results,
      nextCheck: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Next check in 5 minutes
    });
  } catch (error) {
    console.error('Monitoring error:', error);
    
    // Send critical alert about monitoring failure
    try {
      const monitor = new CloudMonitor();
      await monitor.sendTelegramAlert(
        'Monitoring system failure',
        'critical',
        `Error: ${error.message}`
      );
    } catch (alertError) {
      console.error('Failed to send failure alert:', alertError);
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}