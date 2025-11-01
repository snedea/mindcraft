# 🚨 CLAUDE INSTANCE HANDOFF DOCUMENT

**Status:** Implementation complete (80%), critical bug fixed, testing needed (20%)
**Context Used:** 60K / 200K tokens (30%)
**Read Time:** 3 minutes

---

## WHAT WAS BUILT

Multi-bot orchestration system for Mindcraft. Andy spawns helper bots using Scout→Architect→Builder→Tester pattern.

---

## FILES TO READ (Priority Order)

1. **THIS FILE** - You're reading it (3 min) ✅
2. **QUICKSTART.md** - Quick test instructions (2 min) 🔴 READ NEXT
3. **PROGRESS_REPORT.md** - Full technical details (15 min) 🟡 READ IF DEBUGGING
4. **ORCHESTRATION_GUIDE.md** - User documentation (30 min) 🟢 REFERENCE

---

## IMMEDIATE ACTION REQUIRED

### Test Bot Spawning (5 minutes)

```bash
# 1. Start mindcraft
cd /home/chuck/homelab/mindcraft
npm start andy

# 2. In Minecraft
/op andy
andy, build a house

# 3. Check console - should see:
# [Orchestrator] Creating scout-1 (Scout)
# scout-1 logging into minecraft...
# scout-1 spawned.

# 4. Check Minecraft - should see:
# /list shows: andy, scout-1
# scout-1 visible as player entity

# 5. If YES - Continue to full workflow testing
# 6. If NO - Debug (see below)
```

---

## IF BOTS DON'T SPAWN - DEBUG STEPS

### Step 1: Check Console Logs
```
Look for:
✅ "[Orchestrator] Creating scout-1" - orchestration triggered
✅ "scout-1 logging into minecraft" - bot attempting connection
✅ "scout-1 logged in!" - bot connected
✅ "scout-1 spawned." - bot in game

Missing any? See PROGRESS_REPORT.md Issue 1.
```

### Step 2: Check Files Created
```bash
ls .mindcraft-agents/profiles/
# Should show: scout-1.json

cat .mindcraft-agents/profiles/scout-1.json
# Should have: "cheat": true, "name": "scout-1"
```

### Step 3: Check Agent Creation
```javascript
// src/orchestration/bot_orchestrator.js:290
const agent = await Mindcraft.createAgent(agentSettings);

// Add debug:
console.log('Agent created:', agent ? 'SUCCESS' : 'FAILED');
console.log('Agent name:', agent?.name);
console.log('Bot object:', agent?.bot ? 'EXISTS' : 'MISSING');
```

---

## KEY FILES (For Quick Reference)

| File | What It Does | Critical Lines |
|------|--------------|----------------|
| `src/orchestration/bot_orchestrator.js` | Main orchestration | 290 (createAgent) |
| `src/agent/commands/mcp.js` | orchestration commands | 313-321 (orchestrateTask) |
| `profiles/defaults/_default.json` | Examples | 211-229 (teaches andy) |
| `src/agent/commands/index.js` | Error handling | 227-233 (try-catch) |

---

## WHAT WORKS ✅

- Bot spawning infrastructure
- Commands registered (!orchestrateTask, !spawnBot, !botStatus, !listBots)
- Error handling (no crashes)
- Examples (andy knows pattern)
- Cheat mode (unlimited resources)
- Auto-OP system

## WHAT'S UNTESTED 🔄

- Do bots appear in Minecraft? 🔴
- Do they create .done files? 🟡
- Full workflow completion? 🟡
- Parallel execution? 🟢

---

## CRITICAL SETTINGS

```bash
# Andy must have OP
/op andy

# Bots auto-get OP from andy
# (see bot_orchestrator.js:302)

# Bots have cheat mode enabled
# (see bot_orchestrator.js:272)
```

---

## ARCHITECTURE (30 Second Overview)

```
User: "andy, build a house"
  ↓
Andy: !orchestrateTask("Build house", "...")
  ↓
BotOrchestrator.orchestrateTask()
  ├─> Spawn scout-1 via Mindcraft.createAgent()
  │   └─> Wait for .mindcraft-agents/logs/scout-1.done
  ├─> Spawn architect-1
  │   └─> Wait for architect-1.done
  ├─> Spawn builder-1
  │   └─> Builds using /setblock (cheat mode)
  └─> Spawn tester-1
      └─> Verifies and returns result
```

---

## KEY DESIGN DECISIONS

