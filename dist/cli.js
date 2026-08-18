#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { AgentPushKitClient, createAgentPushKitServer } from './server.js';
const token = process.env['AGENT_PUSH_KIT_TOKEN'];
if (!token) {
    process.stderr.write('AGENT_PUSH_KIT_TOKEN is required. Create one at https://agentpushkit.com/connect-agent\n');
    process.exit(1);
}
const client = new AgentPushKitClient({
    token,
    ...(process.env['AGENT_PUSH_KIT_API_BASE']
        ? { apiBase: process.env['AGENT_PUSH_KIT_API_BASE'] }
        : {}),
});
serveStdio(() => createAgentPushKitServer(client), {
    legacy: 'serve',
    onerror: (error) => process.stderr.write(`${error.message}\n`),
});
//# sourceMappingURL=cli.js.map