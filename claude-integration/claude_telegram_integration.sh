#!/bin/bash
# Claude Code Telegram Integration Commands
# Add these to your CLAUDE.md for seamless Telegram notifications

# Set your webhook secret
export CLAUDE_WEBHOOK_SECRET="your-webhook-secret-here"

# Quick notification functions
notify_telegram() {
    local topic=$1
    local message=$2
    local context=$3
    
    python3 "/Users/001/CLAUDE/telegram-monitor-vercel/claude-integration/notify_telegram.py" "$topic" "$message" "$context"
}

# Specific notification types
claude_task_completed() {
    local task=$1
    local project=$2
    local details=$3
    
    curl -X POST "https://telegram-monitor.vercel.app/api/claude-notify" \
        -H "Content-Type: application/json" \
        -H "X-Claude-Secret: $CLAUDE_WEBHOOK_SECRET" \
        -d "{
            \"type\": \"task_completion\",
            \"message\": \"✅ Task completed: $task\",
            \"context\": \"$details\",
            \"project\": \"$project\",
            \"instance\": \"development\"
        }"
}

claude_decision_needed() {
    local question=$1
    local context=$2
    local actions=$3
    
    curl -X POST "https://telegram-monitor.vercel.app/api/claude-notify" \
        -H "Content-Type: application/json" \
        -H "X-Claude-Secret: $CLAUDE_WEBHOOK_SECRET" \
        -d "{
            \"type\": \"decision_required\",
            \"message\": \"⚖️ Decision needed: $question\",
            \"context\": \"$context\",
            \"requiresDecision\": true,
            \"actions\": [\"Approve\", \"Reject\", \"More Info\"],
            \"priority\": \"high\"
        }"
}

claude_error_alert() {
    local error=$1
    local file=$2
    local line=$3
    
    curl -X POST "https://telegram-monitor.vercel.app/api/claude-notify" \
        -H "Content-Type: application/json" \
        -H "X-Claude-Secret: $CLAUDE_WEBHOOK_SECRET" \
        -d "{
            \"type\": \"error_detected\",
            \"message\": \"🚨 Error: $error\",
            \"context\": \"File: $file, Line: $line\",
            \"priority\": \"high\"
        }"
}

claude_content_ready() {
    local content_type=$1
    local description=$2
    local project=$3
    
    curl -X POST "https://telegram-monitor.vercel.app/api/claude-notify" \
        -H "Content-Type: application/json" \
        -H "X-Claude-Secret: $CLAUDE_WEBHOOK_SECRET" \
        -d "{
            \"type\": \"content_ready\",
            \"message\": \"📝 Content ready: $content_type\",
            \"context\": \"$description\",
            \"project\": \"$project\"
        }"
}

# Examples:
# claude_task_completed "User authentication implementation" "telegram-bot" "Added OAuth2, tests passing"
# claude_decision_needed "Deploy to production?" "All tests passed, code review complete"
# claude_error_alert "Database connection failed" "src/db.js" "line 45"
# claude_content_ready "Weekly blog post" "Plasma stablecoin analysis" "plasma"

echo "Claude Code Telegram Integration loaded!"
echo "Available commands:"
echo "  - notify_telegram [topic] [message] [context]"
echo "  - claude_task_completed [task] [project] [details]"
echo "  - claude_decision_needed [question] [context]"
echo "  - claude_error_alert [error] [file] [line]"
echo "  - claude_content_ready [type] [description] [project]"