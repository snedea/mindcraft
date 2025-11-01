# MCP Integration for Mindcraft Bots

## Overview

This document explains the MCP (Model Context Protocol) integration for mindcraft bots, particularly the `context-foundry` MCP server that enables autonomous building capabilities.

## What Was Fixed (2025-10-31)

### Issue: Andy Keep Disconnecting

**Root Cause:** Unhandled Promise rejections in orchestration commands were crashing the Node.js process.

**Symptoms:**
- Andy would attempt to use `!startBuild()` or `!summonAgent()` commands
- These commands would timeout after 30 seconds
- The Promise rejection would crash the entire Node.js process with exit code 1
- System would auto-restart andy, creating a crash loop

**Fix Applied:**

1. **Added error handling in `src/agent/commands/index.js:213-236`**
   - Wrapped `command.perform()` in try-catch block
   - Errors now return graceful error messages instead of crashing
   - Process remains stable even when orchestration commands fail

2. **Removed redundant try-catch blocks in `src/agent/commands/mcp.js`**
   - The try-catch blocks were only catching synchronous errors
   - Promise constructor rejections were not being caught
   - Simplified code by letting errors propagate to the new handler

3. **Configured context-foundry MCP server globally**
   - Server added to `~/.claude.json` with `--scope user`
   - Uses virtualenv Python: `/home/chuck/homelab/context-foundry/venv/bin/python`
   - Server verified as connected: `claude mcp list` shows `✓ Connected`

## MCP Server Setup

### Prerequisites
- Python 3.10+ (currently using 3.11.2)
- context-foundry installed at `/home/chuck/homelab/context-foundry`
- Virtual environment with dependencies:
  - `fastmcp>=2.0.0`
  - `nest-asyncio>=1.5.0`

### Configuration
```bash
# Add MCP server globally (already done)
claude mcp add --scope user --transport stdio context-foundry -- \
  /home/chuck/homelab/context-foundry/venv/bin/python \
  /home/chuck/homelab/context-foundry/tools/mcp_server.py

# Verify configuration
claude mcp list
# Should show: context-foundry: ... - ✓ Connected
```

## Available Orchestration Commands

### `!summonAgent(task, name)`
Spawns a helper agent to work on a task in the background.

**Parameters:**
- `task` (string): Description of what the helper should do
- `name` (string, optional): Name for the helper agent

**Example:**
```
!summonAgent("Build a simple house with wooden walls", "builder-1")
```

**How it works:**
1. Spawns a new `claude` CLI process
2. Asks it to use the `delegate_to_claude_code_async` MCP tool
3. Returns a task ID for tracking progress
4. Helper runs autonomously in background

### `!checkAgent(agentId)`
Check on the progress of a helper agent.

**Parameters:**
- `agentId` (string): The agent ID or name to check

**Example:**
```
!checkAgent("builder-1")
```

### `!listAgents()`
List all active helper agents.

**Example:**
```
!listAgents()
```

### `!startBuild(projectName, description)`
Start an autonomous build using context-foundry's full build pipeline.

**Parameters:**
- `projectName` (string): Name for the project
- `description` (string): What to build

**Example:**
```
!startBuild("AndyHouse", "Build a simple survival house with walls, roof, door, and windows")
```

**How it works:**
1. Spawns a new `claude` CLI process
2. Asks it to use the `autonomous_build_and_deploy` MCP tool
3. Runs through Scout→Architect→Builder→Test→Deploy phases
4. Typically takes 7-15 minutes
5. Results saved to `.context-foundry/` directory

## Current Limitations

### Architecture Challenge

The current MCP integration has a nested process architecture:

```
[Claude Code CLI]
    └─> [Node.js running mindcraft]
        └─> [andy bot]
            └─> [Spawns NEW claude CLI process]
                └─> [Uses MCP tools]
```

**Implications:**

1. **Timeout Issues**: Spawned `claude` processes may timeout (30 sec for spawn, varies for execution)
2. **Process Overhead**: Each orchestration command spawns a new Claude Code instance
3. **Error Propagation**: Errors from nested processes can be hard to debug
4. **Resource Usage**: Multiple concurrent Claude processes can be resource-intensive

### Why Orchestration Commands May Fail

1. **MCP Server Not Connected**
   - Run `claude mcp list` to verify
   - Should show `✓ Connected` for context-foundry

2. **Timeout Errors**
   - Default timeouts: 30s for spawning, 20s for checking
   - Long-running tasks may exceed timeouts
   - Error message: `"Timeout starting build"` or `"Timeout spawning helper agent"`

3. **Task ID Extraction Failures**
   - MCP responses must contain a recognizable task ID
   - Regex pattern: `/task[_-]id["']?\s*[:=]\s*["']?([a-f0-9-]+)/i`
   - Error message: `"Could not extract task ID from response"`

4. **Missing MCP Tools**
   - context-foundry must expose the expected tools:
     - `delegate_to_claude_code_async`
     - `get_delegation_result`
     - `autonomous_build_and_deploy`

## Troubleshooting

### Bot Keeps Crashing
**FIXED** - Error handling now prevents crashes. If you still see crashes:
1. Check logs for non-MCP related errors
2. Verify Node.js version compatibility
3. Check for syntax errors in command files

### Orchestration Commands Timeout
1. **Increase timeout values** in `src/agent/commands/mcp.js`:
   - Line 64: `setTimeout(() => { ... }, 30000)` ← spawning timeout
   - Line 143: `setTimeout(() => { ... }, 20000)` ← checking timeout
   - Line 229: `setTimeout(() => { ... }, 30000)` ← build timeout

2. **Check MCP server health**:
   ```bash
   claude mcp list
   ```

3. **Monitor spawned processes**:
   ```bash
   ps aux | grep claude
   ```

### Commands Not Recognized
1. Verify commands are exported in `src/agent/commands/index.js:8`
2. Check command syntax matches pattern: `!commandName("arg1", "arg2")`
3. View available commands with andy's command docs

## Future Improvements

1. **Direct MCP Client**: Use a Node.js MCP client library instead of spawning `claude` processes
2. **Callback Architecture**: Have andy communicate back to parent Claude Code process
3. **Better Timeouts**: Implement progressive timeouts based on task complexity
4. **Status Polling**: Periodically check task status instead of one-time checks
5. **Context Persistence**: Save and restore agent state across restarts

## Testing the Fix

To verify the crash fix works:

1. **Start mindcraft with andy**
2. **Have andy try an orchestration command**:
   ```
   !startBuild("test-house", "Build a small test house")
   ```
3. **Expected behavior**:
   - If MCP works: Command executes, returns task ID
   - If MCP fails: Returns error message like `"❌ Command !startBuild failed: Timeout starting build"`
   - **Andy stays running** (no crash!)

## Related Files

- `src/agent/commands/mcp.js` - orchestration command implementations
- `src/agent/commands/index.js` - Command execution with error handling
- `~/.claude.json` - Global MCP server configuration
- `/home/chuck/homelab/context-foundry/tools/mcp_server.py` - MCP server implementation
