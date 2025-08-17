// Webhook endpoint for receiving external alerts and notifications
// Allows other services to send alerts through the Telegram monitoring system

import fetch from 'node-fetch';

class WebhookHandler {
  constructor() {
    this.config = {
      telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID
      },
      webhookSecret: process.env.WEBHOOK_SECRET || 'your-secret-key-here',
      allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
    };
  }

  async sendTelegramAlert(message, severity = 'medium', source = 'webhook') {
    if (!this.config.telegram.botToken || !this.config.telegram.chatId) {
      throw new Error('Telegram credentials not configured');
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
    telegramMessage += `**Source:** ${source}\n`;
    telegramMessage += `**Message:** ${message}\n`;
    telegramMessage += `**Time:** ${timestamp}\n`;
    telegramMessage += `\n📡 Received via Webhook`;

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
      throw new Error(`Telegram API error: ${error}`);
    }

    return true;
  }

  validateRequest(req) {
    // Check webhook secret
    const providedSecret = req.headers['x-webhook-secret'] || req.body?.secret;
    if (providedSecret !== this.config.webhookSecret) {
      return { valid: false, error: 'Invalid webhook secret' };
    }

    // Validate required fields
    if (!req.body?.message) {
      return { valid: false, error: 'Missing required field: message' };
    }

    return { valid: true };
  }

  processGitHubWebhook(payload) {
    // Handle GitHub webhook events
    const action = payload.action;
    const repository = payload.repository?.name;
    
    if (payload.workflow_run) {
      // GitHub Actions workflow
      const workflowName = payload.workflow_run.name;
      const conclusion = payload.workflow_run.conclusion;
      const status = payload.workflow_run.status;
      
      if (conclusion === 'failure') {
        return {
          message: `GitHub Actions workflow "${workflowName}" failed in ${repository}`,
          severity: 'high',
          source: 'GitHub Actions'
        };
      } else if (conclusion === 'success' && workflowName.includes('deploy')) {
        return {
          message: `Deployment workflow "${workflowName}" completed successfully in ${repository}`,
          severity: 'low',
          source: 'GitHub Actions'
        };
      }
    }

    if (payload.issue && action === 'opened') {
      // New issue created
      return {
        message: `New issue opened in ${repository}: ${payload.issue.title}`,
        severity: 'low',
        source: 'GitHub Issues'
      };
    }

    return null; // No alert needed
  }

  processVercelWebhook(payload) {
    // Handle Vercel deployment webhooks
    const deploymentState = payload.deployment?.state;
    const projectName = payload.deployment?.meta?.githubRepo || 'Unknown Project';
    
    if (deploymentState === 'ERROR') {
      return {
        message: `Vercel deployment failed for ${projectName}`,
        severity: 'high',
        source: 'Vercel'
      };
    } else if (deploymentState === 'READY') {
      return {
        message: `Vercel deployment successful for ${projectName}`,
        severity: 'low',
        source: 'Vercel'
      };
    }

    return null;
  }

  processCustomAlert(payload) {
    // Handle custom alert format
    return {
      message: payload.message,
      severity: payload.severity || 'medium',
      source: payload.source || 'Custom Alert',
      context: payload.context || ''
    };
  }

  determineWebhookType(req) {
    const userAgent = req.headers['user-agent'] || '';
    const contentType = req.headers['content-type'] || '';
    
    if (userAgent.includes('GitHub-Hookshot')) {
      return 'github';
    } else if (req.headers['x-vercel-signature']) {
      return 'vercel';
    } else if (contentType.includes('application/json')) {
      return 'custom';
    }
    
    return 'unknown';
  }
}

// Vercel serverless function handler
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Secret');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    const webhookHandler = new WebhookHandler();
    
    // Validate the request
    const validation = webhookHandler.validateRequest(req);
    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        error: validation.error
      });
    }

    // Determine webhook type and process accordingly
    const webhookType = webhookHandler.determineWebhookType(req);
    let alertData = null;

    switch (webhookType) {
      case 'github':
        alertData = webhookHandler.processGitHubWebhook(req.body);
        break;
      case 'vercel':
        alertData = webhookHandler.processVercelWebhook(req.body);
        break;
      case 'custom':
        alertData = webhookHandler.processCustomAlert(req.body);
        break;
      default:
        // Fallback to custom format
        alertData = webhookHandler.processCustomAlert(req.body);
    }

    // Send alert if one was generated
    if (alertData) {
      await webhookHandler.sendTelegramAlert(
        alertData.message,
        alertData.severity,
        alertData.source
      );

      res.status(200).json({
        success: true,
        message: 'Alert sent successfully',
        alert: {
          message: alertData.message,
          severity: alertData.severity,
          source: alertData.source
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // Webhook received but no alert needed
      res.status(200).json({
        success: true,
        message: 'Webhook processed, no alert generated',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}