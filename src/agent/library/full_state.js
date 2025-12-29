import {
    getPosition,
    getBiomeName,
    getNearbyPlayerNames,
    getInventoryCounts,
    getNearbyEntityTypes,
    getBlockAtPosition,
    getFirstBlockAboveHead
} from "./world.js";
import { longRangeScan } from "./vision.js";
import convoManager from '../conversation.js';

// Cache for vision data (expensive to compute every tick)
let visionCache = {
    lastUpdate: 0,
    lastPosition: null,
    data: null
};
const VISION_CACHE_TTL = 10000; // Update vision every 10 seconds
const VISION_MOVE_THRESHOLD = 20; // Or when moved 20+ blocks

export function getFullState(agent) {
    const bot = agent.bot;

    const pos = getPosition(bot);
    const position = {
        x: Number(pos.x.toFixed(2)),
        y: Number(pos.y.toFixed(2)),
        z: Number(pos.z.toFixed(2))
    };

    let weather = 'Clear';
    if (bot.thunderState > 0) weather = 'Thunderstorm';
    else if (bot.rainState > 0) weather = 'Rain';

    let timeLabel = 'Night';
    if (bot.time.timeOfDay < 6000) timeLabel = 'Morning';
    else if (bot.time.timeOfDay < 12000) timeLabel = 'Afternoon';

    const below = getBlockAtPosition(bot, 0, -1, 0).name;
    const legs = getBlockAtPosition(bot, 0, 0, 0).name;
    const head = getBlockAtPosition(bot, 0, 1, 0).name;

    let players = getNearbyPlayerNames(bot);
    let bots = convoManager.getInGameAgents().filter(b => b !== agent.name);
    players = players.filter(p => !bots.includes(p));

    const helmet = bot.inventory.slots[5];
    const chestplate = bot.inventory.slots[6];
    const leggings = bot.inventory.slots[7];
    const boots = bot.inventory.slots[8];

    // Get cached vision data (HUD-like environmental awareness)
    const visionHUD = getCachedVision(bot, position);

    const state = {
        name: agent.name,
        gameplay: {
            position,
            dimension: bot.game.dimension,
            gamemode: bot.game.gameMode,
            health: Math.round(bot.health),
            hunger: Math.round(bot.food),
            biome: getBiomeName(bot),
            weather,
            timeOfDay: bot.time.timeOfDay,
            timeLabel
        },
        action: {
            current: agent.isIdle() ? 'Idle' : agent.actions.currentActionLabel,
            isIdle: agent.isIdle()
        },
        surroundings: {
            below,
            legs,
            head,
            firstBlockAboveHead: getFirstBlockAboveHead(bot, null, 32)
        },
        // HUD: Long-range vision (what you can see in all directions)
        vision: visionHUD,
        inventory: {
            counts: getInventoryCounts(bot),
            stacksUsed: bot.inventory.items().length,
            totalSlots: bot.inventory.slots.length,
            equipment: {
                helmet: helmet ? helmet.name : null,
                chestplate: chestplate ? chestplate.name : null,
                leggings: leggings ? leggings.name : null,
                boots: boots ? boots.name : null,
                mainHand: bot.heldItem ? bot.heldItem.name : null
            }
        },
        nearby: {
            humanPlayers: players,
            botPlayers: bots,
            entityTypes: getNearbyEntityTypes(bot).filter(t => t !== 'player' && t !== 'item'),
        },
        modes: {
            summary: bot.modes.getMiniDocs()
        }
    };

    return state;
}

/**
 * Get cached vision data, updating only when needed
 */
function getCachedVision(bot, currentPos) {
    const now = Date.now();

    // Check if we need to update the cache
    let needsUpdate = false;

    if (!visionCache.data) {
        needsUpdate = true;
    } else if (now - visionCache.lastUpdate > VISION_CACHE_TTL) {
        needsUpdate = true;
    } else if (visionCache.lastPosition) {
        // Check if moved significantly
        const dx = currentPos.x - visionCache.lastPosition.x;
        const dz = currentPos.z - visionCache.lastPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance > VISION_MOVE_THRESHOLD) {
            needsUpdate = true;
        }
    }

    if (needsUpdate) {
        try {
            const scan = longRangeScan(bot, 64); // Scan up to 64 blocks for HUD
            visionCache = {
                lastUpdate: now,
                lastPosition: { x: currentPos.x, z: currentPos.z },
                data: {
                    summary: scan.summary,
                    directions: formatDirectionsForHUD(scan.directions)
                }
            };
        } catch (e) {
            // If vision scan fails, return empty
            visionCache.data = {
                summary: ['Vision scan unavailable'],
                directions: {}
            };
        }
    }

    return visionCache.data;
}

/**
 * Format direction data for compact HUD display
 */
function formatDirectionsForHUD(directions) {
    const hud = {};

    for (const [dir, data] of Object.entries(directions)) {
        const features = [];

        if (data.features.trees) features.push(`trees:${data.features.trees.count}`);
        if (data.features.water) features.push('water');
        if (data.features.lava) features.push('LAVA!');
        if (data.features.ores) features.push(`ores:${data.features.ores.count}`);
        if (data.features.villages) features.push('village');
        if (data.features.caves) features.push('cave');
        if (data.features.crops) features.push('farm');

        if (features.length > 0) {
            hud[dir] = features.join(', ');
        }
    }

    return hud;
}