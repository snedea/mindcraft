# 🤖 Mindcraft Bot Orchestration System

## What Is This?

An extension to mindcraft that enables **multi-bot collaboration**. Andy can spawn helper bots that work together to complete complex tasks using the Scout→Architect→Builder→Tester pattern inspired by context-foundry.

---

## 📚 Documentation Quick Links

| Document | Time to Read | Purpose |
|----------|--------------|---------|
| **[QUICKSTART.md](QUICKSTART.md)** | 2 min | Start here! Quick test instructions |
| **[PROGRESS_REPORT.md](PROGRESS_REPORT.md)** | 15 min | **READ THIS FOR FRESH CONTEXT** - Complete technical details |
| **[ORCHESTRATION_GUIDE.md](ORCHESTRATION_GUIDE.md)** | 30 min | User guide with examples and use cases |
| **[ORCHESTRATION_SETUP.md](ORCHESTRATION_SETUP.md)** | 5 min | Setup instructions for unlimited resources |

---

## 🚀 Quick Start

### 1. Give Andy OP Permissions
```bash
/op andy
```

### 2. Start Mindcraft
```bash
npm start andy
```

### 3. Test It!
**In Minecraft, say:**
```
andy, build a house
```

**Expected result:**
- scout-1 spawns and explores
- architect-1 spawns and creates plan
- builder-1 spawns and builds house
- tester-1 spawns and verifies completion

---

## ✨ Features

### Multi-Bot Orchestration
- **Scout bot** - Explores and gathers information
- **Architect bot** - Creates detailed build plans
- **Builder bot(s)** - Executes the build (can run in parallel!)
- **Tester bot** - Verifies completion and quality

### Unlimited Resources
- Bots use "cheat mode" with `/setblock` commands
- No resource gathering needed
- Instant block placement
- Auto-OP system (andy grants permissions automatically)

### Hybrid Coordination
- **File-based:** Bots share context via `.mindcraft-agents/` directory
- **Chat-based:** Bots communicate in-game via Minecraft chat
- **Parallel execution:** Multiple bots can work simultaneously

---

## 📋 Commands

### Natural Language (Recommended)
```
andy, build a house
andy, create a farm
andy, spawn a bot to gather wood
andy, check on the bots
andy, list the bots
```

### Direct Commands
```
!orchestrateTask("Build house", "Create a 10x10 wooden house")
!spawnBot("miner-1", "Builder", "Mine 64 cobblestone")
!botStatus()
!listBots()
```

---

## 🏗️ Architecture

### Pattern: Scout → Architect → Builder → Tester

```
User Request
    ↓
[SCOUT] Explores & assesses resources
    ↓ (writes scout-report.md)
[ARCHITECT] Creates detailed plan
    ↓ (writes architecture.md + build-tasks.json)
[BUILDER(S)] Execute the build (parallel if possible)
    ↓ (places blocks in Minecraft)
[TESTER] Verifies completion
    ↓ (writes test-report.md)
Result returned to user
```

### File-Based Coordination

```
.mindcraft-agents/
├── profiles/          # Dynamic bot profiles
├── logs/             # Bot logs + .done markers
├── context/          # Shared context files
│   ├── scout-report.md
│   ├── architecture.md
│   ├── build-tasks.json
│   └── test-report.md
└── chat-history.json # In-game coordination
```

---

## 🛠️ Implementation Status

### ✅ Complete (80%)
- Core orchestration engine
- Bot spawning system
- orchestration commands (!orchestrateTask, !spawnBot, etc.)
- Role-specific prompts
- Coordination system (files + chat)
- Unlimited resources (cheat mode)
- Auto-OP system
- Error handling
- Examples integration

### 🔄 Needs Testing (20%)
- Bot visibility in Minecraft
- Completion marker creation
- Full Scout→Architect→Builder→Tester workflow
- Parallel execution
- File-based context sharing

---

## 📖 Examples

