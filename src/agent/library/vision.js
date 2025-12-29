/**
 * Long-Range Vision System
 *
 * Provides "radar-like" environmental awareness by scanning blocks
 * in cardinal directions at various distances, simulating what a
 * human player can see when looking across the landscape.
 */

import * as mc from '../../utils/mcdata.js';

// Distance ranges for scanning (in blocks)
const SCAN_DISTANCES = [16, 32, 64, 128];

// Block categories for identifying features
const FEATURE_BLOCKS = {
    trees: ['oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'cherry_log', 'mangrove_log', 'oak_leaves', 'birch_leaves', 'spruce_leaves'],
    water: ['water'],
    lava: ['lava'],
    ores: ['coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 'emerald_ore', 'copper_ore', 'deepslate_coal_ore', 'deepslate_iron_ore', 'deepslate_gold_ore', 'deepslate_diamond_ore'],
    structures: ['cobblestone', 'mossy_cobblestone', 'stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks', 'chiseled_stone_bricks', 'nether_bricks'],
    villages: ['hay_block', 'bell', 'composter', 'lectern', 'barrel', 'smoker', 'blast_furnace', 'cartography_table', 'fletching_table', 'smithing_table', 'stonecutter'],
    caves: ['cave_air', 'dripstone_block', 'pointed_dripstone'],
    crops: ['wheat', 'carrots', 'potatoes', 'beetroots', 'melon', 'pumpkin'],
    flowers: ['dandelion', 'poppy', 'blue_orchid', 'allium', 'azure_bluet', 'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip', 'oxeye_daisy', 'cornflower', 'lily_of_the_valley', 'sunflower', 'lilac', 'rose_bush', 'peony'],
    sand: ['sand', 'red_sand', 'sandstone'],
    snow: ['snow', 'snow_block', 'powder_snow'],
    mushrooms: ['red_mushroom', 'brown_mushroom', 'red_mushroom_block', 'brown_mushroom_block', 'mushroom_stem'],
};

// Cardinal directions with their coordinate offsets
const DIRECTIONS = {
    'North': { x: 0, z: -1 },
    'South': { x: 0, z: 1 },
    'East': { x: 1, z: 0 },
    'West': { x: -1, z: 0 },
    'NorthEast': { x: 1, z: -1 },
    'NorthWest': { x: -1, z: -1 },
    'SouthEast': { x: 1, z: 1 },
    'SouthWest': { x: -1, z: 1 },
};

/**
 * Scan a single direction at a specific distance
 */
function scanDirection(bot, direction, distance) {
    const pos = bot.entity.position;
    const dir = DIRECTIONS[direction];

    // Sample multiple points at this distance (spread across the direction)
    const features = {};
    const spreadWidth = Math.min(distance / 4, 16); // Sample width

    for (let spread = -spreadWidth; spread <= spreadWidth; spread += 4) {
        for (let yOffset = -10; yOffset <= 20; yOffset += 2) {
            const targetX = Math.floor(pos.x + dir.x * distance + (dir.z !== 0 ? spread : 0));
            const targetY = Math.floor(pos.y + yOffset);
            const targetZ = Math.floor(pos.z + dir.z * distance + (dir.x !== 0 ? spread : 0));

            try {
                const block = bot.blockAt({ x: targetX, y: targetY, z: targetZ });
                if (block && block.name !== 'air' && block.name !== 'void_air') {
                    // Categorize the block
                    for (const [category, blocks] of Object.entries(FEATURE_BLOCKS)) {
                        if (blocks.includes(block.name)) {
                            if (!features[category]) {
                                features[category] = { count: 0, distance: distance };
                            }
                            features[category].count++;
                            break;
                        }
                    }
                }
            } catch (e) {
                // Block not loaded, skip
            }
        }
    }

    return features;
}

/**
 * Get the biome at a specific location
 */
function getBiomeAtDistance(bot, direction, distance) {
    const pos = bot.entity.position;
    const dir = DIRECTIONS[direction];

    const targetX = Math.floor(pos.x + dir.x * distance);
    const targetY = Math.floor(pos.y);
    const targetZ = Math.floor(pos.z + dir.z * distance);

    try {
        const block = bot.blockAt({ x: targetX, y: targetY, z: targetZ });
        if (block && block.biome) {
            return block.biome.name;
        }
    } catch (e) {
        // Block not loaded
    }
    return null;
}

/**
 * Perform a full 360-degree long-range scan
 */
export function longRangeScan(bot, maxDistance = 128) {
    const results = {
        position: {
            x: Math.floor(bot.entity.position.x),
            y: Math.floor(bot.entity.position.y),
            z: Math.floor(bot.entity.position.z)
        },
        directions: {},
        summary: []
    };

    // Scan each cardinal direction
    for (const [dirName, _] of Object.entries(DIRECTIONS)) {
        results.directions[dirName] = {
            features: {},
            biomes: []
        };

        // Scan at each distance
        for (const distance of SCAN_DISTANCES) {
            if (distance > maxDistance) continue;

            const features = scanDirection(bot, dirName, distance);

            // Merge features
            for (const [category, data] of Object.entries(features)) {
                if (!results.directions[dirName].features[category]) {
                    results.directions[dirName].features[category] = data;
                } else {
                    results.directions[dirName].features[category].count += data.count;
                }
            }

            // Get biome
            const biome = getBiomeAtDistance(bot, dirName, distance);
            if (biome && !results.directions[dirName].biomes.includes(biome)) {
                results.directions[dirName].biomes.push(biome);
            }
        }
    }

    // Generate human-readable summary
    for (const [dirName, data] of Object.entries(results.directions)) {
        const features = Object.keys(data.features);
        if (features.length > 0 || data.biomes.length > 0) {
            let desc = `${dirName}: `;
            const parts = [];

            // Add features
            if (data.features.trees) parts.push(`trees (${data.features.trees.count})`);
            if (data.features.water) parts.push('water');
            if (data.features.lava) parts.push('LAVA (danger!)');
            if (data.features.villages) parts.push('village structures');
            if (data.features.caves) parts.push('cave entrance');
            if (data.features.crops) parts.push('crops/farm');
            if (data.features.ores) parts.push(`ores (${data.features.ores.count})`);
            if (data.features.structures) parts.push('stone structures');
            if (data.features.sand) parts.push('desert/beach');
            if (data.features.snow) parts.push('snowy area');
            if (data.features.mushrooms) parts.push('mushrooms');

            // Add biomes
            if (data.biomes.length > 0) {
                parts.push(`biomes: ${data.biomes.slice(0, 2).join(', ')}`);
            }

            if (parts.length > 0) {
                desc += parts.join(', ');
                results.summary.push(desc);
            }
        }
    }

    if (results.summary.length === 0) {
        results.summary.push('No significant features detected in visible range');
    }

    return results;
}

/**
 * Get a formatted vision report string
 */
export function getVisionReport(bot) {
    const scan = longRangeScan(bot);

    let report = `VISION SCAN from (${scan.position.x}, ${scan.position.y}, ${scan.position.z}):\n`;
    report += '─'.repeat(50) + '\n';

    for (const line of scan.summary) {
        report += `• ${line}\n`;
    }

    report += '─'.repeat(50);

    return report;
}

/**
 * Find the best direction for a specific resource
 */
export function findResourceDirection(bot, resourceType) {
    const scan = longRangeScan(bot);

    let bestDir = null;
    let bestCount = 0;

    for (const [dirName, data] of Object.entries(scan.directions)) {
        if (data.features[resourceType] && data.features[resourceType].count > bestCount) {
            bestCount = data.features[resourceType].count;
            bestDir = dirName;
        }
    }

    if (bestDir) {
        return {
            direction: bestDir,
            count: bestCount,
            suggestion: `Head ${bestDir} to find ${resourceType} (${bestCount} detected)`
        };
    }

    return {
        direction: null,
        count: 0,
        suggestion: `No ${resourceType} detected in visible range`
    };
}