1. **In-process spawning** - Use `Mindcraft.createAgent()`, NOT separate processes
2. **Cheat mode** - Bots use `/setblock` for instant placement (no resources needed)
3. **File coordination** - Bots share context via `.mindcraft-agents/` directory
4. **Examples in base profile** - All bots inherit from `_default.json`

---

## KNOWN ISSUES

### ✅ FIXED: Issue 1: Agent Reference Bug (CRITICAL)
- **What:** Bot profiles created but bots never spawned
- **Why:** `Mindcraft.createAgent()` returns `{success, error}`, not agent object
- **Fixed:** Now calls `getAgentProcess()` to retrieve actual agent (bot_orchestrator.js:300)
- **Status:** ✅ FIXED (2025-10-31) - NEEDS TESTING

### Issue 2: Bot Visibility Unknown 🟡
- **What:** Unknown if bots appear in `/list` after fix
- **Why:** Not yet tested with new fix
- **Test:** Start andy, say "build a house", check `/list`

### Issue 3: Completion Markers 🟡
- **What:** Bots may not create `.done` files
- **Why:** Bots don't know bash commands
- **Fix:** Auto-create or add explicit instructions
- **See:** PROGRESS_REPORT.md "Gap 1: Completion Signal"

---

## SUCCESS CRITERIA

### Minimum (Must Have) 🔴
- [ ] Bot spawns and appears in Minecraft
- [ ] At least one successful build

### Full Feature (Nice to Have) 🟡
- [ ] Scout→Architect→Builder→Tester completes
- [ ] Parallel execution works
- [ ] File coordination works

---

## COMMANDS REFERENCE

```javascript
// For testing
!orchestrateTask("Build house", "Create 10x10 wooden house")
!spawnBot("test-1", "Builder", "Place 10 dirt blocks")
!botStatus()
!listBots()

// Natural language (in Minecraft)
andy, build a house
andy, spawn a bot to mine stone
andy, check on the bots
```

---

## FILES MODIFIED (4)

1. `src/agent/commands/mcp.js` - Added 4 commands
2. `src/agent/commands/index.js` - Added error handling
3. `profiles/defaults/_default.json` - Added examples
4. `andy.json` - Cleaned up

## FILES CREATED (10+)

1. `src/orchestration/bot_orchestrator.js` - Main engine
2. `src/orchestration/coordination.js` - Coordination system
3. `src/orchestration/prompts/*.txt` - Role prompts (4 files)
4. `PROGRESS_REPORT.md` - **READ THIS FOR DETAILS**
5. `QUICKSTART.md` - Quick test guide
6. `ORCHESTRATION_GUIDE.md` - User docs
7. `ORCHESTRATION_SETUP.md` - Setup guide
8. `README_ORCHESTRATION.md` - Feature overview
9. `HANDOFF.md` - This file
10. `test_orchestration.js` - Test script

---

## CONTEXT BUDGET

**Current:** 135K / 200K (67.5% used)
**Remaining:** 65K tokens
**Handoff at:** 180K (90%)

**What to preserve if handoff needed:**
1. HANDOFF.md (this file)
2. QUICKSTART.md
3. PROGRESS_REPORT.md
4. Key code sections (can re-read)

---

## NEXT INSTANCE CHECKLIST

If you're a fresh Claude instance:

- [ ] Read HANDOFF.md (3 min) ← YOU ARE HERE
- [ ] Read QUICKSTART.md (2 min)
- [ ] Run quick test (5 min)
- [ ] If bots spawn: Continue to full testing
- [ ] If bots don't spawn: Read PROGRESS_REPORT.md debugging section
- [ ] Test full workflow
- [ ] Implement missing features (completion markers, etc.)

---

## CONTACT / NOTES

**User:** chuck (Tastygoats in Minecraft)
**Project:** /home/chuck/homelab/mindcraft
**Server:** Paper 1.21.1, localhost:25565
**Status:** Development/Testing

**User's Goal:**
- Spawn multiple Minecraft bots that collaborate
- Bots use Scout→Architect→Builder→Tester pattern
- Unlimited resources (no gathering)
- Parallel execution when possible

**Progress:** 80% complete, needs testing

---

## QUICK REFERENCE COMMANDS

```bash
# Start
npm start andy

# Test
andy, build a house

# Debug
tail -f .mindcraft-agents/logs/*.log

# Check bots
ls .mindcraft-agents/profiles/

# OP bots
/op andy
/op scout-1
/op architect-1
```

---

**END OF HANDOFF**

**Next step:** Read QUICKSTART.md and run the test!

**If stuck:** Read PROGRESS_REPORT.md Issue 1

**Good luck! 🚀**
