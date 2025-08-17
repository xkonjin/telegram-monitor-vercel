// Claude Code Notification Webhook
// Receives notifications from Claude Code instances and routes to appropriate group topics

import GroupManager from '../lib/group-manager.js';

class ClaudeNotificationHandler {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.groupChatId = process.env.JINBOT_HQ_GROUP_ID || process.env.TELEGRAM_CHAT_ID;
    this.webhookSecret = process.env.CLAUDE_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
    this.groupManager = new GroupManager(this.botToken);
    
    // Notification types and routing
    this.notificationRouting = {
      'task_completion': 'general',
      'error_detected': 'monitoring', 
      'decision_required': 'decisions',
      'code_review': 'development',
      'content_ready': 'content',
      'system_alert': 'monitoring',
      'ai_experiment': 'ai-research',
      'workflow_trigger': 'automation'
    };
  }

  validateRequest(req) {
    // Verify webhook secret
    const providedSecret = req.headers['x-claude-secret'] || req.body?.secret;
    if (providedSecret !== this.webhookSecret) {
      return { valid: false, error: 'Invalid webhook secret' };
    }

    // Validate required fields
    if (!req.body?.message && !req.body?.notification) {
      return { valid: false, error: 'Missing notification content' };
    }

    return { valid: true };
  }

  async processClaudeNotification(payload) {
    try {
      // Extract notification data
      const notification = payload.notification || {
        type: payload.type || 'general',
        message: payload.message,
        context: payload.context,
        instance: payload.instance || 'default',
        project: payload.project,
        requiresDecision: payload.requiresDecision || false,
        actions: payload.actions || [],
        priority: payload.priority || 'medium'
      };

      // Determine target topic
      const topicKey = this.notificationRouting[notification.type] || 'general';
      
      // Format notification for group
      const formattedNotification = this.groupManager.formatClaudeInstanceNotification(notification);
      
      // Send to appropriate topic in group
      const result = await this.groupManager.sendClaudeNotification(
        this.groupChatId,
        topicKey,
        formattedNotification
      );

      return {
        success: result.success,
        topicKey,
        topicId: result.topicId,
        messageId: result.messageId,
        error: result.error
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleDecisionWebhook(payload) {
    try {
      const decision = payload.decision;
      const originalMessageId = payload.messageId;
      const context = payload.context || '';

      const result = await this.groupManager.handleDecisionResponse(
        this.groupChatId,
        originalMessageId,
        decision,
        context
      );

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async setupGroupTopics() {
    try {
      if (!this.groupChatId) {
        return {
          success: false,
          error: 'Group chat ID not configured',
          instructions: 'Set JINBOT_HQ_GROUP_ID environment variable'
        };
      }

      const result = await this.groupManager.setupJinbotHQ(this.groupChatId);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  generateClaudeCodeIntegrationCommands() {
    return {
      notify_command: {
        bash: `curl -X POST "https://telegram-monitor.vercel.app/api/claude-notify" \\
  -H "Content-Type: application/json" \\
  -H "X-Claude-Secret: ${this.webhookSecret}" \\
  -d '{
    "type": "task_completion",
    "message": "Task completed successfully",
    "context": "File: example.py, Lines: 50, Tests: Passed",
    "instance": "development",
    "project": "telegram-bot"
  }'`,
        
        python: `
import requests

def notify_claude_completion(message, context="", instance="default", project=""):
    webhook_url = "https://telegram-monitor.vercel.app/api/claude-notify"
    headers = {
        "Content-Type": "application/json",
        "X-Claude-Secret": "${this.webhookSecret}"
    }
    payload = {
        "type": "task_completion",
        "message": message,
        "context": context,
        "instance": instance,
        "project": project
    }
    
    response = requests.post(webhook_url, json=payload, headers=headers)
    return response.json()

# Usage:
# notify_claude_completion("Code review completed", "3 files reviewed, 2 issues found", "development", "plasma")
        `
      },
      
      decision_request: {
        bash: `curl -X POST "https://telegram-monitor.vercel.app/api/claude-notify" \\
  -H "Content-Type: application/json" \\
  -H "X-Claude-Secret: ${this.webhookSecret}" \\
  -d '{
    "type": "decision_required",
    "message": "Deploy to production?",
    "context": "All tests passed, code review complete",
    "requiresDecision": true,
    "actions": ["Deploy now", "Schedule for later", "Run additional tests"],
    "priority": "high"
  }'`
      }
    };
  }
}

// Vercel serverless function handler
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Claude-Secret');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const notificationHandler = new ClaudeNotificationHandler();
    
    if (req.method === 'POST') {
      // Validate request
      const validation = notificationHandler.validateRequest(req);
      if (!validation.valid) {
        return res.status(401).json({
          success: false,
          error: validation.error
        });
      }

      const { action } = req.query;
      let result;

      switch (action) {
        case 'setup':
          // Setup group topics
          result = await notificationHandler.setupGroupTopics();
          break;

        case 'decision':
          // Handle decision response
          result = await notificationHandler.handleDecisionWebhook(req.body);
          break;

        default:
          // Process Claude notification
          result = await notificationHandler.processClaudeNotification(req.body);
      }

      res.status(200).json({
        success: result.success,
        result,
        timestamp: new Date().toISOString()
      });

    } else {
      // GET request - return integration information
      const commands = notificationHandler.generateClaudeCodeIntegrationCommands();
      
      res.status(200).json({
        service: 'Claude Code Notification System',
        version: '1.0.0',
        endpoints: {
          notify: '/api/claude-notify',
          setup: '/api/claude-notify?action=setup',
          decision: '/api/claude-notify?action=decision'
        },
        groupChatId: notificationHandler.groupChatId || 'not configured',
        topics: Object.keys(notificationHandler.groupManager.claudeTopics),
        integrationCommands: commands,
        usage: {
          bash: 'curl -X POST "https://telegram-monitor.vercel.app/api/claude-notify" -H "X-Claude-Secret: SECRET" -d \'{"message": "Task completed"}\'',
          python: 'requests.post("https://telegram-monitor.vercel.app/api/claude-notify", json=payload, headers=headers)'
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Claude notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}