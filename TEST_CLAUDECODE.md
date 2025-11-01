# Testing Claude Code Integration

## Quick Test Checklist

### 1. Verify Claude Code Adapter Loads

```bash
cd /home/chuck/homelab/mindcraft
node -e "import('./src/models/claudecode.js').then(m => console.log('✅ ClaudeCode adapter loaded:', m.ClaudeCode))"
```

Expected output: `✅ ClaudeCode adapter loaded: [class ClaudeCode]`

### 2. Verify Orchestration Commands Loaded

```bash
node -e "import('./src/agent/commands/mcp.js').then(m => console.log('✅ orchestration commands:', m.mcpCommandList.map(c => c.name)))"
```

Expected output:
```
✅ orchestration commands: [
  '!summonAgent',
  '!checkAgent',
  '!listAgents',
  '!startBuild'
]
```

### 3. Test Andy's Profile

```bash
cat andy.json
```

Expected output:
```json
{
    "name": "andy",
    "model": "claudecode/claude-sonnet-4"
}
```

### 4. Verify No API Keys Required

```bash
grep -E "(OPENAI|ANTHROPIC)_API_KEY" keys.json
```

Expected output: Both should be empty strings `""`

### 5. Start Mindcraft (Dry Run)

```bash
# This will test if Andy loads without errors
# You can exit after seeing "Agent andy connected to mindcraft"
npm start
```

Expected output:
```
Agent andy connected to mindcraft
...
```

### 6. Test Claude Code CLI Access

```bash
# Verify Claude Code can be spawned
claude --version
```

Expected output: `Claude Code version X.X.X` (or similar)

### 7. Test MCP Server Access

```bash
# Verify context-foundry MCP server is accessible
claude "use the context_foundry_status tool to check if Context Foundry is running"
```

Expected output: Should show Context Foundry status

## Full Integration Test (In Minecraft)

### Prerequisites
- Minecraft server running on localhost:25565
- Andy connected to server

### Test Scenario 1: Summon a Helper

1. Join Minecraft server
2. Send message: `/msg andy Can you summon a helper to test?`
3. Andy should respond using `!summonAgent()`
4. Check console logs for:
   - `Awaiting Claude Code response...`
   - Helper agent spawned successfully

### Test Scenario 2: Check Helper Status

1. After summoning agent, wait 10 seconds
2. Send message: `/msg andy Check on the helper`
3. Andy should respond using `!checkAgent()`
4. Should see status update

### Test Scenario 3: List All Helpers

1. After summoning multiple agents
2. Send message: `/msg andy List all your helpers`
3. Andy should respond using `!listAgents()`
4. Should see list of active agents

### Test Scenario 4: Start a Build

1. Send message: `/msg andy Build a simple calculator web app`
2. Andy should respond using `!startBuild()`
3. Should see context-foundry autonomous build start
4. Can check progress with: `/msg andy Check build status`

## Expected Behavior

### Successful Helper Summon

```
Player: andy, summon a helper to gather wood
Andy: !summonAgent("Gather 64 oak wood logs", "wood-gatherer")

[Claude Code spawns]
[MCP server called]
[Helper agent created]

Andy: ✅ Helper agent "wood-gatherer" summoned!
      Task ID: abc-123-def
      Working on: Gather 64 oak wood logs...
```

### Successful Build Start

```
Player: andy, build a web app for tracking builds
Andy: !startBuild("build-tracker", "Create a web app with database for tracking Minecraft builds")

[Claude Code spawns]
[MCP autonomous build starts]

Andy: ✅ Build started!
      Task ID: xyz-789-ghi
      Expected duration: 10-15 minutes
```

## Debugging

### Problem: "claude: command not found"

**Solution**: Install Claude Code CLI
```bash
# Check if installed
which claude

# If not found, install Claude Code
# Visit: https://claude.ai/download
```

### Problem: MCP server not accessible

**Solution**: Configure context-foundry in Claude Code
```bash
# Edit Claude Code config
vi ~/.claude/config.json

# Should include:
{
  "mcpServers": {
    "context-foundry": {
      "command": "python3",
      "args": ["/home/chuck/homelab/context-foundry/tools/mcp_server.py"]
    }
  }
}
```

### Problem: Andy tries to use API instead of Claude Code

**Solution**: Check model prefix
```bash
# Verify profile has 'claudecode/' prefix
cat andy.json

# Should show:
# "model": "claudecode/claude-sonnet-4"
# NOT:
# "model": "gpt-4o" or "claude-sonnet-4"
```

### Problem: Spawn timeout errors

**Solution**: Increase timeout in claudecode.js
```javascript
// In src/models/claudecode.js
constructor(model_name, url, params) {
    this.timeout = params.timeout || 300000; // 5 minutes instead of 2
}
```

### Problem: Helper agents fail to spawn

**Solution**: Test MCP delegation manually
```bash
claude "use the delegate_to_claude_code_async tool with task 'test task'"
```

## Success Criteria

✅ Andy loads without API key errors
✅ Claude Code CLI can be spawned
✅ orchestration commands are available
✅ Helpers can be summoned
✅ Helper status can be checked
✅ Builds can be started
✅ No API costs incurred

## Next Steps After Testing

1. **Test in real Minecraft server** - Build something complex
2. **Summon multiple helpers** - Test parallel execution
3. **Start autonomous builds** - Test full context-foundry pipeline
4. **Review context files** - Check `.context-foundry/agent-*-context.txt`
5. **Monitor performance** - Check spawn times and completion rates

## Known Limitations

- Vision requests not yet supported
- Embedding requests not supported (use ollama for embeddings)
- Helpers can't directly interact with Minecraft (only Andy can)
- Context files need manual parsing (for now)

## Future Enhancements

- Auto-parse context files
- Helper→Andy communication
- Persistent helper memory
- Vision support via temp files
- Direct Minecraft action execution by helpers
