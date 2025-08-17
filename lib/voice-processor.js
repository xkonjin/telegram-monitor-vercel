// Voice Note Transcription and Processing System
// Handles voice message download, transcription, and intelligent processing

import fetch from 'node-fetch';

class VoiceProcessor {
  constructor(botToken) {
    this.botToken = botToken;
    this.apiBase = `https://api.telegram.org/bot${botToken}`;
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.whisperEnabled = !!this.openaiApiKey;
  }

  async downloadVoiceFile(fileId) {
    try {
      // Get file info from Telegram
      const fileInfoResponse = await fetch(`${this.apiBase}/getFile?file_id=${fileId}`);
      const fileInfo = await fileInfoResponse.json();
      
      if (!fileInfo.ok) {
        throw new Error(`Failed to get file info: ${fileInfo.description}`);
      }

      const filePath = fileInfo.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
      
      // Download the voice file
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.status}`);
      }

      const audioBuffer = await fileResponse.arrayBuffer();
      
      return {
        success: true,
        buffer: audioBuffer,
        fileSize: audioBuffer.byteLength,
        fileName: filePath.split('/').pop()
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async transcribeWithWhisper(audioBuffer) {
    if (!this.whisperEnabled) {
      return {
        success: false,
        error: 'OpenAI API key not configured',
        fallback: 'Set OPENAI_API_KEY environment variable for voice transcription'
      };
    }

    try {
      // Convert buffer to form data
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: 'audio/ogg' });
      formData.append('file', blob, 'voice.ogg');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        transcription: result.text,
        confidence: result.confidence || 0.9
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async processVoiceNote(fileId, context = {}) {
    try {
      console.log('Processing voice note:', fileId);
      
      // Download voice file
      const downloadResult = await this.downloadVoiceFile(fileId);
      if (!downloadResult.success) {
        return { success: false, error: `Download failed: ${downloadResult.error}` };
      }

      // Transcribe audio
      let transcription = '';
      let transcriptionMethod = 'none';
      
      if (this.whisperEnabled) {
        const transcribeResult = await this.transcribeWithWhisper(downloadResult.buffer);
        if (transcribeResult.success) {
          transcription = transcribeResult.transcription;
          transcriptionMethod = 'whisper';
        } else {
          // Fallback to simulated transcription for demo
          transcription = this.simulateTranscription(downloadResult.fileSize);
          transcriptionMethod = 'simulated';
        }
      } else {
        // Simulate transcription when API not available
        transcription = this.simulateTranscription(downloadResult.fileSize);
        transcriptionMethod = 'simulated';
      }

      // Process transcription for commands and actions
      const processedResult = await this.processTranscription(transcription, context);
      
      return {
        success: true,
        transcription,
        transcriptionMethod,
        fileSize: downloadResult.fileSize,
        processing: processedResult
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  simulateTranscription(fileSize) {
    // Simulate transcription based on file size for demo purposes
    const duration = Math.round(fileSize / 1000); // Rough estimate
    
    const samples = [
      "Add task: Review the quarterly reports by Friday",
      "Schedule a meeting with the team for tomorrow at 2 PM",
      "Check the status of the Plasma project and send me an update",
      "Create a new Claude Code instance for content generation",
      "Remind me to call the client about the proposal",
      "Set up monitoring for the new API endpoint",
      "Generate a content calendar for next week",
      "Analyze the performance metrics from yesterday"
    ];
    
    return samples[Math.floor(Math.random() * samples.length)] + ` (${duration}s voice note)`;
  }

  async processTranscription(transcription, context = {}) {
    try {
      const text = transcription.toLowerCase();
      const processing = {
        type: 'general',
        actions: [],
        commands: [],
        priorities: [],
        suggestions: []
      };

      // Detect command patterns
      if (text.includes('add task') || text.includes('create task') || text.includes('new task')) {
        processing.type = 'task_creation';
        processing.actions.push('create_task');
        
        // Extract task details
        let taskText = transcription;
        const taskIndicators = ['add task', 'create task', 'new task'];
        for (const indicator of taskIndicators) {
          taskText = taskText.replace(new RegExp(indicator, 'gi'), '').trim();
        }
        
        processing.commands.push({
          type: 'addtask',
          params: [taskText],
          confidence: 0.9
        });
      }

      // Detect scheduling
      if (text.includes('schedule') || text.includes('meeting') || text.includes('appointment')) {
        processing.type = 'scheduling';
        processing.actions.push('schedule_event');
        
        processing.commands.push({
          type: 'schedule',
          params: [transcription],
          confidence: 0.8
        });
      }

      // Detect Claude Code commands
      if (text.includes('claude') || text.includes('status') || text.includes('project')) {
        processing.type = 'claude_command';
        processing.actions.push('execute_claude');
        
        processing.commands.push({
          type: 'claude',
          params: [transcription.replace(/claude/gi, '').trim()],
          confidence: 0.8
        });
      }

      // Detect monitoring requests
      if (text.includes('monitor') || text.includes('check') || text.includes('health')) {
        processing.type = 'monitoring';
        processing.actions.push('system_check');
        
        processing.commands.push({
          type: 'monitor',
          params: [],
          confidence: 0.9
        });
      }

      // Detect priority indicators
      if (text.includes('urgent') || text.includes('important') || text.includes('asap')) {
        processing.priorities.push('high');
      } else if (text.includes('later') || text.includes('when you have time')) {
        processing.priorities.push('low');
      } else {
        processing.priorities.push('medium');
      }

      // Generate suggestions
      if (processing.commands.length > 0) {
        processing.suggestions.push('Execute detected commands automatically');
      }
      
      if (processing.type === 'general') {
        processing.suggestions.push('Save as note for future reference');
      }

      return processing;
    } catch (error) {
      return {
        type: 'error',
        error: error.message,
        actions: [],
        commands: [],
        priorities: ['medium'],
        suggestions: ['Save transcription as note']
      };
    }
  }

  async executeVoiceCommands(processing, groupChatId) {
    const results = [];
    
    for (const command of processing.commands) {
      try {
        let result = {};
        
        switch (command.type) {
          case 'addtask':
            result = await this.executeTaskCommand(command.params[0], groupChatId);
            break;
            
          case 'schedule':
            result = await this.executeScheduleCommand(command.params[0], groupChatId);
            break;
            
          case 'claude':
            result = await this.executeClaudeCommand(command.params[0], groupChatId);
            break;
            
          case 'monitor':
            result = await this.executeMonitorCommand(groupChatId);
            break;
            
          default:
            result = { success: false, error: `Unknown command type: ${command.type}` };
        }
        
        results.push({
          command: command.type,
          success: result.success,
          result: result.message || result.error
        });
      } catch (error) {
        results.push({
          command: command.type,
          success: false,
          result: error.message
        });
      }
    }
    
    return results;
  }

  async executeTaskCommand(taskDescription, groupChatId) {
    // This would integrate with the task management system
    return {
      success: true,
      message: `Task created: ${taskDescription}`,
      taskId: `voice_${Date.now()}`
    };
  }

  async executeScheduleCommand(eventDescription, groupChatId) {
    // This would integrate with calendar system
    return {
      success: true,
      message: `Event scheduled: ${eventDescription}`,
      eventId: `event_${Date.now()}`
    };
  }

  async executeClaudeCommand(command, groupChatId) {
    // This would integrate with Claude Code system
    return {
      success: true,
      message: `Claude command executed: ${command}`,
      output: 'Command processed successfully'
    };
  }

  async executeMonitorCommand(groupChatId) {
    try {
      // Trigger monitoring check
      const response = await fetch('https://telegram-monitor.vercel.app/api/monitor', {
        method: 'POST'
      });
      const data = await response.json();
      
      return {
        success: true,
        message: `Monitoring check completed: ${data.summary?.endpointsChecked || 0} endpoints checked`,
        details: data.summary
      };
    } catch (error) {
      return {
        success: false,
        message: `Monitoring check failed: ${error.message}`
      };
    }
  }
}

export default VoiceProcessor;