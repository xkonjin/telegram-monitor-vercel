// Utility endpoint to help get Telegram chat ID
// Send a message to your bot first, then visit this endpoint

import fetch from 'node-fetch';

export default async function handler(req, res) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return res.status(500).json({
      error: 'TELEGRAM_BOT_TOKEN not configured'
    });
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.ok) {
      return res.status(500).json({
        error: 'Failed to get updates from Telegram',
        details: data.description
      });
    }

    const updates = data.result;
    const chatIds = new Set();
    const chatInfo = [];

    // Extract chat IDs and user info
    updates.forEach(update => {
      if (update.message && update.message.chat) {
        const chat = update.message.chat;
        const user = update.message.from;
        
        if (!chatIds.has(chat.id)) {
          chatIds.add(chat.id);
          chatInfo.push({
            chatId: chat.id,
            chatType: chat.type,
            username: user?.username,
            firstName: user?.first_name,
            lastName: user?.last_name,
            lastMessage: update.message.text?.substring(0, 50),
            timestamp: new Date(update.message.date * 1000).toISOString()
          });
        }
      }
    });

    // Find the most likely chat ID (most recent from authorized user)
    const authorizedUsername = process.env.AUTHORIZED_USERNAME || 'Xkonjin';
    const authorizedChat = chatInfo.find(chat => 
      chat.username?.toLowerCase() === authorizedUsername.toLowerCase()
    );

    res.status(200).json({
      success: true,
      instructions: {
        step1: 'Send any message to your bot in Telegram',
        step2: 'Visit this endpoint to get your chat ID',
        step3: 'Add TELEGRAM_CHAT_ID environment variable in Vercel'
      },
      chatInfo,
      recommendedChatId: authorizedChat?.chatId || (chatInfo[0]?.chatId || null),
      authorizedUser: authorizedUsername,
      totalUpdates: updates.length,
      setupCommand: authorizedChat ? 
        `echo "${authorizedChat.chatId}" | vercel env add TELEGRAM_CHAT_ID production` :
        'Send a message to your bot first',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}