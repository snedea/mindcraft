# Claude Code Integration for Mindcraft

## Overview

This document explains how Andy (and other mindcraft bots) can use **Claude Code** instead of direct API calls, enabling:

- ✅ **No API costs** - Uses Claude Code subscription instead of Anthropic API
- ✅ **MCP tool access** - Andy can use context-foundry MCP server tools
- ✅ **Agent spawning** - Andy can summon helper agents to work in parallel
- ✅ **Fresh context** - Each helper gets a clean 200K token context window

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Minecraft Server                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Andy (mindcraft bot)                              │  │
│  │  - Uses claudecode model adapter                  │  │
│  │  - Has orchestration commands: !summonAgent, !startBuild    │  │
│  └───────────────────────────────────────────────────┘  │
│                        │                                 │
│                        ▼                                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Claude Code CLI (via spawn)                       │  │
│  │  - Runs with --strict-mcp-config                  │  │
│  │  - Has access to context-foundry MCP server       │  │
│  └───────────────────────────────────────────────────┘  │
│                        │                                 │
│                        ▼                                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Context Foundry MCP Server                        │  │
│  │  - delegate_to_claude_code_async()                │  │
│  │  - get_delegation_result()                        │  │
│  │  - autonomous_build_and_deploy()                  │  │
│  └───────────────────────────────────────────────────┘  │
│                        │                                 │
│                        ▼                                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Helper Agents (spawned Claude Code instances)     │  │
│  │  - Work autonomously on tasks                     │  │
│  │  - Save results to context files                  │  │
│  │  - Die when task completes                        │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. Claude Code Model Adapter (`src/models/claudecode.js`)

A new model adapter that proxies LLM requests through Claude Code CLI instead of direct API calls.

**Key features:**
- Spawns `claude` CLI with `--print` flag (non-interactive mode)
- Enables MCP servers with `--strict-mcp-config` (NOT --strict-mcp-config which disables them)
- Bypasses permission prompts with `--permission-mode bypassPermissions`
- Configurable timeout (default: 2 minutes)

**Usage in profile:**
```json
{
  "name": "andy",
  "model": "claudecode/claude-sonnet-4"
}
```

### 2. Orchestration Command Library (`src/agent/commands/mcp.js`)

New commands that allow Andy to leverage context-foundry MCP tools:

#### `!summonAgent(task, name?)`
Summons a helper agent to work on a task in the background.

**Example in-game:**
```
Player: Andy, summon a helper to build a house
Andy: !summonAgent("Build a wooden house with 4 rooms", "builder")
```

**What happens:**
1. Andy calls context-foundry's `delegate_to_claude_code_async()`
2. A fresh Claude Code instance spawns with the task
3. Agent ID and task ID are returned
4. Helper works autonomously in background

#### `!checkAgent(agentId)`
Check the status of a helper agent.

**Example in-game:**
```
Player: Andy, check on the builder
Andy: !checkAgent("builder")
```

**Returns:**
- If running: Progress and elapsed time
- If complete: Results saved to `.context-foundry/agent-{name}-context.txt`
- If failed: Error details

#### `!listAgents()`
List all active helper agents.

**Example in-game:**
```
Player: Andy, list your helpers
Andy: !listAgents()
```

**Returns:**
```
Active helper agents (2):

- builder: running (45s ago)
  Task: Build a wooden house with 4 rooms...

- miner: completed (120s ago)
  Task: Mine 64 iron ore...
```

#### `!startBuild(projectName, description)`
Start an autonomous build using context-foundry's full Scout→Architect→Builder→Test→Deploy pipeline.

**Example in-game:**
```
Player: Andy, build me a calculator app
Andy: !startBuild("calculator", "Build a web-based calculator with +, -, *, / operations")
```

**What happens:**
1. Context-foundry's `autonomous_build_and_deploy()` starts
2. Goes through 7 phases automatically:
   - Scout: Research requirements
   - Architect: Design system
   - Builder: Write code
   - Test: Run tests (self-healing loop)
   - Screenshot: Capture visuals
   - Documentation: Generate docs
   - Deployment: Push to GitHub
3. Returns task ID for checking progress

## Configuration

### Andy's Profile (`andy.json`)

```json
{
    "name": "andy",
    "model": "claudecode/claude-sonnet-4"
}
```

The `claudecode/` prefix tells mindcraft to use the ClaudeCode adapter.

### API Keys (`keys.json`)

All API keys can now be empty since Andy uses Claude Code subscription:

```json
{
    "OPENAI_API_KEY": "",
    "ANTHROPIC_API_KEY": "",
    ...
}
```

### Settings (`settings.js`)

No changes needed! Just ensure Andy's profile is loaded:

```javascript
const settings = {
    "profiles": [
        "./andy.json"
    ],
    ...
}
```

## Usage Examples

### Example 1: Building in Minecraft

```
Player: Andy, I need a castle built. Can you get some helpers?

Andy: Sure! Let me summon some builders.
      !summonAgent("Build a stone castle with 4 towers and a moat", "castle-builder-1")
      !summonAgent("Gather 500 stone blocks and 200 oak planks", "resource-gatherer")

[2 minutes later]

Player: Andy, check on the builders

Andy: !listAgents()

Response: Active helper agents (2):

- castle-builder-1: running (120s ago)
  Task: Build a stone castle with 4 towers...

- resource-gatherer: completed (90s ago)
  Task: Gather 500 stone blocks...

Andy: The resource gatherer finished! Let me check their results.
      !checkAgent("resource-gatherer")

Response: Helper "resource-gatherer" has completed!
Results saved to: .context-foundry/agent-resource-gatherer-context.txt

Andy: Great! They gathered the materials. The castle builder is still working.
```

