// Simplified Telegram bot for instant responses
// Focused on immediate response without complex storage operations

import fetch from 'node-fetch';

async function sendTelegramMessage(chatId, text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });

    const data = await response.json();
    console.log('Message sent:', data.ok ? 'Success' : data.description);
    return data;
  } catch (error) {
    console.error('Send message error:', error);
    throw error;
  }
}

function isAuthorized(message) {
  const username = message?.from?.username?.toLowerCase();
  
  // Multiple ways to check authorization
  const validUsernames = ['xkonjin', 'Xkonjin'];
  const validChatId = '325698032';
  
  const isValidUsername = validUsernames.some(u => u.toLowerCase() === username);
  const isValidChatId = message?.from?.id?.toString() === validChatId;
  
  // Detailed debug logging
  console.log('AUTHORIZATION DEBUG:', {
    messageUsername: username,
    messageUsernameRaw: message?.from?.username,
    userId: message?.from?.id,
    chatId: message?.chat?.id,
    isValidUsername,
    isValidChatId,
    fromData: message?.from
  });
  
  const isAuthorized = isValidUsername || isValidChatId;
  console.log('Final authorization result:', isAuthorized);
  
  return isAuthorized;
}

async function handleCommand(message) {
  const chatId = message.chat.id;
  const text = message.text.trim();
  const command = text.slice(1).split(' ')[0].toLowerCase();
  const args = text.slice(1).split(' ').slice(1).join(' ');
  
  console.log(`Processing command: /${command} from user: ${message.from?.username}`);
  
  // Check authorization for advanced commands
  const basicCommands = ['start', 'help', 'plasmabrand'];
  const isBasic = basicCommands.includes(command);
  const authorized = isAuthorized(message);
  
  if (!isBasic && !authorized) {
    return await sendTelegramMessage(chatId, 
      `🔒 **Access Restricted**\n\nOnly @${process.env.AUTHORIZED_USERNAME || 'Xkonjin'} can use advanced commands.\n\nPublic commands: /start, /help, /plasmabrand`
    );
  }
  
  let response = '';
  
  switch (command) {
    case 'start':
      response = `🤖 **Welcome to Jinbot Cloud!**\n\nI'm your 24/7 personal assistant running on Vercel.\n\n**Quick Commands:**\n• /help - Show all commands\n• /status - System status\n• /ping - Test response\n\n**For @${process.env.AUTHORIZED_USERNAME || 'Xkonjin'}:**\nFull access to advanced features!\n\nType /help for complete command list.`;
      break;
      
    case 'help':
      if (authorized) {
        response = `🤖 **Jinbot Cloud Commands**\n\n**📱 Basic:**\n• /help - This help\n• /status - Bot status\n• /ping - Test response\n• /plasmabrand - Plasma resources\n\n**📋 Quick Actions:**\n• /addtask [task] - Add task\n• /note [text] - Save note\n• /remind [text] - Set reminder\n\n**🔧 System:**\n• /monitor - System check\n• /sync - Sync data\n\n*Advanced features coming soon!*`;
      } else {
        response = `🤖 **Public Commands:**\n\n• /help - This help\n• /start - Welcome\n• /plasmabrand - Plasma resources\n\n🔒 Advanced features restricted to @${process.env.AUTHORIZED_USERNAME || 'Xkonjin'}`;
      }
      break;
      
    case 'status':
      if (authorized) {
        response = `🤖 **Jinbot Status**\n\n✅ Bot: Online and responding\n🌐 Platform: Vercel Serverless\n🔗 Webhook: Active\n⚡ Response: Instant\n🕐 Time: ${new Date().toLocaleString()}\n\n📊 **System:**\n• Authorization: Active\n• Storage: Ready\n• Monitoring: Daily at 9 AM UTC\n\n🎯 All systems operational!`;
      }
      break;
      
    case 'ping':
      response = `🏓 **Pong!**\n\n⚡ Response time: Instant\n🕐 Server time: ${new Date().toLocaleString()}\n🌐 Region: ${process.env.VERCEL_REGION || 'Unknown'}\n\n✅ Bot is responding correctly!`;
      break;
      
    case 'plasmabrand':
      response = '🔗 **Plasma Brand Resources**\n\nhttps://plasma.to/brand\n\n📚 Complete brand guidelines, assets, and messaging framework available.';
      break;
      
    case 'addtask':
      if (authorized) {
        if (!args) {
          response = '❌ Usage: /addtask [description]\nExample: /addtask Review quarterly reports';
        } else {
          response = `✅ **Task Created**\n\n📋 Task: ${args}\n🆔 ID: task_${Date.now().toString(36)}\n⏰ Created: ${new Date().toLocaleString()}\n\n*Note: Persistent storage coming soon*`;
        }
      }
      break;
      
    case 'note':
      if (authorized) {
        if (!args) {
          response = '❌ Usage: /note [text]\nExample: /note Important meeting tomorrow';
        } else {
          response = `📝 **Note Saved**\n\n💬 Content: ${args}\n🕐 Timestamp: ${new Date().toLocaleString()}\n\n*Note: Persistent storage coming soon*`;
        }
      }
      break;
      
    case 'monitor':
      if (authorized) {
        try {
          const monitorResponse = await fetch('https://telegram-monitor.vercel.app/api/monitor', {
            method: 'POST'
          });
          const data = await monitorResponse.json();
          
          response = `🔍 **Monitor Check**\n\n📊 Endpoints: ${data.summary?.endpointsChecked || 0}\n✅ Healthy: ${data.summary?.healthyEndpoints || 0}\n🚨 Alerts: ${data.summary?.alertsGenerated || 0}\n\n🕐 Next check: Daily at 9 AM UTC`;
        } catch (error) {
          response = `❌ Monitor error: ${error.message}`;
        }
      }
      break;

    case 'groupid':
      if (authorized) {
        response = `🆔 **Chat Information**\n\n📋 **Details:**\n• Chat ID: \`${chatId}\`\n• Chat Type: ${message.chat.type}\n• Chat Title: ${message.chat.title || 'N/A'}\n\n💡 **Usage:**\nThis chat ID can be used to set up group notifications and topic channels.\n\nFor groups: Save this ID as JINBOT_HQ_GROUP_ID`;
      }
      break;
      
    default:
      response = authorized ? 
        `❌ Unknown command: /${command}\n\nType /help for available commands` :
        `🔒 Command /${command} requires authorization`;
  }
  
  if (response) {
    return await sendTelegramMessage(chatId, response);
  }
}

