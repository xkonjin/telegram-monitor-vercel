// Persistent storage layer using Vercel KV
// Replaces in-memory storage with persistent database

import { kv } from '@vercel/kv';

class PersistentStorage {
  constructor() {
    this.kvEnabled = !!process.env.KV_REST_API_URL;
    
    // Fallback to in-memory if KV not available
    this.fallbackStorage = {
      tasks: [],
      messages: [],
      nextTaskId: 1,
      settings: {}
    };
  }

  async getTasks() {
    if (this.kvEnabled) {
      try {
        const tasks = await kv.get('jinbot:tasks') || [];
        return Array.isArray(tasks) ? tasks : [];
      } catch (error) {
        console.error('KV get tasks error:', error);
        return this.fallbackStorage.tasks;
      }
    }
    return this.fallbackStorage.tasks;
  }

  async saveTasks(tasks) {
    if (this.kvEnabled) {
      try {
        await kv.set('jinbot:tasks', tasks);
        return true;
      } catch (error) {
        console.error('KV save tasks error:', error);
        this.fallbackStorage.tasks = tasks;
        return false;
      }
    }
    this.fallbackStorage.tasks = tasks;
    return true;
  }

  async addTask(task) {
    const tasks = await this.getTasks();
    
    // Generate next ID
    const nextId = await this.getNextTaskId();
    task.id = `task_${String(nextId).padStart(3, '0')}`;
    task.createdDate = new Date().toISOString().split('T')[0];
    task.timestamp = new Date().toISOString();
    
    tasks.push(task);
    await this.saveTasks(tasks);
    await this.incrementTaskId();
    
    return task;
  }

