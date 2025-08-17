// Advanced Telegram bot endpoint with MCP-inspired features
// Handles commands, task management, message storage, and AI integration

import fetch from 'node-fetch';
import PersistentStorage from '../lib/storage.js';
import ClaudeIntegration from '../lib/claude-integration.js';

class TelegramBot {
  constructor() {
    this.config = {
      telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID,
        authorizedUsername: process.env.AUTHORIZED_USERNAME || 'Xkonjin'
      },
      webhookSecret: process.env.WEBHOOK_SECRET || 'your-secret-key-here'
    };
    
    // Persistent storage with Vercel KV
    this.storage = new PersistentStorage();
    
    // Claude Code integration
    this.claude = new ClaudeIntegration();
  }

  async sendMessage(chatId, text, options = {}) {
    const url = `https://api.telegram.org/bot${this.config.telegram.botToken}/sendMessage`;
    
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      ...options
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  isAuthorized(message) {
    const username = message?.from?.username?.toLowerCase();
    return username === this.config.telegram.authorizedUsername.toLowerCase();
  }

  isBasicCommand(text) {
    const basicCommands = ['/start', '/help', '/plasmabrand'];
    return basicCommands.some(cmd => text.toLowerCase().startsWith(cmd));
  }

  extractActionItems(text) {
    const actionKeywords = ['need to', 'should', 'must', 'have to', 'will', 'going to', 'plan to', 'todo', 'task'];
    const sentences = text.toLowerCase().split('.');
    const actionItems = [];
    
    for (const sentence of sentences) {
      if (actionKeywords.some(keyword => sentence.includes(keyword))) {
        actionItems.push(sentence.trim());
      }
    }
    
    return actionItems.slice(0, 3); // Limit to 3 action items
  }

  autoTagMessage(text, sourceChat) {
    const tags = [];
    
    // Common tag keywords
    if (['urgent', 'asap', 'immediately'].some(word => text.toLowerCase().includes(word))) {
      tags.push('urgent');
    }
    if (['deadline', 'due', 'timeline'].some(word => text.toLowerCase().includes(word))) {
      tags.push('deadline');
    }
    if (['meeting', 'call', 'zoom'].some(word => text.toLowerCase().includes(word))) {
      tags.push('meeting');
    }
    if (['plasma', 'brand'].some(word => text.toLowerCase().includes(word))) {
      tags.push('plasma');
    }
    if (['project', 'work', 'development'].some(word => text.toLowerCase().includes(word))) {
      tags.push('project');
    }
    
    return tags.slice(0, 5); // Limit to 5 tags
  }

  async addTask(description, priority = 'Medium', tags = []) {
    const task = {
      description,
      priority,
      status: 'Pending',
      tags: Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()),
      source: 'telegram',
      completionDate: ''
    };
    
    return await this.storage.addTask(task);
  }

  async completeTask(taskId) {
    return await this.storage.completeTask(taskId);
  }

  async listTasks(status = 'Pending', limit = 10) {
    if (status === 'Pending') {
      return await this.storage.getPendingTasks(limit);
    }
    const tasks = await this.storage.getTasks();
    return tasks
      .filter(task => status === 'All' || task.status === status)
      .slice(0, limit);
  }

  async searchTasks(keyword) {
    return await this.storage.searchTasks(keyword);
  }

  async saveMessage(text, sourceChat, tags = []) {
    const autoTags = this.autoTagMessage(text, sourceChat);
    const allTags = [...new Set([...autoTags, ...tags])];
    const actionItems = this.extractActionItems(text);
    
    const message = {
      text,
      sourceChat,
      tags: allTags,
      actionItems,
      contextType: 'saved'
    };
    
    const savedMessage = await this.storage.addMessage(message);
    
    // Auto-create tasks from action items
    let tasksCreated = 0;
    for (const action of actionItems) {
      if (action.length > 10) {
        await this.addTask(`From ${sourceChat}: ${action}`, 'Medium', ['auto-extracted']);
        tasksCreated++;
      }
    }
    
    return { message: savedMessage, tasksCreated };
  }

  async searchMessages(keyword, limit = 5) {
    return await this.storage.searchMessages(keyword, limit);
  }

  async getRecentMessages(hours = 24) {
    return await this.storage.getRecentMessages(hours);
  }

  async handleMemoryCommand(args) {
    const parts = args.split(' ');
    const action = parts[0];
    const query = parts.slice(1).join(' ');

    switch (action) {
      case 'search':
        if (!query) {
          return '❌ Usage: /memory search [query]\nExample: /memory search "telegram setup"';
        }
        return await this.claude.executeClaudeCommand(`memory search "${query}"`);
      
      case 'status':
        return await this.claude.executeClaudeCommand('memory status');
      
      case 'sync':
        const syncResult = await this.claude.syncWithLocalMemory();
        return `🔄 **Memory Sync**\n\n${syncResult.success ? 
          `✅ Synced ${syncResult.synced} operations` : 
          `❌ Failed: ${syncResult.error}`}\n\n🕐 Timestamp: ${syncResult.timestamp || new Date().toLocaleString()}`;
      
      case 'summary':
        return await this.claude.executeClaudeCommand('memory summary --days 7');
      
      default:
        return '🧠 **Memory Commands:**\n\n• `search [query]` - Search memory\n• `status` - System status\n• `sync` - Sync with master\n• `summary` - Recent activity';
    }
  }

  async handleProjectCommand(args) {
    const parts = args.split(' ');
    const action = parts[0];
    const projectName = parts.slice(1).join(' ');

    switch (action) {
      case 'list':
        return await this.claude.executeClaudeCommand('project list');
      
      case 'status':
        if (!projectName) {
          return '❌ Usage: /project status [name]\nExample: /project status plasma';
        }
        return await this.claude.executeClaudeCommand(`project status ${projectName}`);
      
      case 'switch':
        if (!projectName) {
          return '❌ Usage: /project switch [name]\nExample: /project switch plasma';
        }
        return await this.claude.executeClaudeCommand(`project switch ${projectName}`);
      
      case 'stats':
        return await this.claude.executeClaudeCommand('project stats');
      
      default:
        return '📁 **Project Commands:**\n\n• `list` - List all projects\n• `status [name]` - Project status\n• `switch [name]` - Switch project\n• `stats` - Project statistics';
    }
  }

  async handleCommand(message) {
    const chatId = message.chat.id;
    const messageId = message.message_id;
    const text = message.text.trim();
    const username = message.from?.username || '';
    
    // Parse command and arguments
    const parts = text.slice(1).split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');
    
    // Check authorization
    const isBasic = this.isBasicCommand(text);
    const isAuthorized = this.isAuthorized(message);
    
    if (!isBasic && !isAuthorized) {
      return await this.sendMessage(chatId, 
        `🔒 **Access Restricted**\n\nOnly @${this.config.telegram.authorizedUsername} can use advanced commands.\n\nAvailable for everyone:\n• /help\n• /plasmabrand\n• /start`,
        { reply_to_message_id: messageId }
      );
    }
    
    let responseText = '';
    
    switch (command) {
      case 'start':
        responseText = `🤖 **Welcome to Jinbot Cloud!**

I'm your personal assistant bot running 24/7 on Vercel with advanced features:

**Quick Commands:**
/help - Show all commands
/plasmabrand - Get Plasma brand resources

**For @${this.config.telegram.authorizedUsername}:**
Full access to task management, monitoring, and AI tools.

Type /help for the complete command list!`;
        break;
        
      case 'help':
        if (isAuthorized) {
          responseText = `🤖 **Jinbot Cloud Commands** (Full Access)

**📱 Basic:**
/help - This help message
/status - Bot status & statistics
/plasmabrand - Plasma brand resources

**📋 Task Management:**
/addtask [description] - Add new task
/tasks - List pending tasks
/complete [task_id] - Complete task
/searchtasks [keyword] - Search tasks

**💬 Context & Messages:**
/save [message] - Save message context
/recent - Get recent context (24h)
/search [keyword] - Search messages

**⚙️ Monitoring:**
/monitor - Trigger system monitoring
/endpoints - Check monitored endpoints
/alerts - View recent alerts

**🧠 Claude Code:**
/claude [command] - Execute Claude Code commands
/memory [action] - Memory system operations
/project [action] - Project management

**🔧 System:**
/webhook - Webhook configuration
/sync - Sync data
/export - Export data

Advanced features available only for @${this.config.telegram.authorizedUsername}`;
        } else {
          responseText = `🤖 **Jinbot Cloud Commands** (Public)

**📱 Available Commands:**
/help - This help message
/plasmabrand - Get Plasma brand resources
/start - Welcome message

**🔒 Advanced Features:**
Advanced task management, monitoring, and AI tools are restricted to @${this.config.telegram.authorizedUsername}.

Contact @${this.config.telegram.authorizedUsername} for access to additional features.`;
        }
        break;
        
      case 'plasmabrand':
        responseText = '🔗 Plasma Brand Resources: https://plasma.to/brand';
        break;
        
      case 'status':
        if (isAuthorized) {
          const stats = await this.storage.getStats();
          responseText = `🤖 **Jinbot Cloud Status**

✅ Bot running on Vercel serverless
🔒 Security: Active (@${this.config.telegram.authorizedUsername} only)
📊 Tasks: ${stats.totalTasks} total (${stats.pendingTasks} pending)
💬 Messages: ${stats.totalMessages} stored
📈 Completion Rate: ${stats.completionRate}%
💾 Storage: ${stats.storageType}
☁️ Platform: Vercel serverless functions
📡 Monitoring: Active with daily checks

🌐 Dashboard: ${process.env.VERCEL_URL || 'Not available'}`;
        }
        break;
        
      case 'addtask':
        if (isAuthorized) {
          if (!args) {
            responseText = '❌ Usage: /addtask [description]\nExample: /addtask Review quarterly reports';
          } else {
            const task = await this.addTask(args);
            responseText = `✅ Task added successfully!\nID: ${task.id}\nDescription: ${task.description}\nPriority: ${task.priority}`;
          }
        }
        break;
        
      case 'tasks':
        if (isAuthorized) {
          const tasks = await this.listTasks();
          if (tasks.length === 0) {
            responseText = 'No pending tasks found.';
          } else {
            responseText = '📋 **Pending Tasks:**\n\n';
            tasks.forEach(task => {
              const priorityEmoji = task.priority === 'High' ? '🔴' : task.priority === 'Medium' ? '🟡' : '🟢';
              responseText += `⏳ ${priorityEmoji} **${task.id}**: ${task.description}\n`;
              if (task.tags.length > 0) {
                responseText += `   🏷️ Tags: ${task.tags.join(', ')}\n`;
              }
              responseText += '\n';
            });
          }
        }
        break;
        
      case 'complete':
        if (isAuthorized) {
          if (!args) {
            responseText = '❌ Usage: /complete [task_id]\nExample: /complete task_001';
          } else {
            const task = await this.completeTask(args.trim());
            if (task) {
              responseText = `✅ Task ${task.id} marked as completed!\nDescription: ${task.description}`;
            } else {
              responseText = `❌ Task ${args.trim()} not found`;
            }
          }
        }
        break;
        
      case 'save':
        if (isAuthorized) {
          if (!args) {
            responseText = '❌ Usage: /save [message]\nExample: /save Important meeting tomorrow';
          } else {
            const result = await this.saveMessage(args, `Chat ${chatId}`);
            responseText = `✅ Message saved successfully!\n📁 Source: Chat ${chatId}\n🏷️ Tags: ${result.message.tags.join(', ')}`;
            if (result.tasksCreated > 0) {
              responseText += `\n📋 Auto-created tasks: ${result.tasksCreated}`;
            }
          }
        }
        break;
        
      case 'recent':
        if (isAuthorized) {
          const recentMessages = await this.getRecentMessages();
          if (recentMessages.length === 0) {
            responseText = 'No recent messages found in the last 24 hours.';
          } else {
            responseText = '📬 **Recent Context (Last 24h):**\n\n';
            recentMessages.forEach(msg => {
              const timestamp = new Date(msg.timestamp).toLocaleString();
              responseText += `🕐 ${timestamp} | 📁 ${msg.sourceChat}\n`;
              responseText += `💬 ${msg.text.substring(0, 100)}${msg.text.length > 100 ? '...' : ''}\n\n`;
            });
          }
        }
        break;
        
      case 'search':
        if (isAuthorized) {
          if (!args) {
            responseText = '❌ Usage: /search [keyword]\nExample: /search meeting';
          } else {
            const messages = await this.searchMessages(args);
            if (messages.length === 0) {
              responseText = `No messages found matching '${args}'`;
            } else {
              responseText = `🔍 **Messages matching '${args}':**\n\n`;
              messages.forEach(msg => {
                const timestamp = new Date(msg.timestamp).toLocaleString();
                responseText += `📅 ${timestamp} | 📁 ${msg.sourceChat}\n`;
                responseText += `💬 ${msg.text}\n\n`;
              });
            }
          }
        }
        break;
        
      case 'monitor':
        if (isAuthorized) {
          // Trigger monitoring check
          try {
            const monitorResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/monitor`, {
              method: 'POST'
            });
            const monitorData = await monitorResponse.json();
            
            responseText = `🔍 **Monitoring Check Triggered**\n\n`;
            responseText += `📊 Endpoints checked: ${monitorData.summary?.endpointsChecked || 0}\n`;
            responseText += `🚨 Alerts generated: ${monitorData.summary?.alertsGenerated || 0}\n`;
            responseText += `✅ Healthy endpoints: ${monitorData.summary?.healthyEndpoints || 0}\n\n`;
            responseText += `🕐 Next check: ${monitorData.nextCheck || 'Scheduled'}`;
          } catch (error) {
            responseText = `❌ Error triggering monitoring check: ${error.message}`;
          }
        }
        break;

      case 'claude':
        if (isAuthorized) {
          if (!args) {
            responseText = '❌ Usage: /claude [command]\nExample: /claude status\nExample: /claude memory search "telegram"';
          } else {
            const result = await this.claude.executeClaudeCommand(args);
            responseText = result;
          }
        }
        break;

      case 'memory':
        if (isAuthorized) {
          if (!args) {
            responseText = '🧠 **Memory Commands:**\n\n• `/memory search [query]` - Search memory\n• `/memory status` - Memory system status\n• `/memory sync` - Sync with master memory\n• `/memory summary` - Recent activity summary';
          } else {
            const result = await this.handleMemoryCommand(args);
            responseText = result;
          }
        }
        break;

      case 'project':
        if (isAuthorized) {
          if (!args) {
            responseText = '📁 **Project Commands:**\n\n• `/project list` - List all projects\n• `/project status [name]` - Project status\n• `/project switch [name]` - Switch active project\n• `/project stats` - Project statistics';
          } else {
            const result = await this.handleProjectCommand(args);
            responseText = result;
          }
        }
        break;

      case 'searchtasks':
        if (isAuthorized) {
          if (!args) {
            responseText = '❌ Usage: /searchtasks [keyword]\nExample: /searchtasks plasma';
          } else {
            const tasks = await this.searchTasks(args);
            if (tasks.length === 0) {
              responseText = `No tasks found matching '${args}'`;
            } else {
              responseText = `🔍 **Tasks matching '${args}':**\n\n`;
              tasks.forEach(task => {
                const priorityEmoji = task.priority === 'High' ? '🔴' : task.priority === 'Medium' ? '🟡' : '🟢';
                const statusEmoji = task.status === 'Completed' ? '✅' : '⏳';
                responseText += `${statusEmoji} ${priorityEmoji} **${task.id}**: ${task.description}\n`;
                if (task.tags.length > 0) {
                  responseText += `   🏷️ Tags: ${task.tags.join(', ')}\n`;
                }
                responseText += '\n';
              });
            }
          }
        }
        break;

      case 'sync':
        if (isAuthorized) {
          const syncResult = await this.claude.syncWithLocalMemory();
          const storageSync = await this.storage.syncWithMasterMemory();
          
          responseText = `🔄 **Data Sync Results**\n\n`;
          responseText += `📡 **Claude Memory Sync:**\n`;
          responseText += syncResult.success ? 
            `✅ Synced ${syncResult.synced} operations` : 
            `❌ Failed: ${syncResult.error}`;
          
          responseText += `\n\n💾 **Storage Sync:**\n`;
          responseText += storageSync.success ? 
            `✅ Synced ${storageSync.synced.tasks} tasks, ${storageSync.synced.messages} messages` : 
            `❌ Failed: ${storageSync.error}`;
          
          responseText += `\n\n🕐 Last sync: ${new Date().toLocaleString()}`;
        }
        break;

      case 'export':
        if (isAuthorized) {
          const exportData = await this.storage.exportData();
          responseText = `📤 **Data Export**\n\n📊 **Statistics:**\n• Tasks: ${exportData.stats.totalTasks} (${exportData.stats.pendingTasks} pending)\n• Messages: ${exportData.stats.totalMessages}\n• Completion Rate: ${exportData.stats.completionRate}%\n• Storage: ${exportData.stats.storageType}\n\n📁 **Export includes:**\n• All tasks with metadata\n• Last 100 messages\n• Usage statistics\n• System information\n\n💾 Data exported at: ${exportData.exportedAt}`;
        }
        break;
        
      default:
        responseText = isAuthorized ? 
          `❌ Unknown command: /${command}\n\nType /help for available commands` :
          `🔒 Command /${command} requires authorization.\n\nPublic commands: /help, /plasmabrand, /start`;
    }
    
    return await this.sendMessage(chatId, responseText, { reply_to_message_id: messageId });
  }

  async handleMessage(message) {
    const chatId = message.chat.id;
    const messageId = message.message_id;
    const text = message.text || '';
    const username = message.from?.username || '';
    
    if (text.startsWith('/')) {
      return await this.handleCommand(message);
    }
    
    // Handle general conversation for authorized user
    if (this.isAuthorized(message)) {
      // Save the message as context
      const result = await this.saveMessage(text, `Personal Chat (@${username})`, ['chat', 'personal']);
      
      // Generate intelligent response
      const actionItems = result.message.actionItems;
      let responseText = '';
      
      if (text.includes('?')) {
        responseText = "🤔 I've noted your question. Use /search to find related context.";
      } else if (actionItems.length > 0) {
        responseText = `⚡ Detected ${actionItems.length} potential action items - auto-creating tasks.`;
      } else if (['urgent', 'important', 'asap'].some(word => text.toLowerCase().includes(word))) {
        responseText = "🚨 Marked as urgent priority.";
      } else if (['reminder', 'remember', 'note'].some(word => text.toLowerCase().includes(word))) {
        responseText = "📝 Saved to your personal notes.";
      } else {
        responseText = "💬 Message saved to your context. Need me to do something specific? Try /help for commands.";
      }
      
      if (result.tasksCreated > 0) {
        responseText += `\n📋 Auto-created ${result.tasksCreated} tasks from action items.`;
      }
      
      return await this.sendMessage(chatId, responseText, { reply_to_message_id: messageId });
    } else {
      // Unauthorized user
      return await this.sendMessage(chatId, 
        `🔒 **Access Restricted**\n\nThis bot is for @${this.config.telegram.authorizedUsername} only.\n\nPublic commands:\n• /help\n• /plasmabrand\n• /start`,
        { reply_to_message_id: messageId }
      );
    }
  }

  async processUpdate(update) {
    if (update.message) {
      return await this.handleMessage(update.message);
    }
    return null;
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
    const bot = new TelegramBot();
    
    if (req.method === 'POST') {
      // Handle webhook update
      const update = req.body;
      const result = await bot.processUpdate(update);
      
      res.status(200).json({
        success: true,
        processed: !!result,
        timestamp: new Date().toISOString()
      });
    } else {
      // GET request - return bot status
      res.status(200).json({
        botName: 'Jinbot Cloud',
        version: '2.0.0',
        platform: 'Vercel Serverless',
        features: [
          'Task Management',
          'Message Storage', 
          'System Monitoring',
          'AI Integration',
          'Security Controls'
        ],
        authorizedUser: process.env.AUTHORIZED_USERNAME || 'Xkonjin',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Bot error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}