async function handleMessage(message) {
  const text = message.text || '';
  const chatId = message.chat.id;
  const username = message.from?.username || '';
  
  console.log(`Received message from @${username}: ${text}`);
  console.log(`Chat info:`, {
    chatId: message.chat.id,
    chatType: message.chat.type,
    chatTitle: message.chat.title,
    isGroup: message.chat.type === 'group' || message.chat.type === 'supergroup'
  });
  
  if (text.startsWith('/')) {
    // Handle @bot commands in groups by removing the @botname part
    const cleanText = text.replace('@jinagentbot', '').trim();
    const modifiedMessage = { ...message, text: cleanText };
    return await handleCommand(modifiedMessage);
  } else if (isAuthorized(message)) {
    // Handle general conversation
    const response = `💬 **Message Received**\n\nI've noted your message: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"\n\n⚡ Use /help for commands or /addtask to create tasks`;
    return await sendTelegramMessage(chatId, response);
  } else {
    return await sendTelegramMessage(chatId, 
      `🔒 This bot is for @${process.env.AUTHORIZED_USERNAME || 'Xkonjin'} only.\n\nPublic commands: /start, /help, /plasmabrand`
    );
  }
}

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
    if (req.method === 'POST') {
      // Handle webhook update
      const update = req.body;
      console.log('Received update:', JSON.stringify(update));
      
      if (update.message) {
        await handleMessage(update.message);
        
        res.status(200).json({
          success: true,
          processed: true,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(200).json({
          success: true,
          processed: false,
          message: 'No message in update',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // GET request - return bot status
      res.status(200).json({
        botName: 'Jinbot Cloud (Simplified)',
        version: '2.1.0',
        status: 'Instant Response Mode',
        platform: 'Vercel Serverless',
        authorizedUser: process.env.AUTHORIZED_USERNAME || 'Xkonjin',
        timestamp: new Date().toISOString(),
        webhook: 'Active',
        responseTime: 'Instant'
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