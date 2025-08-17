// Jinbot Test HQ Group Management System
// Manages forum topics for different Claude Code instances and workflows

import fetch from 'node-fetch';

class GroupManager {
  constructor(botToken) {
    this.botToken = botToken;
    this.apiBase = `https://api.telegram.org/bot${botToken}`;
    
    // Predefined topics for Claude Code instances
    this.claudeTopics = {
      'general': {
        name: '🎯 General Claude',
        color: 0x6FB9F0,
        description: 'General Claude Code tasks and discussions'
      },
      'development': {
        name: '💻 Development',
        color: 0x2DD4BF,
        description: 'Code development, debugging, and implementation'
      },
      'content': {
        name: '📝 Content & Strategy',
        color: 0xF59E0B,
        description: 'Content creation, marketing, and strategy work'
      },
      'monitoring': {
        name: '📡 System Monitoring',
        color: 0xEF4444,
        description: 'System health, alerts, and infrastructure'
      },
      'ai-research': {
        name: '🧠 AI Research',
        color: 0x8B5CF6,
        description: 'AI experiments, model testing, and research'
      },
      'decisions': {
        name: '⚖️ Decision Center',
        color: 0x10B981,
        description: 'Important decisions requiring approval'
      },
      'automation': {
        name: '🤖 Automation Hub',
        color: 0x3B82F6,
        description: 'Workflow automation and bot management'
      }
    };
  }

  async makeApiCall(method, params = {}) {
    try {
      const response = await fetch(`${this.apiBase}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      const data = await response.json();
      return { success: data.ok, data: data.result, error: data.description };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async setupJinbotHQ(groupChatId) {
    try {
      console.log('Setting up Jinbot Test HQ with topics...');
      
      const results = {};
      
      // Create forum topics for each Claude instance
      for (const [key, topic] of Object.entries(this.claudeTopics)) {
        const result = await this.createForumTopic(groupChatId, topic.name, topic.color);
        results[key] = result;
        
        if (result.success) {
          console.log(`Created topic: ${topic.name} (ID: ${result.topicId})`);
          
          // Send welcome message to each topic
          await this.sendTopicMessage(
            groupChatId, 
            result.topicId, 
            `🎯 **${topic.name} Channel Active**\n\n${topic.description}\n\n✅ Ready for Claude Code notifications and decisions!`
          );
        }
        
        // Rate limit to avoid hitting API limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      return {
        success: true,
        topicsCreated: Object.keys(results).length,
        results
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createForumTopic(chatId, name, iconColor = 0x6FB9F0) {
    const result = await this.makeApiCall('createForumTopic', {
      chat_id: chatId,
      name: name,
      icon_color: iconColor
    });

    if (result.success) {
      return {
        success: true,
        topicId: result.data.message_thread_id,
        name: name,
        iconColor: iconColor
      };
    }

    return { success: false, error: result.error };
  }

  async sendTopicMessage(chatId, topicId, message, parseMode = 'Markdown') {
    const result = await this.makeApiCall('sendMessage', {
      chat_id: chatId,
      message_thread_id: topicId,
      text: message,
      parse_mode: parseMode
    });

    return {
      success: result.success,
      messageId: result.success ? result.data.message_id : null,
      error: result.error
    };
  }

  async sendClaudeNotification(groupChatId, topicKey, notification) {
    try {
      // Get topic info
      const topic = this.claudeTopics[topicKey];
      if (!topic) {
        throw new Error(`Unknown topic: ${topicKey}`);
      }

      // Find topic ID (in production, this would be stored)
      const topicId = await this.getTopicId(groupChatId, topic.name);
      
      if (!topicId) {
        // Create topic if it doesn't exist
        const createResult = await this.createForumTopic(groupChatId, topic.name, topic.color);
        if (!createResult.success) {
          throw new Error(`Failed to create topic: ${createResult.error}`);
        }
        topicId = createResult.topicId;
      }

      // Format notification message
      const timestamp = new Date().toLocaleString();
      let message = `🤖 **Claude Code Notification**\n\n`;
      message += `**Type**: ${notification.type}\n`;
      message += `**Status**: ${notification.status}\n`;
      message += `**Time**: ${timestamp}\n\n`;
      message += `**Message**: ${notification.message}\n`;
      
      if (notification.context) {
        message += `\n**Context**: ${notification.context}`;
      }
      
      if (notification.requiresDecision) {
        message += `\n\n⚖️ **Decision Required**\n`;
        message += `Reply with: ✅ Approve | ❌ Reject | 🤔 More Info`;
      }
      
      if (notification.actions) {
        message += `\n\n🎯 **Available Actions**:\n`;
        notification.actions.forEach((action, index) => {
          message += `${index + 1}. ${action}\n`;
        });
      }

      // Send to topic
      const sendResult = await this.sendTopicMessage(groupChatId, topicId, message);
      
      return {
        success: sendResult.success,
        topicId,
        messageId: sendResult.messageId,
        error: sendResult.error
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getTopicId(groupChatId, topicName) {
    // In production, this would query stored topic mappings
    // For now, return null to trigger topic creation
    return null;
  }

  async handleDecisionResponse(groupChatId, messageId, decision, context = '') {
    try {
      let response = '';
      
      switch (decision.toLowerCase()) {
        case 'approve':
        case '✅':
          response = `✅ **Decision: APPROVED**\n\nApproved by @xkonjin\nTime: ${new Date().toLocaleString()}\n\n🎯 Proceeding with action...`;
          break;
          
        case 'reject':  
        case '❌':
          response = `❌ **Decision: REJECTED**\n\nRejected by @xkonjin\nTime: ${new Date().toLocaleString()}\n\n🛑 Action cancelled.`;
          break;
          
        case 'info':
        case '🤔':
          response = `🤔 **Request for More Information**\n\nRequested by @xkonjin\nTime: ${new Date().toLocaleString()}\n\n📋 Gathering additional details...`;
          break;
          
        default:
          response = `📝 **Decision Noted**: ${decision}\n\nFrom @xkonjin\nTime: ${new Date().toLocaleString()}`;
      }
      
      if (context) {
        response += `\n\n**Context**: ${context}`;
      }

      // Reply to the original message
      const result = await this.makeApiCall('sendMessage', {
        chat_id: groupChatId,
        text: response,
        reply_to_message_id: messageId,
        parse_mode: 'Markdown'
      });

      return { success: result.success, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getTopicForClaudeInstance(instanceType) {
    // Map Claude Code instance types to appropriate topics
    const mapping = {
      'general-purpose': 'general',
      'statusline-setup': 'development',
      'output-style-setup': 'development',
      'code-development': 'development',
      'content-creation': 'content',
      'system-monitoring': 'monitoring',
      'ai-research': 'ai-research',
      'decision-required': 'decisions',
      'automation': 'automation'
    };

    return mapping[instanceType] || 'general';
  }

  formatClaudeInstanceNotification(instanceData) {
    const topicKey = this.getTopicForClaudeInstance(instanceData.type);
    
    return {
      topicKey,
      type: instanceData.type,
      status: instanceData.status || 'active',
      message: instanceData.message,
      context: instanceData.context,
      requiresDecision: instanceData.requiresDecision || false,
      actions: instanceData.actions || [],
      instance: instanceData.instance || 'default',
      project: instanceData.project,
      priority: instanceData.priority || 'medium'
    };
  }
}

export default GroupManager;