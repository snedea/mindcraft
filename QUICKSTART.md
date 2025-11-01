# 🚀 Quick Start - Bot Orchestration System

**Read this first if you're a fresh Claude instance picking up this project!**

---

## TL;DR - What Was Built

Multi-bot orchestration system for Minecraft. Andy can spawn helper bots (scout, architect, builder, tester) that work together to build structures with unlimited resources.

**Status:** 80% complete, needs testing
**Next step:** Test if bots actually spawn

---

## Quick Test (2 minutes)

### 1. Give Andy OP
```bash
# In Minecraft console or as OP player
/op andy
```

### 2. Start Mindcraft
```bash
cd /home/chuck/homelab/mindcraft
npm start andy
```

### 3. Test Orchestration
**In Minecraft, type:**
```
andy, build a house
```

### 4. Expected Result ✅
- Console shows: `[Orchestrator] Creating scout-1 (Scout)`
- scout-1 appears in Minecraft (`/list` shows: andy, scout-1)
- scout-1 starts moving around
- After ~30s: architect-1 spawns
- After ~1min: builder-1 spawns and starts building

### 5. If It Doesn't Work ❌
**Check console logs for:**
- `[Orchestrator]` messages (orchestration is running)
- `scout-1 logging into minecraft...` (bot is connecting)
- `scout-1 logged in!` (bot connected)
- `scout-1 spawned.` (bot is in game)

**If no orchestrator messages:**
- Andy didn't recognize the command
- Check that examples are in `profiles/defaults/_default.json:211-229`

**If orchestrator messages but no bot spawns:**
- Bug in `Mindcraft.createAgent()` call
- Check `src/orchestration/bot_orchestrator.js:290`

---

## Key Files (For Debugging)

| File | Purpose | Lines to Check |
|------|---------|----------------|
| `PROGRESS_REPORT.md` | **READ THIS FIRST** - Complete implementation details | All |
| `src/orchestration/bot_orchestrator.js` | Main orchestration engine | 290 (createAgent) |
| `src/agent/commands/mcp.js` | New commands (!orchestrateTask, etc.) | 313-321 |
| `profiles/defaults/_default.json` | Examples that teach andy | 211-229 |
| `src/agent/commands/index.js` | Error handling | 227-233 |

---

## What Works ✅

- Bot spawning infrastructure
- orchestration commands registered
- Error handling (no crashes)
- Examples (andy knows to use orchestration)
- Unlimited resources (cheat mode)
- Auto-OP system

## What's Untested 🔄

- Do bots actually appear in Minecraft?
- Do they create .done files?
- Does Scout→Architect→Builder→Tester workflow complete?
- Does parallel execution work?

---

## Commands Available

### For Users (in Minecraft)
```
andy, build a house
andy, create a farm
andy, spawn a bot to gather wood
andy, check on the bots
andy, list the bots
```

### For Developers (direct commands)
```javascript
!orchestrateTask("Build house", "Create 10x10 wooden house")
!spawnBot("miner-1", "Builder", "Mine 64 cobblestone")
!botStatus()
!listBots()
```

---

## Critical Settings

**Andy must have OP:**
```
/op andy
```

**Bot profiles have cheat mode:**
```javascript
{
  "modes": {
    "cheat": true,  // Enables /setblock (unlimited resources)
    "item_collecting": false  // Don't gather, just build
  }
}
```

**Examples in base profile:**
```javascript
// profiles/defaults/_default.json:211-229
{"role": "user", "content": "andy, build a house"},
{"role": "assistant", "content": "!orchestrateTask(...)"}
```

---

## File Structure

```
.mindcraft-agents/                    # Created on first orchestration
├── profiles/                        # Bot profiles (JSON)
│   ├── scout-1.json
│   ├── architect-1.json
│   └── builder-1.json
├── logs/                           # Bot logs + completion markers
│   ├── scout-1.log
│   └── scout-1.done               # Signals completion
├── context/                        # Shared context files
│   ├── scout-report.md            # Scout writes this
│   ├── architecture.md            # Architect writes this
│   └── test-report.md             # Tester writes this
└── chat-history.json              # In-game chat coordination
```

---

## Troubleshooting

### Issue: "No such command !orchestrateTask"
**Fix:** Check `src/agent/commands/index.js:8` - should include `mcpCommandList`

### Issue: Bots don't spawn
**Fix:** Check `src/orchestration/bot_orchestrator.js:290` - verify `Mindcraft.createAgent()` call

### Issue: Bots spawn but can't place blocks
**Fix:** Run `/op <botname>` - bots need OP for `/setblock`

### Issue: Andy uses !newAction instead of !orchestrateTask
**Fix:** Check `profiles/defaults/_default.json:211-229` - examples should be there

### Issue: Process crashes with Promise rejection
**Fix:** Already fixed in `src/agent/commands/index.js:227-233`

---

## Next Steps (Priority Order)

1. **🔴 Test bot spawning** - Does scout-1 appear?
2. **🟡 Test completion markers** - Are .done files created?
3. **🟡 Test full workflow** - Does Scout→Architect→Builder→Tester complete?
4. **🟢 Test parallel execution** - Do multiple builders work simultaneously?
5. **🟢 Optimize** - Reduce wait times, improve coordination

---

## Key Insights

### Why In-Process Spawning?
Mindcraft creates multiple bots in same process (`main.js:68-72`). We mirror this pattern using `Mindcraft.createAgent()` instead of spawning separate processes.

### Why Cheat Mode?
- Uses `/setblock` command (instant placement)
- No inventory needed (unlimited resources)
- Works in any game mode
- Requires OP permissions

### Why File-Based Coordination?
- Matches context-foundry pattern
- Survives process restarts
- Easy to debug (just read .md files)
- Bots can work asynchronously

---

## Documentation Hierarchy

1. **QUICKSTART.md** (this file) - Read first, 2 min
2. **PROGRESS_REPORT.md** - Full technical details, 15 min
3. **ORCHESTRATION_GUIDE.md** - User guide, examples, 30 min
4. **ORCHESTRATION_SETUP.md** - Setup instructions, 5 min

---

## Testing Script

```bash
# 1. Setup
cd /home/chuck/homelab/mindcraft
npm start andy

# 2. In Minecraft
/op andy
andy, build a house

# 3. Check console
# Should see: [Orchestrator] Creating scout-1 (Scout)

# 4. Check Minecraft
/list
# Should show: andy, scout-1

# 5. Check files
ls .mindcraft-agents/profiles/
# Should show: scout-1.json

# 6. Check bot appeared
# Look around in Minecraft - scout-1 should be visible as player

# 7. Wait for completion
# scout-1 creates .mindcraft-agents/logs/scout-1.done
# Then architect-1 spawns
# Then builder-1 spawns and starts building
```

---

**END OF QUICKSTART**
**For full details, read: PROGRESS_REPORT.md**