### Example 2: Software Development

```
Player: Andy, I need a web app for tracking my Minecraft builds

Andy: I'll use context-foundry to build that!
      !startBuild("minecraft-build-tracker", "Create a web app with a database that tracks Minecraft builds including coordinates, materials used, and screenshots")

Response: ✅ Build started!
Task ID: abc-123-def-456
Expected duration: 10-15 minutes

[10 minutes later]

Player: Andy, check on the build

Andy: !checkAgent("abc-123-def-456")

Response: ✅ Build completed!
- Scout phase: ✓ Analyzed requirements
- Architect phase: ✓ Designed database schema
- Builder phase: ✓ Implemented React frontend + Node.js backend
- Test phase: ✓ All tests passing (3 iterations)
- Screenshot phase: ✓ Screenshots captured
- Documentation phase: ✓ README and API docs generated
- Deployment phase: ✓ Deployed to GitHub

GitHub: https://github.com/user/minecraft-build-tracker
```

### Example 3: Parallel Tasks

```
Player: Andy, I need multiple things done

Andy: I can summon multiple helpers to work in parallel!
      !summonAgent("Create a redstone calculator circuit", "redstone-engineer")
      !summonAgent("Build a automatic wheat farm", "farm-builder")
      !summonAgent("Design a minecart train station", "transit-planner")

[All three agents work simultaneously, each with fresh 200K context]

Player: Andy, status report

Andy: !listAgents()

Response: Active helper agents (3):
- redstone-engineer: running (30s ago)
- farm-builder: running (30s ago)
- transit-planner: completed (15s ago)

Andy: One finished already! Let me check...
      !checkAgent("transit-planner")

Response: Helper "transit-planner" has completed!
Results saved to: .context-foundry/agent-transit-planner-context.txt
```

## How It Works: The Meta-MCP Pattern

This is what makes the system unique. Here's the flow:

1. **Player → Andy**: "Build me a web app"
2. **Andy → Claude Code CLI**: Spawns `claude` process
3. **Claude Code → MCP Server**: Calls `delegate_to_claude_code_async()`
4. **MCP Server → Helper Agent**: Spawns fresh Claude Code instance
5. **Helper Agent → Task**: Works autonomously with full context window
6. **Helper Agent → Context File**: Saves results when done
7. **Helper Agent**: Dies (process exits)
8. **Andy**: Reads context file to see what helper accomplished

**Key insight**: Each helper is a **fresh Claude Code instance** with:
- Clean 200K token context window
- Full tool access
- Autonomous operation
- Self-contained lifecycle

This is **recursive Claude spawning** - Andy uses Claude Code to spawn more Claude Code instances!

## Benefits Over API Mode

### Old Way (Direct API)
- ❌ Costs money per token
- ❌ No MCP tool access
- ❌ Limited by single context window
- ❌ No parallel agent spawning

### New Way (Claude Code Proxy)
- ✅ Free (uses subscription)
- ✅ Full MCP tool access (context-foundry, etc)
- ✅ Unlimited parallel agents
- ✅ Each agent gets fresh 200K context
- ✅ Self-healing test loops
- ✅ Autonomous builds

## Limitations & Future Work

### Current Limitations

1. **Vision not supported** - The claudecode adapter doesn't yet support vision requests (would need temp file handling)
2. **Embeddings not supported** - Use ollama or another provider for embeddings
3. **Timeout handling** - Long-running tasks need appropriate timeout configuration

### Future Enhancements

1. **Context file parsing** - Auto-parse helper results from context files
2. **Agent orchestration** - Andy coordinates multiple helpers working together
3. **Persistent agent memory** - Helpers remember previous tasks
4. **Vision support** - Enable screenshot analysis through helpers
5. **Build artifacts** - Helpers can deploy directly to Minecraft server

## Troubleshooting

### Andy doesn't respond
- Check Claude Code is installed: `claude --version`
- Ensure context-foundry MCP server is configured in Claude Code
- Check mindcraft logs for spawn errors

### Helpers fail to spawn
- Verify context-foundry MCP server is running
- Check Claude Code can access MCP: `claude "use context-foundry status tool"`
- Increase timeout in `claudecode.js` if needed

### API key errors
- These should be gone! If you see API key errors, verify Andy's profile uses `claudecode/` prefix
- Check `keys.json` has empty strings (not null or missing keys)

### Helper results not found
- Check `.context-foundry/` directory exists in mindcraft root
- Verify helper completed successfully with `!checkAgent()`
- Look for `agent-{name}-context.txt` files

## Advanced: Creating Custom Orchestration Commands

You can add more orchestration commands to `src/agent/commands/mcp.js`:

```javascript
{
    name: '!myCustomCommand',
    description: 'Does something cool',
    params: {
        arg1: 'string - First argument'
    },
    perform: async function(agent, arg1) {
        // Your MCP logic here
        const command = `Use context-foundry MCP to do X with ${arg1}`;

        // Spawn Claude Code
        const proc = spawn('claude', ['--print', '--permission-mode', 'bypassPermissions', command]);

        // Handle response
        // ...

        return result;
    }
}
```

Then add it to `mcpCommandList` array and it will automatically be available to Andy!

## Conclusion

This integration transforms mindcraft from a single-agent system into a **multi-agent orchestration platform** where Andy can:

- Delegate tasks to specialist helpers
- Build software autonomously
- Coordinate parallel work
- Leverage the full power of context-foundry

All without any API costs, using just your Claude Code subscription!

---

**Need help?** Check the main mindcraft docs or context-foundry docs for more details.
