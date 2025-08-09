# Claude Code Sub-Agents Feature

## What are Sub-Agents?

- Pre-configured AI assistants that handle specific types of tasks
- Each has its own context window to prevent conversation pollution
- Can be delegated work by Claude Code when it encounters matching tasks

## Key Benefits

### Context Management
- Separate context for each sub-agent
- Prevents main conversation from getting cluttered
- Keeps focus on high-level objectives

### Task Specialization
- Fine-tuned for specific domains
- Higher success rates on designated tasks
- Examples: code review, test automation, debugging, API documentation

### Tool Access
- Can access Claude Code's internal tools
- Specify tools as comma-separated list
- Can use MCP tools from configured servers

## How to Create Sub-Agents

### Configuration Location
- Global: `~/.claude/agents/`
- Project: `.claude/agents/`
- Project-level agents take precedence

### Example Configuration
```markdown
---
name: code-reviewer
description: Expert code review specialist
tools: Read, Grep, Glob, Bash
---
You are a senior code reviewer ensuring high standards of code quality and security.
```

### Management
- Use `/agents` command for management
- Add phrases like "use PROACTIVELY" in descriptions for better utilization

## Real-World Uses

- **Marketing automation**: Process hundreds of ads, identify underperformers, generate variations
- **Complex debugging**: Delegate specific investigation tasks
- **Code reviews**: Automated quality and security checks

## Getting the Latest Version

### Current Version
- Latest: v1.0.70

### Installation Methods

1. **NPM (Recommended)**
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **Windows PowerShell**
   ```powershell
   irm https://claude.ai/install.ps1 | iex
   ```

3. **Specific Version**
   ```powershell
   & ([scriptblock]::Create((irm https://claude.ai/install.ps1))) 1.0.58
   ```

### Auto-Updates
- Claude Code automatically updates itself
- Ensures latest features and security fixes

### Access Requirements
- Claude Pro/Max subscription, or
- Anthropic Console account

## When to Use Sub-Agents

- Complex problems requiring specialized expertise
- Tasks that would clutter main conversation
- Repetitive specialized operations
- Early in conversations to preserve context