  async completeTask(taskId) {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
      task.status = 'Completed';
      task.completionDate = new Date().toISOString().split('T')[0];
      task.completedAt = new Date().toISOString();
      await this.saveTasks(tasks);
      return task;
    }
    return null;
  }

  async getMessages() {
    if (this.kvEnabled) {
      try {
        const messages = await kv.get('jinbot:messages') || [];
        return Array.isArray(messages) ? messages : [];
      } catch (error) {
        console.error('KV get messages error:', error);
        return this.fallbackStorage.messages;
      }
    }
    return this.fallbackStorage.messages;
  }

  async saveMessages(messages) {
    if (this.kvEnabled) {
      try {
        await kv.set('jinbot:messages', messages);
        return true;
      } catch (error) {
        console.error('KV save messages error:', error);
        this.fallbackStorage.messages = messages;
        return false;
      }
    }
    this.fallbackStorage.messages = messages;
    return true;
  }

  async addMessage(message) {
    const messages = await this.getMessages();
    
    message.id = `msg_${String(messages.length + 1).padStart(3, '0')}`;
    message.timestamp = new Date().toISOString();
    
    messages.push(message);
    
    // Keep only last 1000 messages to prevent storage bloat
    if (messages.length > 1000) {
      messages.splice(0, messages.length - 1000);
    }
    
    await this.saveMessages(messages);
    return message;
  }

  async getNextTaskId() {
    if (this.kvEnabled) {
      try {
        const nextId = await kv.get('jinbot:next_task_id') || 1;
        return parseInt(nextId);
      } catch (error) {
        console.error('KV get next task ID error:', error);
        return this.fallbackStorage.nextTaskId;
      }
    }
    return this.fallbackStorage.nextTaskId;
  }

  async incrementTaskId() {
    const nextId = await this.getNextTaskId();
    const newId = nextId + 1;
    
    if (this.kvEnabled) {
      try {
        await kv.set('jinbot:next_task_id', newId);
      } catch (error) {
        console.error('KV increment task ID error:', error);
        this.fallbackStorage.nextTaskId = newId;
      }
    } else {
      this.fallbackStorage.nextTaskId = newId;
    }
    
    return newId;
  }

  async getUserSettings(userId) {
    if (this.kvEnabled) {
      try {
        const settings = await kv.get(`jinbot:user:${userId}:settings`) || {};
        return settings;
      } catch (error) {
        console.error('KV get user settings error:', error);
        return {};
      }
    }
    return this.fallbackStorage.settings[userId] || {};
  }

  async saveUserSettings(userId, settings) {
    if (this.kvEnabled) {
      try {
        await kv.set(`jinbot:user:${userId}:settings`, settings);
        return true;
      } catch (error) {
        console.error('KV save user settings error:', error);
        if (!this.fallbackStorage.settings) this.fallbackStorage.settings = {};
        this.fallbackStorage.settings[userId] = settings;
        return false;
      }
    }
    if (!this.fallbackStorage.settings) this.fallbackStorage.settings = {};
    this.fallbackStorage.settings[userId] = settings;
    return true;
  }

  async searchTasks(keyword, status = null) {
    const tasks = await this.getTasks();
    const keywordLower = keyword.toLowerCase();
    
    return tasks.filter(task => {
      const matchesKeyword = task.description.toLowerCase().includes(keywordLower) ||
                           task.tags.some(tag => tag.toLowerCase().includes(keywordLower));
      const matchesStatus = !status || task.status === status;
      return matchesKeyword && matchesStatus;
    });
  }

  async searchMessages(keyword, limit = 10) {
    const messages = await this.getMessages();
    const keywordLower = keyword.toLowerCase();
    
    return messages
      .filter(msg => 
        msg.text.toLowerCase().includes(keywordLower) ||
        msg.tags.some(tag => tag.toLowerCase().includes(keywordLower)) ||
        msg.sourceChat.toLowerCase().includes(keywordLower)
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  async getRecentMessages(hours = 24, limit = 10) {
    const messages = await this.getMessages();
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return messages
      .filter(msg => new Date(msg.timestamp) > cutoffTime)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  async getPendingTasks(limit = 10) {
    const tasks = await this.getTasks();
    return tasks
      .filter(task => task.status === 'Pending')
      .sort((a, b) => {
        // Sort by priority, then by creation date
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
        const priorityDiff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.timestamp || b.createdDate) - new Date(a.timestamp || a.createdDate);
      })
      .slice(0, limit);
  }

  async getStats() {
    const [tasks, messages] = await Promise.all([
      this.getTasks(),
      this.getMessages()
    ]);

    const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const recentMessages = messages.filter(m => 
      new Date(m.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    return {
      totalTasks: tasks.length,
      pendingTasks,
      completedTasks,
      completionRate: tasks.length > 0 ? (completedTasks / tasks.length * 100).toFixed(1) : 0,
      totalMessages: messages.length,
      recentMessages,
      storageType: this.kvEnabled ? 'Vercel KV' : 'In-Memory Fallback',
      lastActivity: messages.length > 0 ? messages[messages.length - 1].timestamp : null
    };
  }

  async exportData() {
    const [tasks, messages, stats] = await Promise.all([
      this.getTasks(),
      this.getMessages(), 
      this.getStats()
    ]);

    return {
      exportedAt: new Date().toISOString(),
      stats,
      tasks,
      messages: messages.slice(-100), // Last 100 messages only
      version: '2.0.0'
    };
  }

  async importData(data) {
    try {
      if (data.tasks) {
        await this.saveTasks(data.tasks);
      }
      if (data.messages) {
        await this.saveMessages(data.messages);
      }
      return true;
    } catch (error) {
      console.error('Import data error:', error);
      return false;
    }
  }

  // Sync with Claude Code master memory system
  async syncWithMasterMemory() {
    if (!this.kvEnabled) {
      return { success: false, error: 'KV not available for sync' };
    }

    try {
      // Get current session data
      const [tasks, messages] = await Promise.all([
        this.getTasks(),
        this.getMessages()
      ]);

      // Prepare sync data
      const syncData = {
        source: 'telegram-bot',
        timestamp: new Date().toISOString(),
        tasks: tasks.slice(-50), // Last 50 tasks
        messages: messages.slice(-100), // Last 100 messages
        stats: await this.getStats()
      };

      // Store sync marker
      await kv.set('jinbot:last_sync', new Date().toISOString());
      await kv.set('jinbot:sync_data', syncData);

      return { 
        success: true, 
        synced: {
          tasks: syncData.tasks.length,
          messages: syncData.messages.length
        }
      };
    } catch (error) {
      console.error('Master memory sync error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default PersistentStorage;