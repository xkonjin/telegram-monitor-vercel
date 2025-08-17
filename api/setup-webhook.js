// Webhook setup endpoint for Telegram bot
// Configures webhook URL and bot commands

import fetch from 'node-fetch';

class WebhookManager {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.webhookUrl = `${process.env.VERCEL_URL || 'https://telegram-monitor.vercel.app'}/api/bot`;
    this.apiBase = `https://api.telegram.org/bot${this.botToken}`;
  }

  async setWebhook() {
    const url = `${this.apiBase}/setWebhook`;
    
    const payload = {
      url: this.webhookUrl,
      max_connections: 40,
      allowed_updates: ['message', 'callback_query', 'inline_query']
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      return { success: data.ok, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async removeWebhook() {
    const url = `${this.apiBase}/setWebhook`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: '' })
      });

      const data = await response.json();
      return { success: data.ok, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getWebhookInfo() {
    const url = `${this.apiBase}/getWebhookInfo`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      return { success: data.ok, data: data.result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async setBotCommands() {
    const commands = [
      { command: 'start', description: 'Welcome message and bot introduction' },
      { command: 'help', description: 'Show all available commands' },
      { command: 'plasmabrand', description: 'Get Plasma brand resources and guidelines' },
      { command: 'status', description: 'Bot status and statistics (authorized users)' },
      { command: 'addtask', description: 'Add a new task (authorized users)' },
      { command: 'tasks', description: 'List pending tasks (authorized users)' },
      { command: 'complete', description: 'Mark task as completed (authorized users)' },
      { command: 'save', description: 'Save message context (authorized users)' },
      { command: 'recent', description: 'Get recent context (authorized users)' },
      { command: 'search', description: 'Search messages (authorized users)' },
      { command: 'monitor', description: 'Trigger system monitoring (authorized users)' },
      { command: 'endpoints', description: 'Check monitored endpoints (authorized users)' },
      { command: 'webhook', description: 'Webhook configuration (authorized users)' },
      { command: 'sync', description: 'Sync data (authorized users)' }
    ];

    const url = `${this.apiBase}/setMyCommands`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands })
      });

      const data = await response.json();
      return { success: data.ok, data, commandCount: commands.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getBotInfo() {
    const url = `${this.apiBase}/getMe`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      return { success: data.ok, data: data.result };
    } catch (error) {
      return { success: false, error: error.message };
    }
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

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return res.status(500).json({
      success: false,
      error: 'TELEGRAM_BOT_TOKEN not configured'
    });
  }

  try {
    const webhookManager = new WebhookManager();
    const { action } = req.query;

    switch (action) {
      case 'set':
        const setResult = await webhookManager.setWebhook();
        const commandsResult = await webhookManager.setBotCommands();
        
        res.status(200).json({
          success: setResult.success && commandsResult.success,
          webhook: setResult,
          commands: commandsResult,
          webhookUrl: webhookManager.webhookUrl,
          timestamp: new Date().toISOString()
        });
        break;

      case 'remove':
        const removeResult = await webhookManager.removeWebhook();
        res.status(200).json({
          success: removeResult.success,
          result: removeResult,
          timestamp: new Date().toISOString()
        });
        break;

      case 'info':
        const [webhookInfo, botInfo] = await Promise.all([
          webhookManager.getWebhookInfo(),
          webhookManager.getBotInfo()
        ]);
        
        res.status(200).json({
          success: webhookInfo.success && botInfo.success,
          webhook: webhookInfo.data,
          bot: botInfo.data,
          expectedUrl: webhookManager.webhookUrl,
          timestamp: new Date().toISOString()
        });
        break;

      case 'commands':
        const commandsSetResult = await webhookManager.setBotCommands();
        res.status(200).json({
          success: commandsSetResult.success,
          result: commandsSetResult,
          timestamp: new Date().toISOString()
        });
        break;

      default:
        // Default: show current status
        const [currentWebhook, currentBot] = await Promise.all([
          webhookManager.getWebhookInfo(),
          webhookManager.getBotInfo()
        ]);

        res.status(200).json({
          bot: currentBot.data,
          webhook: currentWebhook.data,
          configuration: {
            expectedUrl: webhookManager.webhookUrl,
            botToken: process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'missing',
            authorizedUser: process.env.AUTHORIZED_USERNAME || 'not set'
          },
          actions: {
            set: '/api/setup-webhook?action=set',
            remove: '/api/setup-webhook?action=remove',
            info: '/api/setup-webhook?action=info',
            commands: '/api/setup-webhook?action=commands'
          },
          timestamp: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Webhook setup error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}