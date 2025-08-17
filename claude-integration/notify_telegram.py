#!/usr/bin/env python3
"""
Claude Code Telegram Notification System
Allows Claude Code instances to send notifications to Jinbot Test HQ group topics
"""

import requests
import json
import sys
import os
from datetime import datetime
from typing import Dict, List, Optional

class ClaudeTelegramNotifier:
    def __init__(self):
        self.webhook_url = "https://telegram-monitor.vercel.app/api/claude-notify"
        self.webhook_secret = os.getenv("CLAUDE_WEBHOOK_SECRET", "your-secret-key-here")
        self.default_instance = "general"
        
    def notify(self, message: str, topic: str = "general", context: str = "", 
              requires_decision: bool = False, actions: List[str] = None,
              priority: str = "medium", project: str = ""):
        """
        Send notification to Telegram group topic
        
        Args:
            message: Main notification message
            topic: Topic key (general, development, content, monitoring, etc.)
            context: Additional context information
            requires_decision: Whether this requires user decision
            actions: List of available actions for decision
            priority: Priority level (low, medium, high, critical)
            project: Project name
        """
        try:
            headers = {
                "Content-Type": "application/json",
                "X-Claude-Secret": self.webhook_secret
            }
            
            payload = {
                "type": f"claude_{topic}",
                "message": message,
                "context": context,
                "instance": f"claude-{topic}",
                "project": project,
                "requiresDecision": requires_decision,
                "actions": actions or [],
                "priority": priority,
                "timestamp": datetime.now().isoformat(),
                "source": "claude-code"
            }
            
            response = requests.post(self.webhook_url, json=payload, headers=headers, timeout=10)
            
            if response.ok:
                result = response.json()
                return {
                    "success": True,
                    "topic_id": result.get("result", {}).get("topicId"),
                    "message_id": result.get("result", {}).get("messageId")
                }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {response.text}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def notify_task_completion(self, task: str, project: str = "", details: str = ""):
        """Notify when a task is completed"""
        return self.notify(
            message=f"✅ Task completed: {task}",
            topic="development",
            context=details,
            project=project,
            priority="medium"
        )
    
    def notify_error(self, error: str, context: str = "", project: str = ""):
        """Notify about errors requiring attention"""
        return self.notify(
            message=f"🚨 Error detected: {error}",
            topic="monitoring", 
            context=context,
            project=project,
            priority="high"
        )
    
    def request_decision(self, decision_needed: str, context: str = "", 
                        actions: List[str] = None, project: str = ""):
        """Request a decision from user"""
        return self.notify(
            message=f"⚖️ Decision needed: {decision_needed}",
            topic="decisions",
            context=context,
            requires_decision=True,
            actions=actions or ["Approve", "Reject", "More Info"],
            project=project,
            priority="high"
        )
    
    def notify_content_ready(self, content_type: str, description: str = "", project: str = ""):
        """Notify when content is ready for review"""
        return self.notify(
            message=f"📝 Content ready: {content_type}",
            topic="content",
            context=description,
            project=project,
            priority="medium"
        )
    
    def notify_system_alert(self, alert: str, severity: str = "medium", context: str = ""):
        """Send system monitoring alerts"""
        priority_map = {"low": "low", "medium": "medium", "high": "high", "critical": "critical"}
        
        return self.notify(
            message=f"📡 System alert: {alert}",
            topic="monitoring",
            context=context,
            priority=priority_map.get(severity, "medium")
        )

# Convenience functions for easy import
notifier = ClaudeTelegramNotifier()

def notify_claude(message: str, topic: str = "general", **kwargs):
    """Quick notification function"""
    return notifier.notify(message, topic, **kwargs)

def task_completed(task: str, **kwargs):
    """Quick task completion notification"""
    return notifier.notify_task_completion(task, **kwargs)

def error_alert(error: str, **kwargs):
    """Quick error notification"""
    return notifier.notify_error(error, **kwargs)

def decision_needed(question: str, **kwargs):
    """Quick decision request"""
    return notifier.request_decision(question, **kwargs)

def content_ready(content: str, **kwargs):
    """Quick content notification"""
    return notifier.notify_content_ready(content, **kwargs)

def system_alert(alert: str, **kwargs):
    """Quick system alert"""
    return notifier.notify_system_alert(alert, **kwargs)

# CLI interface
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python notify_telegram.py [topic] [message] [context?]")
        print("\nAvailable topics:")
        topics = ["general", "development", "content", "monitoring", "ai-research", "decisions", "automation"]
        for topic in topics:
            print(f"  - {topic}")
        print("\nExamples:")
        print('  python notify_telegram.py development "Code review completed"')
        print('  python notify_telegram.py decisions "Deploy to production?" "All tests passed"')
        sys.exit(1)
    
    topic = sys.argv[1]
    message = sys.argv[2]
    context = sys.argv[3] if len(sys.argv) > 3 else ""
    
    result = notify_claude(message, topic, context=context)
    
    if result["success"]:
        print(f"✅ Notification sent successfully!")
        print(f"Topic ID: {result.get('topic_id')}")
        print(f"Message ID: {result.get('message_id')}")
    else:
        print(f"❌ Failed to send notification: {result['error']}")
        sys.exit(1)