### Example 1: Build a House
```
User: "andy, build a house"

Andy: "I'll use the orchestration system!"
      !orchestrateTask("Build house", "10x10 wooden house")

[scout-1 spawns] → Explores area, finds wood/stone
[architect-1 spawns] → Designs 10x10 house plan
[builder-1 spawns] → Builds the house
[tester-1 spawns] → Verifies walls, roof, door

Andy: "House complete! 4 bots used, all phases passed."
```

### Example 2: Parallel Resource Gathering
```
User: "andy, gather resources: 200 logs, 100 cobble, 50 iron"

Andy: !orchestrateTask("Gather resources", "...")

[scout-1] → Finds trees, stone, caves
[architect-1] → Creates parallel task plan:
  - task-1: Chop 200 logs
  - task-2: Mine 100 cobble
  - task-3: Mine 50 iron
[builder-1, builder-2, builder-3] → Work simultaneously!
[tester-1] → Verifies all resources collected

Result: 3x faster than sequential gathering!
```

---

## 🐛 Troubleshooting

### Bots don't spawn
**Check:** Console logs for `[Orchestrator] Creating scout-1`
**Fix:** See PROGRESS_REPORT.md section "Issue 1: Bots Not Visible"

### Bots can't place blocks
**Check:** Are bots OP'd?
**Fix:** Run `/op <botname>` or ensure andy has OP

### Andy uses !newAction instead of orchestration
**Check:** `profiles/defaults/_default.json:211-229`
**Fix:** Examples should show orchestration pattern

### Process crashes
**Should be fixed!** Error handling added at `src/agent/commands/index.js:227-233`

---

## 🔧 Technical Details

### Key Files
- **Orchestrator:** `src/orchestration/bot_orchestrator.js`
- **Commands:** `src/agent/commands/mcp.js`
- **Prompts:** `src/orchestration/prompts/*.txt`
- **Examples:** `profiles/defaults/_default.json`

### How Bots Spawn
```javascript
// Uses Mindcraft's native agent creation (same process)
const agent = await Mindcraft.createAgent(agentSettings);

// NOT separate processes:
// spawn('node', ['main.js', '--profile']) ❌
```

### How Cheat Mode Works
```javascript
// When bot places block:
if (bot.modes.isOn('cheat')) {
  bot.chat('/setblock ' + x + ' ' + y + ' ' + z + ' ' + blockType);
  // Block appears instantly, no inventory needed!
}
```

---

## 🎯 Next Steps

### For Testing (Next Claude Instance)
1. **Test bot spawning** - Run quick test, verify scout-1 appears
2. **Debug if needed** - Check console logs, verify createAgent() call
3. **Test full workflow** - Complete Scout→Architect→Builder→Tester
4. **Test parallel execution** - Multiple builders working simultaneously
5. **Optimize** - Reduce wait times, improve coordination

### For Production
- Error recovery mechanisms
- Progress reporting to user
- Resource cleanup (old .done files)
- Performance optimization
- Multiple consecutive orchestrations

---

## 📊 Comparison: Before vs After

### Before (Manual)
```
User: "andy, build a house"
Andy: !newAction("Build a house...")
Andy builds alone, takes ~5 minutes
```

### After (Orchestrated)
```
User: "andy, build a house"
Andy: !orchestrateTask("Build house", "...")
scout-1 explores (30s)
architect-1 plans (1min)
builder-1, builder-2, builder-3 build in parallel (2min)
tester-1 verifies (30s)
Total: ~4 minutes, better quality, coordinated!
```

---

## 🙏 Credits

**Inspired by:** [context-foundry](https://github.com/context-foundry/context-foundry)'s multi-agent orchestration pattern

**Adapted for:** Minecraft gameplay instead of software development

**Key differences:**
- context-foundry: Spawns Claude Code instances for building software
- mindcraft orchestration: Spawns Minecraft bots for gameplay tasks
- **Same pattern:** Scout→Architect→Builder→Tester, file-based coordination, parallel execution

---

## 📝 License

Same license as mindcraft (check main repository)

---

**For complete technical details and debugging info, read [PROGRESS_REPORT.md](PROGRESS_REPORT.md)**

**For quick testing, read [QUICKSTART.md](QUICKSTART.md)**
