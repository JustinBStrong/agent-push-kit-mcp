import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import {
  AgentPushKitClient,
  agentPushKitToolNames,
  createAgentPushKitServer,
} from '../dist/server.js';

test('publishes the complete curated tool set', () => {
  assert.equal(agentPushKitToolNames.length, 25);
  assert.ok(agentPushKitToolNames.includes('send_event'));
  assert.ok(agentPushKitToolNames.includes('delete_account'));
  assert.ok(agentPushKitToolNames.includes('set_type_push'));
  assert.ok(agentPushKitToolNames.includes('register_browser_push_subscription'));
});

test('initializes over MCP and lists every curated tool', async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const api = new AgentPushKitClient({
    token: 'apt_test_secret',
    fetch: async () => new Response('{}', { status: 200 }),
  });
  const server = createAgentPushKitServer(api);
  const client = new Client({ name: 'agent-push-kit-test', version: '0.1.0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const result = await client.listTools();
  assert.deepEqual(
    result.tools.map((tool) => tool.name).sort(),
    [...agentPushKitToolNames].sort(),
  );
  await client.close();
  await server.close();
});

test('calls the authenticated user event endpoint without exposing the token in the URL', async () => {
  let observed;
  const client = new AgentPushKitClient({
    token: 'apt_test_secret',
    fetch: async (url, init) => {
      observed = { url: String(url), init };
      return new Response(JSON.stringify({ duplicate: false }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  await client.call('sendEventAsUser', {
    organizationId: 'aporg_1',
    service: 'chatdna',
    type: 'user.signup',
    title: 'New user',
    body: 'alex@example.com signed up',
  });
  assert.equal(observed.url, 'https://api.chatdna.co/agent-push-kit/v1/organizations/aporg_1/events');
  assert.equal(observed.init.headers.Authorization, 'Bearer apt_test_secret');
  assert.ok(!observed.url.includes('apt_test_secret'));
});
