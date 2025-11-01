/**
 * Context Foundry MCP Integration
 *
 * These commands integrate with the context-foundry MCP server for delegating
 * tasks to Claude Code CLI instances via the Model Context Protocol.
 *
 * Note: Bot orchestration commands moved to orchestration.js
 * (Originally attempted MCP server for bot orchestration, but that didn't work.
 * Built direct orchestration system instead - see orchestration.js)
 */

import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// Track active helper agents (for Context Foundry MCP integration)
const activeAgents = new Map();

/**
 * Summon a helper agent to work on a task in the background
 *
 * @param {string} task - Description of what the helper should do
 * @param {string} name - Optional name for the helper (e.g., "builder", "miner")
 * @returns {string} - Agent ID and status
 */
async function summonAgent(agent, task, helperName = null) {
    const agentId = helperName || `helper-${uuidv4().slice(0, 8)}`;

    // Use context-foundry MCP to delegate task
    const command = `
Please use the context-foundry MCP tool 'delegate_to_claude_code_async' to start this task:

Task: ${task}
Working Directory: ${process.cwd()}
Timeout: 30 minutes

Return the task_id so I can check on it later.
    `.trim();

    // Spawn Claude Code to call MCP
    const proc = spawn('claude', [
        '--print',
        '--permission-mode', 'bypassPermissions',
        command
    ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: {
            ...process.env,
            PYTHONUNBUFFERED: '1'
        }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
        stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            proc.kill();
            reject(new Error('Timeout spawning helper agent'));
        }, 30000); // 30 second timeout for spawning

        proc.on('close', (code) => {
            clearTimeout(timeoutId);

            if (code === 0) {
                // Extract task_id from output (look for UUID format)
                const taskIdMatch = stdout.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
                if (taskIdMatch) {
                    const taskId = taskIdMatch[1];

                    // Store agent info
                    activeAgents.set(agentId, {
                        taskId: taskId,
                        name: agentId,
                        task: task,
                        spawnTime: new Date(),
                        status: 'running'
                    });

                    resolve(`✅ Helper agent "${agentId}" summoned!\nTask ID: ${taskId}\nWorking on: ${task.slice(0, 100)}...`);
                } else {
                    reject(new Error('Could not extract task ID from response'));
                }
            } else {
                reject(new Error(`Failed to summon agent: ${stderr}`));
            }
        });

        proc.on('error', (err) => {
            clearTimeout(timeoutId);
            reject(err);
        });
    });
}

/**
 * Check on a helper agent's progress
 *
 * @param {string} agentIdOrName - The agent ID or name
 * @returns {string} - Status report
 */
async function checkAgent(agent, agentIdOrName) {
    const agentInfo = activeAgents.get(agentIdOrName);

    if (!agentInfo) {
        return `❌ No helper agent found with ID: ${agentIdOrName}\nActive agents: ${Array.from(activeAgents.keys()).join(', ') || 'none'}`;
    }

    // Use context-foundry MCP to check status
    const command = `
Please use the context-foundry MCP tool 'get_delegation_result' to check on this task:

Task ID: ${agentInfo.taskId}

Return the current status and any progress information.
    `.trim();

    const proc = spawn('claude', [
        '--print',
        '--permission-mode', 'bypassPermissions',
        command
    ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
            ...process.env,
            PYTHONUNBUFFERED: '1'
        }
    });

    let stdout = '';

    proc.stdout.on('data', (data) => {
        stdout += data.toString();
    });

    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            proc.kill();
            reject(new Error('Timeout checking agent status'));
        }, 20000);

        proc.on('close', (code) => {
            clearTimeout(timeoutId);

            if (code === 0) {
                // Update agent status
                if (stdout.includes('"status": "completed"') || stdout.includes('"status": "failed"')) {
                    const status = stdout.includes('"status": "completed"') ? 'completed' : 'failed';
                    agentInfo.status = status;

                    // Create context file
                    const contextFile = `.context-foundry/agent-${agentInfo.name}-context.txt`;
                    resolve(`✅ Helper "${agentInfo.name}" has ${status}!\n\nResults saved to: ${contextFile}\n\nRaw status:\n${stdout.slice(0, 500)}`);
                } else {
                    resolve(`⏳ Helper "${agentInfo.name}" is still working...\n\n${stdout.slice(0, 500)}`);
                }
            } else {
                reject(new Error('Failed to check agent status'));
            }
        });

        proc.on('error', (err) => {
            clearTimeout(timeoutId);
            reject(err);
        });
    });
}

/**
 * List all active helper agents
 */
function listAgents(agent) {
    if (activeAgents.size === 0) {
        return "No active helper agents.";
    }

    let result = `Active helper agents (${activeAgents.size}):\n`;
    for (const [agentId, info] of activeAgents.entries()) {
        const elapsed = Math.floor((Date.now() - info.spawnTime.getTime()) / 1000);
        result += `\n- ${agentId}: ${info.status} (${elapsed}s ago)\n  Task: ${info.task.slice(0, 80)}...\n`;
    }

    return result;
}

/**
 * Start a build using context-foundry autonomous build
 *
 * @param {string} projectName - Name for the project
 * @param {string} description - What to build
 * @returns {string} - Build status
 */
async function startBuild(agent, projectName, description) {
    const command = `
Please use the context-foundry MCP tool 'autonomous_build_and_deploy' to start building:

Project Name: ${projectName}
Task Description: ${description}
Timeout: 60 minutes

Return the task ID so I can check on the build later.
    `.trim();

    const proc = spawn('claude', [
        '--print',
        '--permission-mode', 'bypassPermissions',
        command
    ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
            ...process.env,
            PYTHONUNBUFFERED: '1'
        }
    });

    let stdout = '';

    proc.stdout.on('data', (data) => {
        stdout += data.toString();
    });

    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            proc.kill();
            reject(new Error('Timeout starting build'));
        }, 30000);

        proc.on('close', (code) => {
            clearTimeout(timeoutId);

            if (code === 0) {
                resolve(`✅ Build started!\n\n${stdout.slice(0, 500)}`);
            } else {
                reject(new Error('Failed to start build'));
            }
        });

        proc.on('error', (err) => {
            clearTimeout(timeoutId);
            reject(err);
        });
    });
}

// Export commands in mindcraft format
export const mcpCommandList = [
    {
        name: '!summonAgent',
        description: 'Summon a helper agent to work on a task in the background. The helper will work autonomously and save its results to a context file when done.',
        params: {
            task: { type: 'string', description: 'Description of what the helper should do' }
        },
        perform: async function(agent, task, name = null) {
            return await summonAgent(agent, task, name);
        }
    },
    {
        name: '!checkAgent',
        description: 'Check on the progress of a helper agent.',
        params: {
            agentId: { type: 'string', description: 'The agent ID or name to check' }
        },
        perform: async function(agent, agentId) {
            return await checkAgent(agent, agentId);
        }
    },
    {
        name: '!listAgents',
        description: 'List all active helper agents.',
        perform: function(agent) {
            return listAgents(agent);
        }
    },
    {
        name: '!startBuild',
        description: 'Start an autonomous build using context-foundry. The build will run through Scout→Architect→Builder→Test→Deploy phases automatically.',
        params: {
            projectName: { type: 'string', description: 'Name for the project' },
            description: { type: 'string', description: 'What to build' }
        },
        perform: async function(agent, projectName, description) {
            return await startBuild(agent, projectName, description);
        }
    }
];
